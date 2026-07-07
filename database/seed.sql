-- =============================================================================
-- SEED DATA & SYSTEM CONFIGURATION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEED: work_shifts (Jadwal Kerja Default)
-- -----------------------------------------------------------------------------
insert into public.work_shifts (name, check_in_start, late_threshold, check_in_deadline, check_out_time, is_default)
select 'Shift Reguler', '06:00', '08:00', '09:00', '17:00', true
where not exists (select 1 from public.work_shifts where is_default = true);

-- -----------------------------------------------------------------------------
-- 2. SEED: leave_types (Jenis Cuti UU No. 13 Tahun 2003)
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- 3. SEED: Users & Profiles (Dudul, Mimi, Sumbul)
-- -----------------------------------------------------------------------------
do $$
declare
  v_instance_id uuid;
  v_dudul_id uuid := 'eebd9c4e-d5fe-4043-855a-b8764568b987';
  v_mimi_id uuid  := 'fda3e3f6-e269-4baa-bef7-49610410eb53';
  v_sumbul_id uuid := '5cd0c28d-dfff-4ae1-abbd-7f69ae77b668';
begin
  -- Ambil instance_id yang valid dari database auth
  select instance_id into v_instance_id from auth.users limit 1;
  if v_instance_id is null then
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  end if;

  -- Bersihkan profile & user jika ada sebelumnya untuk NIK/email yang sama
  delete from public.profiles where nik in ('K0001', 'H0001', 'A0001');
  delete from auth.users where email in ('dudul@gmail.com', 'mimi@gmail.com', 'sumbul@gmail.com');

  -- A. KARYAWAN: Dudul
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token, reconfirmation_token, phone)
  values (
    v_dudul_id,
    v_instance_id,
    'dudul@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dudul","nik":"K0001","gender":"male","role":"employee"}',
    false,
    now(),
    now(),
    '', '', '', '', '', '', ''
  );

  -- B. HRD: Mimi
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token, reconfirmation_token, phone)
  values (
    v_mimi_id,
    v_instance_id,
    'mimi@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Mimi","nik":"H0001","gender":"female","role":"hrd"}',
    false,
    now(),
    now(),
    '', '', '', '', '', '', ''
  );

  -- C. ADMIN: Sumbul
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token, reconfirmation_token, phone)
  values (
    v_sumbul_id,
    v_instance_id,
    'sumbul@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sumbul","nik":"A0001","gender":"male","role":"admin"}',
    false,
    now(),
    now(),
    '', '', '', '', '', '', ''
  );

  -- D. Hubungkan dan pastikan profiles terbuat dengan data yang tepat (jika trigger belum/tidak jalan)
  insert into public.profiles (id, full_name, nik, gender, role, joined_at)
  values 
    (v_dudul_id, 'Dudul', 'K0001', 'male', 'employee', current_date - interval '1 year'),
    (v_mimi_id, 'Mimi', 'H0001', 'female', 'hrd', current_date),
    (v_sumbul_id, 'Sumbul', 'A0001', 'male', 'admin', current_date)
  on conflict (id) do update set
    full_name = excluded.full_name,
    nik = excluded.nik,
    gender = excluded.gender,
    role = excluded.role,
    joined_at = excluded.joined_at;

  -- E. Alokasikan saldo cuti tahunan awal untuk Dudul (Karyawan)
  insert into public.leave_balances (employee_id, leave_type_id, year, total_days)
  select v_dudul_id, id, extract(year from current_date), quota_days
  from public.leave_types
  where code = 'annual'
  on conflict do nothing;

end $$;
