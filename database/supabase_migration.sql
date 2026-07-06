-- =============================================================================
-- HRAttend — Supabase Full Setup Migration Script
-- Jalankan file ini secara utuh di Supabase SQL Editor untuk inisialisasi awal.
-- =============================================================================

-- =============================================================================
-- Bagian 1: SCHEMA (Tabel, Fungsi, Trigger, & RLS)
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUM TYPES
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('employee', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type attendance_status as enum ('present', 'late', 'absent', 'on_leave', 'sick');
  end if;
  if not exists (select 1 from pg_type where typname = 'leave_status') then
    create type leave_status as enum ('pending', 'approved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'gender_type') then
    create type gender_type as enum ('male', 'female');
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- TABLES
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  nik text unique not null,
  division text,
  position text,
  gender gender_type not null default 'male',
  joined_at date not null default current_date,
  role user_role not null default 'employee',
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.work_shifts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  check_in_start time not null default '06:00',
  late_threshold time not null default '08:00',
  check_in_deadline time not null default '09:00',
  check_out_time time not null default '17:00',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.attendances (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  date date not null default current_date,
  check_in_time timestamptz,
  check_in_photo_url text,
  check_out_time timestamptz,
  check_out_photo_url text,
  status attendance_status not null default 'absent',
  shift_id uuid references public.work_shifts (id),
  notes text,
  created_at timestamptz not null default now(),
  unique (employee_id, date)
);

create table if not exists public.leave_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text unique not null,
  quota_days int,
  requires_document boolean not null default false,
  gender_restriction gender_type,
  min_work_months int not null default 0,
  max_usage_per_employment int,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.leave_balances (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  leave_type_id uuid not null references public.leave_types (id) on delete cascade,
  year int not null default extract(year from current_date),
  total_days int not null default 0,
  used_days int not null default 0,
  created_at timestamptz not null default now(),
  unique (employee_id, leave_type_id, year)
);

alter table public.leave_balances drop column if exists remaining_days;
alter table public.leave_balances add column remaining_days int generated always as (total_days - used_days) stored;

create table if not exists public.leave_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  leave_type_id uuid not null references public.leave_types (id),
  start_date date not null,
  end_date date not null,
  total_days int not null default 0,
  reason text,
  document_url text,
  status leave_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- FUNCTIONS & TRIGGERS
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, nik, gender, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Karyawan Baru'),
    coalesce(new.raw_user_meta_data ->> 'nik', 'NIK-' || substr(new.id::text, 1, 8)),
    coalesce((new.raw_user_meta_data ->> 'gender')::gender_type, 'male'),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'employee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_leave_approval()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  d date;
  v_status attendance_status;
  v_code text;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select code into v_code from public.leave_types where id = new.leave_type_id;
    v_status := case when v_code = 'sick' then 'sick' else 'on_leave' end;

    update public.leave_balances
      set used_days = used_days + new.total_days
      where employee_id = new.employee_id
        and leave_type_id = new.leave_type_id
        and year = extract(year from new.start_date);

    d := new.start_date;
    while d <= new.end_date loop
      if extract(isodow from d) < 6 then
        insert into public.attendances (employee_id, date, status, notes)
        values (new.employee_id, d, v_status, 'Otomatis dari pengajuan cuti #' || left(new.id::text, 8))
        on conflict (employee_id, date)
          do update set status = excluded.status;
      end if;
      d := d + 1;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists on_leave_status_change on public.leave_requests;
create trigger on_leave_status_change
  after update on public.leave_requests
  for each row execute function public.handle_leave_approval();

-- -----------------------------------------------------------------------------
-- RLS POLICIES
-- -----------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.work_shifts    enable row level security;
alter table public.attendances    enable row level security;
alter table public.leave_types    enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.audit_logs     enable row level security;

-- ---- profiles ----
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles for update using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles for insert with check (public.is_admin() or id = auth.uid());

-- ---- work_shifts ----
drop policy if exists "shifts_select_all" on public.work_shifts;
create policy "shifts_select_all" on public.work_shifts for select using (auth.uid() is not null);

drop policy if exists "shifts_write_admin" on public.work_shifts;
create policy "shifts_write_admin" on public.work_shifts for all using (public.is_admin()) with check (public.is_admin());

-- ---- attendances ----
drop policy if exists "att_select_self_or_admin" on public.attendances;
create policy "att_select_self_or_admin" on public.attendances for select using (employee_id = auth.uid() or public.is_admin());

drop policy if exists "att_insert_self" on public.attendances;
create policy "att_insert_self" on public.attendances for insert with check (employee_id = auth.uid() or public.is_admin());

drop policy if exists "att_update_self_or_admin" on public.attendances;
create policy "att_update_self_or_admin" on public.attendances for update using (employee_id = auth.uid() or public.is_admin());

-- ---- leave_types ----
drop policy if exists "ltypes_select_all" on public.leave_types;
create policy "ltypes_select_all" on public.leave_types for select using (auth.uid() is not null);

drop policy if exists "ltypes_write_admin" on public.leave_types;
create policy "ltypes_write_admin" on public.leave_types for all using (public.is_admin()) with check (public.is_admin());

-- ---- leave_balances ----
drop policy if exists "lbal_select_self_or_admin" on public.leave_balances;
create policy "lbal_select_self_or_admin" on public.leave_balances for select using (employee_id = auth.uid() or public.is_admin());

drop policy if exists "lbal_write_admin" on public.leave_balances;
create policy "lbal_write_admin" on public.leave_balances for all using (public.is_admin()) with check (public.is_admin());

-- ---- leave_requests ----
drop policy if exists "lreq_select_self_or_admin" on public.leave_requests;
create policy "lreq_select_self_or_admin" on public.leave_requests for select using (employee_id = auth.uid() or public.is_admin());

drop policy if exists "lreq_insert_self" on public.leave_requests;
create policy "lreq_insert_self" on public.leave_requests for insert with check (employee_id = auth.uid());

drop policy if exists "lreq_update_admin" on public.leave_requests;
create policy "lreq_update_admin" on public.leave_requests for update using (public.is_admin()) with check (public.is_admin());

-- ---- audit_logs ----
drop policy if exists "audit_select_admin" on public.audit_logs;
create policy "audit_select_admin" on public.audit_logs for select using (public.is_admin());

drop policy if exists "audit_insert_auth" on public.audit_logs;
create policy "audit_insert_auth" on public.audit_logs for insert with check (auth.uid() is not null);



-- =============================================================================
-- Bagian 2: SEED (Data Sistem & Data User Bawaan)
-- =============================================================================

insert into public.work_shifts (name, check_in_start, late_threshold, check_in_deadline, check_out_time, is_default)
select 'Shift Reguler', '06:00', '08:00', '09:00', '17:00', true
where not exists (select 1 from public.work_shifts where is_default = true);

insert into public.leave_types (name, code, quota_days, requires_document, gender_restriction, min_work_months, max_usage_per_employment, description)
values
  ('Cuti Tahunan',      'annual',       12,   false, null,     12, null, 'Hak cuti tahunan minimal 12 hari kerja setelah bekerja 12 bulan berturut-turut.'),
  ('Cuti Sakit',        'sick',         null, true,  null,     0,  null, 'Cuti sakit dengan surat keterangan dokter. Upah dibayar berjenjang.'),
  ('Cuti Melahirkan',   'maternity',    90,   true,  'female', 0,  null, '1,5 bulan sebelum dan 1,5 bulan sesudah melahirkan.'),
  ('Cuti Keguguran',    'miscarriage',  45,   true,  'female', 0,  null, '1,5 bulan atau sesuai surat keterangan dokter.'),
  ('Cuti Pernikahan',   'marriage',     3,    false, null,     0,  null, 'Cuti menikah 3 hari (Pasal 93 UU 13/2003).'),
  ('Cuti Duka Keluarga','family_death', 2,    false, null,     0,  null, 'Keluarga inti meninggal / istri melahirkan (2 hari).'),
  ('Cuti Haji/Umroh',   'hajj',         40,   false, null,     0,  1,    'Menjalankan ibadah wajib, minimal 1 kali selama bekerja.')
on conflict (code) do nothing;

do $$
declare
  v_instance_id uuid;
  v_dudul_id uuid := 'eebd9c4e-d5fe-4043-855a-b8764568b987';
  v_mimi_id uuid  := 'fda3e3f6-e269-4baa-bef7-49610410eb53';
  v_sumbul_id uuid := '5cd0c28d-dfff-4ae1-abbd-7f69ae77b668';
begin
  select instance_id into v_instance_id from auth.users limit 1;
  if v_instance_id is null then
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  end if;

  delete from public.profiles where nik in ('K0001', 'H0001', 'A0001');
  delete from auth.users where email in ('dudul@gmail.com', 'mimi@gmail.com', 'sumbul@gmail.com');

  -- Dudul (Karyawan)
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token, reconfirmation_token, phone)
  values (v_dudul_id, v_instance_id, 'dudul@gmail.com', crypt('123456', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Dudul","nik":"K0001","gender":"male","role":"employee"}', false, now(), now(), '', '', '', '', '', '', '');

  -- Mimi (HRD)
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token, reconfirmation_token, phone)
  values (v_mimi_id, v_instance_id, 'mimi@gmail.com', crypt('123456', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Mimi","nik":"H0001","gender":"female","role":"admin"}', false, now(), now(), '', '', '', '', '', '', '');

  -- Sumbul (Admin)
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token, reconfirmation_token, phone)
  values (v_sumbul_id, v_instance_id, 'sumbul@gmail.com', crypt('123456', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Sumbul","nik":"A0001","gender":"male","role":"admin"}', false, now(), now(), '', '', '', '', '', '', '');

  -- Sync profiles
  insert into public.profiles (id, full_name, nik, gender, role)
  values 
    (v_dudul_id, 'Dudul', 'K0001', 'male', 'employee'),
    (v_mimi_id, 'Mimi', 'H0001', 'female', 'admin'),
    (v_sumbul_id, 'Sumbul', 'A0001', 'male', 'admin')
  on conflict (id) do update set
    full_name = excluded.full_name,
    nik = excluded.nik,
    gender = excluded.gender,
    role = excluded.role;

  -- Saldo cuti Dudul
  insert into public.leave_balances (employee_id, leave_type_id, year, total_days)
  select v_dudul_id, id, extract(year from current_date), quota_days
  from public.leave_types
  where code = 'annual'
  on conflict do nothing;

end $$;
