# Petunjuk Pengisian File Excel (`.xlsx`) Import Data Siswa (EMIS) & Guru (GTK)

Dokumen ini merupakan panduan resmi bagi Operator / Staf Tata Usaha (TU) dalam mengisi file template Microsoft Excel (`.xlsx`) untuk fitur **Import Massal Data Siswa (Buku Induk / EMIS)** dan **Import Massal Data Guru (GTK)** pada aplikasi **SIMS**.

---

## 1. Alur Singkat Unduh & Import File Excel (`.xlsx`)

1. Login ke aplikasi **SIMS** menggunakan akun **Super Admin** atau **Kepala/Staf TU**.
2. Klik tombol hijau **"Master & Import EMIS"** pada bilah navigasi atas.
3. Pilih **Tab 2: Import Massal Excel (`.xlsx`) — Siswa EMIS & Guru**.
4. Pilih jenis data yang ingin diimpor (**Import Buku Induk Siswa (EMIS)** atau **Import Data Guru / GTK**), lalu klik tombol **Unduh Template Excel (`.xlsx`)**.
5. Buka file `.xlsx` hasil unduhan di **Microsoft Excel**, isi baris data mulai dari **baris ke-2** (hapus atau timpa baris contoh), lalu tekan **Simpan (`Ctrl + S`)** tetap dalam format `.xlsx`.
6. Kembali ke aplikasi SIMS, klik area unggah file `.xlsx`, periksa tabel **Pratinjau Data Siap Impor**, lalu klik tombol **Proses Import Data ke Supabase**.

---

## 2. Aturan Umum Pengisian di Microsoft Excel (Wajib Diperhatikan)

- **Jangan Mengubah Baris Pertama (Baris 1 / Header)**:
  Baris ke-1 berisi kode nama kolom sistem (`nis`, `nisn`, `nik`, `name`, dll.). Jangan mengubah huruf besar/kecil, menambah spasi, atau menghapus kolom pada baris ke-1.
- **Format Angka Induk (NIS, NISN, NIK, NIP & No. HP)**:
  Sel pada template `.xlsx` sudah diformat sebagai **Text (`@`)** agar angka `0` di depan NISN (contoh: `0135566778`) dan nomor HP (`0812...`) tidak hilang, serta NIK 16 digit / NIP 18 digit tidak berubah menjadi notasi ilmiah (`1.98501E+17`).
  - *Tips*: Jika Anda melakukan *Copy-Paste* dari file Excel lain, gunakan **Paste Special → Values (`Tempel Nilai`)** agar format *Text* pada template tetap terjaga.
- **Mekanisme *Upsert* (Tambah Baru & Perbarui Otomatis)**:
  - Apabila `nisn` (untuk Siswa) atau `nip` (untuk Guru) **belum ada** di database, sistem otomatis menambahkan data baru sekaligus membuatkan **akun login portal**.
  - Apabila `nisn` atau `nip` **sudah ada** di database, sistem otomatis memperbarui (*update*) biodata tanpa menimbulkan duplikasi data.

---

## 3. Petunjuk Pengisian Template Data Siswa (`Template_Import_Siswa_EMIS_SIMS.xlsx`)

Berikut adalah rincian 13 kolom pada file **`Template_Import_Siswa_EMIS_SIMS.xlsx`**:

