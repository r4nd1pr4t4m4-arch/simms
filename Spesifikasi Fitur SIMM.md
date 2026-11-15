# Spesifikasi Fitur Sistem Informasi Manajemen Sekolah/Madrasah (SIMS)

Dokumen ini memuat rincian lengkap modul, alur kerja operasional, hak akses pengguna, serta spesifikasi teknis untuk pengembangan aplikasi web **Sistem Informasi Manajemen Sekolah/Madrasah (SIMS)** berbasis **Next.js, Supabase, Cloudflare R2, dan Vercel**.

## 1. Arsitektur Peran & Hak Akses Dinamis (RBAC)

Sistem tidak memisahkan akun pengguna secara kaku berdasarkan jabatan, melainkan menerapkan konsep **Base Role + Dynamic Additional Roles (Tugas Tambahan)** yang terikat pada Tahun Ajaran aktif.

| Peran Dasar (*Base Role*) | Keterangan & Cakupan Hak Akses | 
| :--- | :--- | 
| **Super Admin / Operator** | Akses penuh ke seluruh master data, pengaturan tahun ajaran, manajemen CMS halaman publik, plotting jadwal & tugas tambahan, serta *override* seluruh data absensi maupun piket harian. | 
| **Guru (GTK)** | Akun standar pendidik untuk melihat jadwal mengajar, mengisi jurnal kelas, serta melakukan presensi kehadiran mandiri. Menu tambahan terbuka otomatis sesuai SK tugas tambahan yang aktif. | 
| **Siswa / Orang Tua** | Akses portal informasi pribadi untuk memantau rekap kehadiran, jadwal pelajaran & piket kelas, mutasi tabungan siswa, status administrasi komite, serta pengumuman resmi madrasah. | 
| **Calon Peserta Didik (PPDB)** | Akun sementara khusus pendaftar baru untuk mengisi formulir PPDB, mengunggah berkas persyaratan, memantau status verifikasi, dan melihat hasil seleksi. | 

### Daftar Tugas Tambahan Dinamis (*Additional Roles*)

Ketika Admin menetapkan tugas tambahan kepada seorang Guru pada tahun ajaran berjalan, sistem otomatis membuka modul terkait pada dashboard guru tersebut:

1. **Wali Kelas:** Akses rekap absensi harian kelas binaan, pengelolaan jadwal piket kebersihan siswa, pemantauan perkembangan siswa perwalian, dan cetak laporan kelas.
2. **Guru Piket:** Membuka akses **Dashboard Piket Harian** khusus pada hari tugasnya untuk memantau kehadiran guru, menginput izin guru berhalangan, dan menunjuk **Guru Pengganti (Inval)**.
3. **Panitia PPDB:** Membuka akses **Dashboard Seleksi PPDB** untuk memverifikasi berkas calon siswa, mencatat nilai tes seleksi/wawancara, serta memproses kelulusan pendaftar.
4. **Bendahara Komite:** Membuka modul pencatatan iuran komite/madrasah, verifikasi bukti pembayaran, dan laporan rekapitulasi keuangan komite.
5. **Pengelola Tabungan:** Membuka modul transaksi tabungan siswa (setor, tarik, cek mutasi, dan cetak buku tabungan digital).
6. **Guru Wali / BK:** Membuka modul bimbingan konseling, catatan pembinaan karakter, serta rekap poin prestasi dan pelanggaran siswa asuh.
7. **Pimpinan / Waka (Kurikulum & Kesiswaan):** Akses pemantauan laporan akademik, keterlaksanaan KBM, dan statistik kedisiplinan secara menyeluruh.

## 2. Rincian Modul & Fitur Utama

### A. Modul Master Data & Buku Induk Siswa Digital

* **Manajemen Tahun Ajaran & Semester:** Pengaturan periode akademik aktif, kurikulum yang berlaku, dan kalender hari efektif belajar.
* **Buku Induk Siswa Permanen:**
  * Pencatatan biodata lengkap siswa (NIS, NISN, NIK, tempat/tanggal lahir, alamat, data orang tua/wali, sekolah asal).
  * Riwayat penempatan Rombongan Belajar (Rombel) per tahun ajaran.
  * Pencatatan status siswa (`Aktif`, `Mutasi Masuk`, `Mutasi Keluar`, `Lulus / Alumni`).
  * Fitur kenaikan kelas massal (*batch promotion*) di akhir tahun ajaran.
  * Ekspor data buku induk ke format **Excel/PDF** standar pelaporan Dapodik/EMIS.
* **Arsip Dokumen Digital (Cloudflare R2):** Penyimpanan berkas scan Kartu Keluarga (KK), Akta Kelahiran, Ijazah sebelumnya, dan pas foto siswa secara aman.

