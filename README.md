# HRAttend — Sistem Absensi & Manajemen Cuti Karyawan

Aplikasi web **mobile-first** untuk absensi harian karyawan (dengan **bukti selfie**) dan pengajuan cuti digital dengan alur approval. Ketentuan cuti mengikuti **UU No. 13 Tahun 2003 tentang Ketenagakerjaan**.

> Dibangun dengan **Vue 3 + TypeScript + Ionic Vue + Vite** di frontend dan **Supabase** (PostgreSQL, Auth, Storage, Row-Level Security) di backend. Visualisasi memakai **Chart.js**.

---

## ✨ Fitur Utama

### Karyawan
- Login aman (Supabase Auth)
- **Check-in / check-out dengan selfie wajib** (kamera live, bukan upload galeri)
- Validasi waktu **server-side** (tepat waktu / terlambat / ditutup)
- Riwayat absensi bulanan + thumbnail selfie
- Pengajuan cuti (7 jenis sesuai UU) dengan validasi kuota & eligibilitas otomatis
- Lihat saldo & status pengajuan cuti

### HRD / Admin
- Dashboard ringkasan kehadiran + grafik tren
- Manajemen karyawan (aktif/nonaktif)
- Monitor absensi harian + verifikasi selfie + ekspor CSV
- Approval / penolakan cuti (saldo & absensi terisi otomatis saat disetujui)
- Laporan grafik (pie, bar, tren)
- Pengaturan shift/jam kerja

---

## 🚀 Cara Menjalankan

### 1. Prasyarat
- Node.js 18+ dan npm
- Akun & project [Supabase](https://supabase.com) (gratis)

### 2. Instalasi
```bash
npm install
```

### 3. Konfigurasi Supabase
1. Buat project baru di Supabase.
2. Buka **SQL Editor**, jalankan seluruh isi `supabase/schema.sql`.
3. Buka **Storage**, buat bucket **`attendance-photos`** dan set menjadi **Public**.
4. Salin `.env.example` menjadi `.env` lalu isi:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
   (ambil dari Settings → API di dashboard Supabase)

### 4. Membuat akun admin pertama
1. Di Supabase **Authentication → Users → Add user**, buat user (mis. `admin@perusahaan.com`).
2. Di **SQL Editor** jalankan (ganti email sesuai user tadi):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'admin@perusahaan.com');
   ```
3. Untuk karyawan, buat user lalu (opsional) alokasikan saldo cuti tahunan:
   ```sql
   insert into public.leave_balances (employee_id, leave_type_id, year, total_days)
   select p.id, lt.id, extract(year from current_date), lt.quota_days
   from public.profiles p
   cross join public.leave_types lt
   where lt.code = 'annual' and p.role = 'employee'
   on conflict do nothing;
   ```

### 5. Jalankan
```bash
npm run dev
```
Buka `http://localhost:5173`. Di desktop, aplikasi tampil dalam **bingkai simulator ponsel**; di HP tampil **full-screen**.

> ⚠️ Kamera selfie hanya berjalan pada **HTTPS** atau **localhost**. Saat deploy, gunakan domain ber-SSL.

---

## 🗂 Struktur Proyek
```
hr-attend/
├─ supabase/schema.sql        # Skema DB + RLS + trigger + seed (UU 13/2003)
├─ src/
│  ├─ lib/                    # supabase client, audit, util tanggal, status
│  ├─ stores/auth.ts          # state autentikasi & profil
│  ├─ composables/            # logika absensi, cuti, admin, kamera
│  ├─ components/             # BarChart, PieChart
│  ├─ views/employee/         # dashboard, check-in, riwayat, cuti, profil
│  ├─ views/admin/            # dashboard, karyawan, monitor, approval, laporan, pengaturan
│  ├─ router/                 # proteksi rute per role
│  └─ theme/                  # variabel warna + mobile shell CSS
└─ ...
```

---

## ⚖️ Ketentuan Cuti (UU No. 13/2003) yang sudah tertanam
| Jenis | Kuota | Dokumen | Catatan |
|-------|-------|---------|---------|
| Cuti Tahunan | 12 hari | – | Setelah 12 bulan kerja |
| Cuti Sakit | tanpa batas | Surat dokter | Upah berjenjang |
| Cuti Melahirkan | 90 hari | Surat dokter | Khusus perempuan |
| Cuti Keguguran | 45 hari | Surat dokter | Khusus perempuan |
| Cuti Pernikahan | 3 hari | – | Pasal 93 |
| Cuti Duka Keluarga | 2 hari | – | Pasal 93 |
| Cuti Haji/Umroh | – | – | 1x selama bekerja |

---

## 🔐 Keamanan
- **Row-Level Security** aktif di semua tabel — karyawan hanya melihat datanya sendiri.
- Waktu check-in divalidasi **server-side** (mencegah manipulasi jam perangkat).
- Selfie wajib dari kamera langsung sebagai bukti anti titip-absen.
- Semua aksi penting tercatat di **audit_logs**.