| Urutan Kolom | Nama Kolom (Baris 1) | Status | Keterangan & Aturan Pengisian | Contoh Isian yang Benar |
| :-: | :--- | :-: | :--- | :--- |
| **A** | `nis` | **Wajib** | Nomor Induk Siswa lokal madrasah (unik per siswa). | `262707101` |
| **B** | `nisn` | **Wajib** | Nomor Induk Siswa Nasional (10 digit). Digunakan juga sebagai **Username Login** akun Portal Siswa. | `0135566778` |
| **C** | `nik` | Opsional | Nomor Induk Kependudukan siswa sesuai Kartu Keluarga (16 digit). | `3204120101130001` |
| **D** | `name` | **Wajib** | Nama lengkap peserta didik sesuai Akta Kelahiran / Ijazah sebelumnya. | `Ahmad Zaki Mubarak` |
| **E** | `ttl` | Opsional | Tempat dan Tanggal Lahir siswa (format: `Kota, DD Bulan YYYY`). | `Bandung, 12 Maret 2013` |
| **F** | `gender` | Opsional | Jenis kelamin siswa. Isi dengan **`Laki-laki`** atau **`Perempuan`**. | `Laki-laki` |
| **G** | `rombel` | **Wajib** | Kode Rombongan Belajar (Kelas) aktif siswa saat ini. Gunakan format Romawi-Huruf (misal: `VII-A`, `VII-B`, `VIII-A`, `VIII-B`, `IX-A`, `IX-B`). | `VII-A` |
| **H** | `fatherName` | Opsional | Nama lengkap Ayah kandung / Wali siswa. | `H. Fauzan` |
| **I** | `motherName` | Opsional | Nama lengkap Ibu kandung siswa. | `Hj. Rahmah` |
| **J** | `parentPhone` | Opsional | Nomor WhatsApp / HP aktif orang tua/wali (tanpa spasi atau tanda hubung). | `081234567890` |
| **K** | `address` | Opsional | Alamat lengkap tempat tinggal siswa saat ini. | `Jl. Raya Cibiru No. 10, Kota Bandung` |
| **L** | `prevSchool` | Opsional | Nama sekolah asal (SD / MI) sebelum masuk madrasah. | `MI Al-Hidayah` |
| **M** | `waliKelas` | Opsional | Nama lengkap guru Wali Kelas dari rombel siswa tersebut. | `Fitriani Rahmawati, S.E.` |

### Contoh Tabel Pengisian Siswa di Excel:

| nis | nisn | nik | name | ttl | gender | rombel | fatherName | motherName | parentPhone | address | prevSchool | waliKelas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `262707101` | `0135566778` | `3204120101130001` | Ahmad Zaki Mubarak | Bandung, 12 Maret 2013 | Laki-laki | VII-A | H. Fauzan | Hj. Rahmah | `081234567890` | Jl. Raya Cibiru No. 10 | MI Al-Hidayah | Fitriani Rahmawati, S.E. |
| `262707102` | `0135566779` | `3204120202130002` | Siti Fatimah Azzahra | Bandung, 20 Juni 2013 | Perempuan | VII-A | Drs. Mahmud | Siti Aminah | `081298765432` | Komp. Griya Cempaka | SDN Cibiru 01 | Fitriani Rahmawati, S.E. |

> **Akun Login Siswa Otomatis:**
> Setiap siswa yang berhasil diimpor otomatis dapat login di **Portal Siswa (`/siswa`)** menggunakan:
> - **Identifier**: `nisn` (contoh: `0135566778`)
> - **Kata Sandi Awal**: `Simms2026!` *(dapat diubah sendiri oleh siswa setelah login)*

---

## 4. Petunjuk Pengisian Template Data Guru / GTK (`Template_Import_Guru_GTK_SIMS.xlsx`)

Berikut adalah rincian 5 kolom pada file **`Template_Import_Guru_GTK_SIMS.xlsx`**:

| Urutan Kolom | Nama Kolom (Baris 1) | Status | Keterangan & Aturan Pengisian | Contoh Isian yang Benar |
| :-: | :--- | :-: | :--- | :--- |
| **A** | `nip` | **Wajib** | NIP (18 digit), NUPTK (16 digit), atau Nomor Induk Yayasan/Pegawai unik. Digunakan juga sebagai **Username Login** Portal Guru. | `198501012010011001` |
| **B** | `name` | **Wajib** | Nama lengkap pendidik / tenaga kependidikan beserta gelar akademik. | `Ust. H. Lukmanul Hakim, M.Pd.` |
| **C** | `subject` | **Wajib** | Mata pelajaran utama yang diampu guru tersebut. | `Al-Qur'an Hadits` |
| **D** | `additionalRole` | Opsional | Nama **Tugas Tambahan Dinamis** (*Dynamic RBAC*) pada tahun ajaran aktif. Kosongkan jika guru tidak memiliki tugas tambahan. | `Wali Kelas` |
| **E** | `roleDetail` | Opsional | Keterangan spesifik untuk tugas tambahan pada kolom `additionalRole` (seperti nama kelas, hari piket, atau nomor SK). | `IX-B` |