### B. Modul PPDB Online Penuh (*End-to-End Admissions*)

Sistem penerimaan peserta didik baru yang terintegrasi langsung dengan penyimpanan dokumen Cloudflare R2 dan Buku Induk Siswa:

* **Manajemen Gelombang & Jalur Pendaftaran (Admin):**
  * Pengaturan periode pendaftaran (Gelombang I, Gelombang II, dst.), kuota daya tampung, dan syarat dokumen per jalur.
  * Dukungan multi-jalur seleksi: **Jalur Prestasi Tahfidz Al-Qur'an**, **Jalur Prestasi Akademik/KSM**, **Jalur Afirmasi/KIP**, dan **Jalur Reguler**.
* **Registrasi Mandiri & Pemberkasan Digital (Calon Siswa):**
  * Pembuatan akun pendaftaran mandiri berbasis **NISN/NIK** dengan nomor registrasi otomatis.
  * Pengisian formulir biodata calon siswa, data orang tua/wali, dan nilai rapor SD/MI asal.
  * Unggah berkas persyaratan digital (KK, Akta Kelahiran, Surat Keterangan Aktif/SKL, Sertifikat Tahfidz/Piagam Lomba) langsung ke **Cloudflare R2** melalui *Presigned URL*.
  * Cetak **Kartu Peserta Ujian / Bukti Pendaftaran (PDF)** secara mandiri.
