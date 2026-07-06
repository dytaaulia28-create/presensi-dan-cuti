-- =============================================================================
-- HRAttend — Sistem Absensi & Manajemen Cuti Karyawan
-- Skema Database PostgreSQL untuk Supabase
-- Ketentuan cuti mengacu pada UU No. 13 Tahun 2003 tentang Ketenagakerjaan
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------
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
-- TABLE: profiles (ekstensi dari auth.users)
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

-- -----------------------------------------------------------------------------
-- TABLE: work_shifts
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TABLE: attendances
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TABLE: leave_types
-- -----------------------------------------------------------------------------
create table if not exists public.leave_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text unique not null,
  quota_days int,                       -- null = tidak terbatas
  requires_document boolean not null default false,
  gender_restriction gender_type,       -- null = semua gender
  min_work_months int not null default 0,
  max_usage_per_employment int,         -- null = tidak terbatas
  description text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- TABLE: leave_balances
-- -----------------------------------------------------------------------------
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

-- Kolom sisa cuti (generated)
alter table public.leave_balances drop column if exists remaining_days;
alter table public.leave_balances add column remaining_days int generated always as (total_days - used_days) stored;

-- -----------------------------------------------------------------------------
-- TABLE: leave_requests
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TABLE: audit_logs
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Cek apakah user yang sedang login adalah admin (dipakai di policy RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Buat profile otomatis saat user baru mendaftar via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- Saat cuti disetujui: kurangi saldo & isi status absensi 'on_leave' otomatis
create or replace function public.handle_leave_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d date;
  v_status attendance_status;
  v_code text;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select code into v_code from public.leave_types where id = new.leave_type_id;
    v_status := case when v_code = 'sick' then 'sick' else 'on_leave' end;

    -- Kurangi saldo cuti (hanya jika jenis cuti berkuota)
    update public.leave_balances
      set used_days = used_days + new.total_days
      where employee_id = new.employee_id
        and leave_type_id = new.leave_type_id
        and year = extract(year from new.start_date);

    -- Isi status absensi untuk setiap tanggal dalam rentang cuti
    d := new.start_date;
    while d <= new.end_date loop
      -- Lewati akhir pekan
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

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- =============================================================================
alter table public.profiles       enable row level security;
alter table public.work_shifts    enable row level security;
alter table public.attendances    enable row level security;
alter table public.leave_types    enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.audit_logs     enable row level security;

-- ---- profiles ----
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
  for insert with check (public.is_admin() or id = auth.uid());

-- ---- work_shifts ----
drop policy if exists "shifts_select_all" on public.work_shifts;
create policy "shifts_select_all" on public.work_shifts
  for select using (auth.uid() is not null);

drop policy if exists "shifts_write_admin" on public.work_shifts;
create policy "shifts_write_admin" on public.work_shifts
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- attendances ----
drop policy if exists "att_select_self_or_admin" on public.attendances;
create policy "att_select_self_or_admin" on public.attendances
  for select using (employee_id = auth.uid() or public.is_admin());

drop policy if exists "att_insert_self" on public.attendances;
create policy "att_insert_self" on public.attendances
  for insert with check (employee_id = auth.uid() or public.is_admin());

drop policy if exists "att_update_self_or_admin" on public.attendances;
create policy "att_update_self_or_admin" on public.attendances
  for update using (employee_id = auth.uid() or public.is_admin());

-- ---- leave_types ----
drop policy if exists "ltypes_select_all" on public.leave_types;
create policy "ltypes_select_all" on public.leave_types
  for select using (auth.uid() is not null);

drop policy if exists "ltypes_write_admin" on public.leave_types;
create policy "ltypes_write_admin" on public.leave_types
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- leave_balances ----
drop policy if exists "lbal_select_self_or_admin" on public.leave_balances;
create policy "lbal_select_self_or_admin" on public.leave_balances
  for select using (employee_id = auth.uid() or public.is_admin());

drop policy if exists "lbal_write_admin" on public.leave_balances;
create policy "lbal_write_admin" on public.leave_balances
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- leave_requests ----
drop policy if exists "lreq_select_self_or_admin" on public.leave_requests;
create policy "lreq_select_self_or_admin" on public.leave_requests
  for select using (employee_id = auth.uid() or public.is_admin());

drop policy if exists "lreq_insert_self" on public.leave_requests;
create policy "lreq_insert_self" on public.leave_requests
  for insert with check (employee_id = auth.uid());

drop policy if exists "lreq_update_admin" on public.leave_requests;
create policy "lreq_update_admin" on public.leave_requests
  for update using (public.is_admin()) with check (public.is_admin());

-- ---- audit_logs ----
drop policy if exists "audit_select_admin" on public.audit_logs;
create policy "audit_select_admin" on public.audit_logs
  for select using (public.is_admin());

drop policy if exists "audit_insert_auth" on public.audit_logs;
create policy "audit_insert_auth" on public.audit_logs
  for insert with check (auth.uid() is not null);