### Daftar Nilai Resmi untuk Kolom `additionalRole` & `roleDetail`:

Agar sistem **Dynamic RBAC** otomatis membuka menu khusus pada dashboard guru yang bersangkutan, gunakan penulisan nama peran (`additionalRole`) dan rincian (`roleDetail`) sesuai tabel berikut:

| Isi Kolom `additionalRole` | Isi Kolom `roleDetail` yang Disarankan | Modul Tambahan yang Terbuka Otomatis di Dashboard Guru |
| :--- | :--- | :--- |
| `Wali Kelas` | Kode Rombel binaan (contoh: `VII-A`, `VIII-A`, `IX-B`) | Membuka **Panel Wali Kelas** (Presensi Pagi, Catatan Wali Kelas, & Jadwal Piket Kebersihan Siswa). |
| `Guru Piket` | Nama hari bertugas (contoh: `Senin`, `Selasa`, `Rabu`, `Kamis`, `Jumat`, `Sabtu`) | Membuka **Meja Kerja Guru Piket** (Pantauan Guru Izin/Sakit, Penunjukan Guru Inval, & Log Kejadian Siswa). |
| `Pengelola Tabungan` | Jabatan / Nomor SK (contoh: `Admin Tabungan Siswa` atau `SK-015/MTs/2026`) | Membuka **Modul Keuangan: Tabungan Siswa** (Setor, Tarik, Mutasi & Buku Tabungan Digital). |
| `Bendahara Komite` | Jabatan / Nomor SK (contoh: `SK-019/MTs/2026`) | Membuka **Modul Keuangan: Iuran Komite Madrasah** (Verifikasi Pembayaran & Cetak Kuitansi QR). |
| `Guru Wali/BK` | Jabatan / Nomor SK (contoh: `Koordinator BK`) | Membuka **Meja Kerja Guru Wali / BK** (Input Catatan Konseling, Poin Prestasi/Pelanggaran, & Balas Chat Orang Tua). |
| `Panitia PPDB` | Jabatan kepanitiaan (contoh: `Koordinator Verifikasi` atau `Pewawancara`) | Membuka **Modul Skor & Ranking Seleksi PPDB** (Input Nilai Tes BTQ/Tahfidz, TPA, Wawancara & Kelulusan). |
| `Waka Kurikulum` | Nomor SK (contoh: `SK-012/MTs/2026`) | Membuka **Modul Penyusunan Jadwal Pelajaran Anti-Bentrok (*Conflict Detection*)**. |
| `Waka Kesiswaan` | Nomor SK (contoh: `SK-013/MTs/2026`) | Akses pemantauan kedisiplinan, poin prestasi, dan kegiatan kesiswaan. |
| *(Kosongkan)* | *(Kosongkan)* | Guru Mata Pelajaran murni (hanya menampilkan Beranda Presensi GPS, Jadwal Mengajar & Isi Jurnal Kelas). |

> **Catatan**: Jika seorang guru memiliki **lebih dari satu** tugas tambahan (misalnya menjadi *Wali Kelas VIII-A* sekaligus *Guru Piket Hari Sabtu*), Anda dapat:
> 1. Mencantumkan keduanya dengan membuat 2 baris dengan `nip` yang sama pada file Excel (baris ke-1 dengan `additionalRole = Wali Kelas`, baris ke-2 dengan `additionalRole = Guru Piket`), **atau**
> 2. Menambahkan tugas tambahan kedua kapan saja melalui menu **Manajemen Guru & Tugas Tambahan** di Dashboard Super Admin (`/admin`).

> **Akun Login Guru (GTK) Otomatis:**
> Setiap guru yang berhasil diimpor otomatis dapat login di **Portal Guru (`/gtk`)** menggunakan:
> - **Identifier**: `nip` (contoh: `198501012010011001`)
> - **Kata Sandi Awal**: `Simms2026!` *(dapat diubah sendiri melalui tombol **Sandi** di bilah atas setelah login)*
