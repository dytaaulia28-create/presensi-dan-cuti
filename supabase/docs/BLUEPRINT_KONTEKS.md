# Konteks Proyek (untuk template AI Blueprint)

Dokumen ini adalah isi bagian **[ISI IDE PROYEK ANDA DI SINI]** yang menjadi dasar
pembuatan aplikasi HRAttend.

## Nama Proyek
Sistem Informasi Absensi & Manajemen Cuti Karyawan (HR Attendance & Leave Management System)

## Deskripsi Umum
Aplikasi web mobile-first untuk mengelola absensi harian karyawan dan pengajuan cuti
secara digital, menggantikan proses manual (kertas, Excel, WhatsApp). Validasi kehadiran
memakai **bukti foto selfie wajib** dari kamera langsung (bukan upload galeri) yang
dikombinasikan dengan **batas waktu check-in server-side**. Ketentuan cuti mengikuti
UU No. 13 Tahun 2003 tentang Ketenagakerjaan.

## Peran Pengguna
- **Karyawan (employee):** check-in/out selfie, riwayat absensi, ajukan & pantau cuti, lihat saldo cuti.
- **HRD/Admin (admin):** kelola karyawan, approval cuti, verifikasi selfie, rekap & ekspor absensi, atur shift & kuota cuti, dashboard laporan.

## Tabel Database
profiles, work_shifts, attendances, leave_types, leave_balances, leave_requests, audit_logs.
(Lihat `supabase/schema.sql` untuk definisi lengkap + RLS + trigger + seed.)

## Validasi Kehadiran (tanpa GPS)
1. Selfie wajib real-time dari kamera depan, disimpan ke Supabase Storage.
2. Batas waktu check-in ketat & divalidasi server-side (anti manipulasi jam device).
3. Pencegahan titip absen: unique (employee_id, date) + audit_logs + bukti selfie.

## State Machine
- **Absensi:** belum check-in → hadir/terlambat → selesai; lewat batas = alpha; tanggal cuti disetujui = on_leave otomatis.
- **Cuti:** draft → pending → approved (saldo & absensi terisi otomatis) / rejected.

## Logika Bisnis Otomatis
Auto-set absensi dari cuti (trigger), penentuan status server-side, validasi eligibilitas
cuti (gender, masa kerja, saldo), kalkulasi hari kerja, dan audit trail.