* **Verifikasi Berkas & Penilaian Seleksi (Panitia PPDB):**
  * Dashboard antrean verifikasi dengan penampil pratinjau dokumen unggahan.
  * Manajemen status berkas (`Menunggu Verifikasi`, `Perlu Perbaikan / Revisi`, `Terverifikasi`).
  * Input skor hasil seleksi (Tes Baca Tulis Al-Qur'an/Tahfidz, Tes Potensi Akademik, dan Wawancara) dengan perhitungan peringkat otomatis berdasarkan bobot jalur.
* **Pengumuman Kelulusan & Daftar Ulang Online:**
  * Publikasi hasil seleksi secara serentak sesuai jadwal pengumuman (status: `Diterima`, `Cadangan`, `Tidak Diterima`) yang dapat dicek menggunakan nomor pendaftaran & NISN.
  * Alur konfirmasi daftar ulang daring dan unggah bukti daftar ulang.
* **Migrasi Otomatis ke Buku Induk Siswa (Integrasi Inti):**
  * Fitur **One-Click Migration** bagi Admin untuk memindahkan seluruh pendaftar yang berstatus *Diterima & Sudah Daftar Ulang* langsung ke dalam master **Buku Induk Siswa**.
  * Sistem secara otomatis menyalin biodata serta tautan dokumen R2 (KK, Akta, Pas Foto), menerbitkan **NIS resmi**, dan mengaktifkan akun portal siswa tanpa perlu input ulang data.

### C. Modul Penjadwalan & Logika Substitusi (Fitur Kunci)

* **Jadwal Pelajaran & Jadwal Mengajar Terintegrasi:**
  * Penyusunan jadwal pelajaran per kelas oleh Admin/Waka Kurikulum secara otomatis membentuk jadwal mengajar pribadi masing-masing guru.
  * Dilengkapi **Deteksi Bentrok (*Conflict Detection*)** agar satu guru tidak terjadwal di dua kelas berbeda pada jam yang sama.
* **Jadwal Piket Siswa:**
  * Pengaturan pembagian regu piket kebersihan dan ketertiban kelas (Senin–Sabtu) yang dikelola oleh Wali Kelas.
* **Jadwal Guru Piket Mingguan:**
  * Penetapan petugas guru piket reguler untuk setiap hari kerja dalam satu pekan.
* **Fitur Penunjukan Guru Pengganti (*Inval* Jam Mengajar):**
  * **Pelaku:** Dapat dilakukan oleh **Admin** atau **Guru Piket yang bertugas pada hari tersebut**.
  * **Alur Kerja:** Apabila guru pengampu asli berhalangan hadir (sakit/izin/dinas luar), petugas membuka daftar jam pelajaran yang kosong pada hari itu. Sistem secara otomatis merekomendasikan daftar guru lain yang **sedang tidak memiliki jam mengajar** pada jam tersebut.
  * **Dampak Sistem:** Jadwal hari itu tercatat sebagai *Digantikan oleh [Nama Guru Pengganti]*, dan guru pengganti mendapatkan akses untuk mengisi presensi siswa serta jurnal materi pada kelas tersebut.
* **Fitur Penunjukan Guru Piket Pengganti (*Daily Duty Override*):**
  * **Pelaku:** Khusus **Admin / Operator**.
  * **Alur Kerja:** Jika guru piket terjadwal berhalangan pada tanggal tertentu, Admin dapat menunjuk guru lain sebagai **Guru Piket Pengganti** khusus pada tanggal tersebut tanpa mengubah jadwal piket permanen mingguan. Hak akses dashboard piket otomatis berpindah ke guru pengganti pada tanggal tersebut.

### D. Modul Absensi Terpadu

* **Absensi Guru (GTK):**
  * Presensi kehadiran harian (datang dan pulang) mendukung validasi lokasi (GPS/Geofencing) atau pemindaian QR Code madrasah.
  * Pengajuan ketidakhadiran (`Izin`, `Sakit`, `Dinas Luar`) disertai unggah dokumen surat keterangan langsung ke Cloudflare R2.
* **Absensi Siswa:**
  * **Presensi Harian (Pagi):** Pencatatan kehadiran umum siswa (`Hadir`, `Sakit`, `Izin`, `Alpa`) oleh Wali Kelas atau Guru Piket.
  * **Presensi Per Mata Pelajaran & Jurnal Mengajar:** Diisi oleh guru pengampu (atau guru pengganti) di setiap jam pelajaran sekaligus mencatat ringkasan materi yang diajarkan.

### E. Modul CMS (Content Management System) Halaman Publik

Mengelola informasi publik madrasah secara dinamis dari dashboard Admin tanpa perlu mengubah kode program:

* **Beranda Terintegrasi Data Live:** Menampilkan ringkasan tahun ajaran aktif, status akreditasi, serta **Widget Info Piket Hari Ini** yang ditarik langsung dari jadwal piket & *override* harian SIMS.
* **Profil & Direktori GTK Otomatis:** Menampilkan identitas kelembagaan, visi-misi, serta daftar pendidik & tenaga kependidikan yang otomatis menampilkan lencana (*badge*) tugas tambahan aktif masing-masing guru.
* **Berita, Artikel & Pengumuman:** Manajemen publikasi konten lengkap dengan kategori, artikel sorotan utama (*featured*), unggah gambar sampul ke R2, dan fitur pencarian.
* **Layanan Publik Cepat:**
  * Akses langsung ke **Portal Pendaftaran & Cek Kelulusan PPDB Online**.
  * Verifikasi status keaktifan siswa berbasis pencarian **NISN**.
  * Informasi jadwal pelajaran, jadwal petugas piket publik, dan Kalender Akademik.

### F. Modul Keuangan & Kesejahteraan Siswa

* **Tabungan Siswa (Oleh *Pengelola Tabungan*):**
  * Pencatatan transaksi setoran dan penarikan tabungan siswa secara *real-time*.
  * Riwayat mutasi saldo per siswa dan cetak rekap buku tabungan.
* **Administrasi Komite (Oleh *Bendahara Komite*):**
  * Pencatatan pembayaran iuran komite/kegiatan madrasah per siswa.
  * Penerbitan tanda terima digital dan laporan rekapitulasi pemasukan bulanan/tahunan.

### G. Modul Bimbingan & Pendampingan Siswa

* **Catatan Guru Wali / BK:**
  * Dokumentasi bimbingan akademik maupun non-akademik per siswa asuh.
  * Pencatatan poin penghargaan prestasi dan catatan pembinaan kedisiplinan sebagai bahan komunikasi dengan orang tua/wali murid.

## 3. Ringkasan Arsitektur Teknologi

| Komponen | Teknologi | Peran dalam Sistem | 
| :--- | :--- | :--- | 
| **Frontend & Backend** | Next.js (App Router) + TypeScript | Antarmuka responsif, *Server-Side Rendering* (SSR) untuk halaman publik, dan *Server Actions* untuk mutasi data. | 
| **Styling & UI** | Tailwind CSS + shadcn/ui | Desain modern modular dengan sentuhan *glassmorphism* ringan dan komponen tabel/modal yang aksesibel. | 
| **Autentikasi** | Auth.js (NextAuth v5) | Mendukung login fleksibel menggunakan **NIP, NUPTK, NISN, atau Email** dengan sesi berbasis peran. | 
| **Database & ORM** | Supabase (PostgreSQL) + Prisma ORM | Penyimpanan data relasional terstruktur dengan *connection pooling* untuk lingkungan serverless. | 
| **Object Storage** | Cloudflare R2 (`@aws-sdk/client-s3`) | Penyimpanan file dokumen buku induk, berkas PPDB, surat izin guru, dan media CMS menggunakan *Presigned URL*. | 
| **Deployment** | Vercel | Hosting aplikasi web dengan *CI/CD* otomatis dan performa global yang cepat. | 