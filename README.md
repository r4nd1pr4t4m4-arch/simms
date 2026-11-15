# SIMS — Sistem Informasi Manajemen Sekolah / Madrasah Terpadu

Aplikasi web **Sistem Informasi Manajemen Sekolah/Madrasah (SIMS)** berbasis **Next.js (App Router + TypeScript), Supabase PostgreSQL, Prisma ORM, Cloudflare R2 Object Storage, dan Vercel**.

---

## 1. Daftar Rute Portal & Modul

| Rute URL | Portal / Peran | Cakupan Fitur Utama |
| :--- | :--- | :--- |
| `/` | **Halaman Publik & CMS** | Landing page, Widget Live Guru Piket Hari Ini, Direktori GTK & Tugas Tambahan Dinamis, Berita/Pengumuman CMS, Layanan Cek NISN, & Portal Login Multi-Peran. |
| `/ppdb` | **Portal PPDB Online** | Statistik Kuota Live per Jalur (Reguler, Prestasi Tahfidz/KSM, Afirmasi/KIP), Wizard Pendaftaran 4 Langkah + Unggah Berkas ke Cloudflare R2, Cek Status & Revisi Berkas, Cetak Bukti Daftar & SKL Berstempel QR. |
| `/admin` | **Super Admin / Operator** | KPI Operasional & Grafik Mingguan, Manajemen GTK & Plotting Tugas Tambahan (*Dynamic RBAC*), Penunjukan Guru Inval & *Override* Piket Harian, Master Jadwal Anti-Bentrok, Buku Induk Siswa, Verifikasi & *One-Click Migration* PPDB, CMS Publik, serta Pusat Konfigurasi Go-Live. |
| `/tu` | **Dashboard Tata Usaha (TU)** | Mode Kepala TU (Otorisasi TTE) & Staf Layanan, Antrean Prioritas, Buku Induk & Kelengkapan Arsip R2 (4/4), Persuratan & Persetujuan Koreksi Data *Side-by-Side*, Agenda Surat Masuk/Keluar R2, Cetak SK GTK, serta Audit Residu EMIS Kemenag. |
| `/gtk` | **Dashboard Guru & GTK** | Menu dinamis sesuai SK Tugas Tambahan, Presensi Mandiri GPS Geofencing & Izin R2, Jadwal Mengajar & Isi Jurnal Kelas (+ Kelas Inval), Meja Kerja Guru Piket, Panel Wali Kelas, Modul Tabungan & Komite, serta Meja Kerja Guru Wali/BK. |
| `/siswa` | **Portal Siswa** | Jadwal Pelajaran Hari Ini (lengkap dengan materi jurnal & indikator Guru Inval), Jadwal Regu Piket, Rekap Absensi & Pengajuan Izin R2, Buku Tabungan Digital, Grid 12 Bulan Komite + Cetak Kuitansi QR, Buku Induk & Koreksi Data, serta Catatan BK & Prestasi. |
| `/ortu` | **Portal Orang Tua / Wali** | **Multi-Child Switcher** (pantau >1 anak dalam 1 akun), Linimasa Aktivitas Anak Real-Time, Ajukan Surat Izin Resmi Ortu ke R2, Permohonan Penarikan Tabungan, Konfirmasi Transfer Komite R2 + Cetak Kuitansi QR, serta *Direct Chat* Wali Kelas & Guru BK. |

---

## 2. Daftar Akun Login Awal (Default Seed)

Kata sandi awal seluruh akun sebelum diubah melalui menu **Ubah Sandi**: **`Simms2026!`**

| Peran (*Base Role*) | Identifier Login (NIP / NISN / Email) | Nama Pengguna & Hak Akses | Rute Tujuan |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin.operator@mtsnurulfalah.sch.id` | H. Lukman Hakim, S.Kom. (Akses Penuh Seluruh Modul) | `/admin` |
| **Kepala TU** | `198204152009011008` | Bapak Ridwan Kamil, S.AP. (Otorisasi Penuh & TTE) | `/tu` |
| **Staf TU** | `199408122020122014` | Ibu Nurul Hidayah, A.Md. (Staf Layanan & Arsip R2) | `/tu` |
| **Guru (GTK)** | `198805122015031002` | Ust. Ahmad Fauzi, S.Pd. (Wali Kelas VIII-A + Guru Piket) | `/gtk` |
| **Guru (GTK)** | `199201182019031007` | M. Iqbal Maulana, S.Pd. (Pengelola Tabungan + Piket) | `/gtk` |
| **Guru (GTK)** | `199006142015032006` | Fitriani Rahmawati, S.E. (Bendahara Komite + Wali Kelas) | `/gtk` |
| **Guru (GTK)** | `199104172018012002` | Dewi Sartika Putri, S.Psi. (Koordinator BK + Panitia PPDB) | `/gtk` |
| **Siswa** | `0123456789` | Muhammad Rizky Pratama (Kelas VIII-A) | `/siswa` |
| **Orang Tua / Wali** | `ortu.hendra@gmail.com` | Bapak Hendra Kusuma, S.T. (Multi-Anak: Kelas VIII-A & VII-B) | `/ortu` |

---

## 3. Panduan Operasional Go-Live di Madrasah

1. **Login sebagai Super Admin** di halaman utama (`/`) menggunakan akun `admin.operator@mtsnurulfalah.sch.id`.
2. Klik tombol hijau **"Master & Import EMIS"** di bilah atas:
   - **Tab 1 (Identitas & Kop Madrasah)**: Ubah Nama Madrasah, NSM, NPSN, Akreditasi, Tahun Ajaran, Nama & NIP Kepala Madrasah, Alamat, Koordinat GPS Geofencing, dan Info Rekening Komite, lalu klik **Simpan**.
   - **Tab 3 (Bersihkan Data Dummy)**: Ketik `SIAP-GOLIVE` untuk membersihkan data siswa/pendaftar/transaksi contoh sebelum mengimpor data riil.
   - **Tab 2 (Import Massal CSV)**: Unduh template CSV Siswa EMIS & Guru GTK, isi dengan data madrasah Anda di Excel (simpan sebagai `.csv`), lalu unggah untuk membuat seluruh data Buku Induk dan akun login secara otomatis.
3. Klik tombol **"Sandi"** di bilah atas untuk mengganti kata sandi default akun Super Admin Anda.

---

## 4. Menjalankan di Lokal

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```
