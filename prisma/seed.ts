import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding database SIMS MTs Nurul Falah ke Supabase...");

  const rawSeedPassword = process.env.SEED_INITIAL_PASSWORD || "Simms2026!";
  if (!process.env.SEED_INITIAL_PASSWORD) {
    console.warn(
      "⚠️  PERINGATAN KEAMANAN: SEED_INITIAL_PASSWORD tidak diatur di .env. Menggunakan sandi pengembangan lokal. Segera ubah kata sandi seluruh akun sebelum Go-Live!"
    );
  }
  const defaultPassword = await bcrypt.hash(rawSeedPassword, 12);

  // 1. Tahun Ajaran Aktif
  await prisma.academicYear.deleteMany();
  await prisma.academicYear.create({
    data: {
      name: "2026/2027",
      semester: "Ganjil",
      curriculum: "Kurikulum Merdeka & KMA 450",
      isActive: true,
    },
  });

  // 2. Super Admin & Staf TU
  await prisma.user.upsert({
    where: { identifier: "admin.operator@mtsnurulfalah.sch.id" },
    update: {},
    create: {
      identifier: "admin.operator@mtsnurulfalah.sch.id",
      email: "admin.operator@mtsnurulfalah.sch.id",
      name: "H. Lukman Hakim, S.Kom.",
      passwordHash: defaultPassword,
      baseRole: "ADMIN",
      avatarInitials: "LH",
    },
  });

  const tuHeadUser = await prisma.user.upsert({
    where: { identifier: "198204152009011008" },
    update: {},
    create: {
      identifier: "198204152009011008",
      name: "Bapak Ridwan Kamil, S.AP.",
      passwordHash: defaultPassword,
      baseRole: "TU",
      avatarInitials: "RK",
    },
  });

  await prisma.tuStaffProfile.upsert({
    where: { userId: tuHeadUser.id },
    update: {},
    create: {
      userId: tuHeadUser.id,
      nip: "198204152009011008",
      position: "Kepala Tata Usaha",
      badge: "AKSES PENUH",
      roleScope: "Mode Kepala Tata Usaha (TTE & Otorisasi Penuh)",
      description:
        "Akses penuh: Buku Induk, TTE/Nomor Surat Resmi, Verifikasi PPDB, GTK & Validasi EMIS.",
      canSignOfficial: true,
    },
  });

  const tuStaffUser = await prisma.user.upsert({
    where: { identifier: "199408122020122014" },
    update: {},
    create: {
      identifier: "199408122020122014",
      name: "Ibu Nurul Hidayah, A.Md.",
      passwordHash: defaultPassword,
      baseRole: "TU",
      avatarInitials: "NH",
    },
  });

  await prisma.tuStaffProfile.upsert({
    where: { userId: tuStaffUser.id },
    update: {},
    create: {
      userId: tuStaffUser.id,
      nip: "199408122020122014",
      position: "Staf Administrasi Kesiswaan & Persuratan",
      badge: "STAF LAYANAN",
      roleScope: "Mode Staf Kesiswaan & Persuratan (Drafting & Arsip R2)",
      description:
        "Fokus: Buku Induk Siswa, Arsip R2, Layanan Surat Keterangan Siswa & Agenda Surat Masuk/Keluar.",
      canSignOfficial: false,
    },
  });

  // 3. Guru (GTK) & Tugas Tambahan Dinamis
  const gtkSeeds = [
    {
      name: "Dra. Siti Aminah",
      nip: "197804122005012008",
      subject: "Matematika",
      roles: [
        { type: "Waka Kurikulum", detail: "SK-012/MTs.NF/2026" },
        { type: "Guru Piket", detail: "Sabtu" },
      ],
    },
    {
      name: "Budi Santoso, M.Pd.",
      nip: "198209152008011004",
      subject: "IPA Terpadu",
      roles: [
        { type: "Guru Piket", detail: "Sabtu" },
        { type: "Wali Kelas", detail: "IX-A" },
      ],
    },
    {
      name: "Ust. Ahmad Fauzi, S.Pd.",
      nip: "198805122015031002",
      subject: "Matematika",
      roles: [
        { type: "Wali Kelas", detail: "VIII-A" },
        { type: "Guru Piket", detail: "Sabtu" },
      ],
    },
    {
      name: "Nurul Hidayah, S.Ag.",
      nip: "198503082010012014",
      subject: "Fiqih & Akidah",
      roles: [{ type: "Panitia PPDB", detail: "Koordinator Verifikasi" }],
    },
    {
      name: "Fitriani Rahmawati, S.E.",
      nip: "199006142015032006",
      subject: "Ilmu Pengetahuan Sosial",
      roles: [
        { type: "Bendahara Komite", detail: "SK-019/MTs.NF/2026" },
        { type: "Wali Kelas", detail: "VII-A" },
      ],
    },
    {
      name: "M. Iqbal Maulana, S.Pd.",
      nip: "199201182019031007",
      subject: "Bahasa Arab",
      roles: [
        { type: "Pengelola Tabungan", detail: "Admin Tabungan Siswa" },
        { type: "Guru Piket", detail: "Senin" },
      ],
    },
    {
      name: "Dewi Sartika Putri, S.Psi.",
      nip: "199104172018012002",
      subject: "Bimbingan & Konseling",
      roles: [
        { type: "Guru Wali/BK", detail: "Koordinator BK" },
        { type: "Panitia PPDB", detail: "Pewawancara" },
      ],
    },
    {
      name: "Rizky Pratama, S.Pd.",
      nip: "199408252020121003",
      subject: "Bahasa Inggris",
      roles: [{ type: "Wali Kelas", detail: "VII-B" }],
    },
  ];

  for (const g of gtkSeeds) {
    const u = await prisma.user.upsert({
      where: { identifier: g.nip },
      update: { name: g.name },
      create: {
        identifier: g.nip,
        name: g.name,
        passwordHash: defaultPassword,
        baseRole: "GTK",
      },
    });

    const tp = await prisma.teacherProfile.upsert({
      where: { nip: g.nip },
      update: { subject: g.subject },
      create: {
        userId: u.id,
        nip: g.nip,
        subject: g.subject,
      },
    });

    await prisma.teacherAdditionalRole.deleteMany({
      where: { teacherId: tp.id },
    });

    for (const r of g.roles) {
      await prisma.teacherAdditionalRole.create({
        data: {
          teacherId: tp.id,
          type: r.type,
          detail: r.detail,
        },
      });
    }
  }

  // 4. Siswa & Buku Induk Digital + Akun Orang Tua
  const parentUser = await prisma.user.upsert({
    where: { identifier: "ortu.hendra@gmail.com" },
    update: {},
    create: {
      identifier: "ortu.hendra@gmail.com",
      email: "ortu.hendra@gmail.com",
      name: "Bapak Hendra Kusuma, S.T.",
      passwordHash: defaultPassword,
      baseRole: "ORTU",
      avatarInitials: "HK",
      phone: "0812-2345-6789",
    },
  });

  const studentSeeds = [
    {
      nis: "252608014",
      nisn: "0123456789",
      nik: "3204121505120004",
      name: "Muhammad Rizky Pratama",
      ttl: "Bandung, 15 Mei 2012",
      gender: "Laki-laki",
      fatherName: "Hendra Kusuma, S.T.",
      motherName: "Ratna Sari, S.Pd.",
      address: "Perum Griya Madani Blok B2 No. 11, Cibiru, Kota Bandung",
      prevSchool: "MI Al-Hidayah Cibiru",
      rombel: "VIII-A",
      waliKelas: "Ust. Ahmad Fauzi, S.Pd.",
      status: "Aktif",
      academicHistory: "2025/2026: Kelas VII-A (Naik) • 2026/2027: Kelas VIII-A",
      piketDay: "Senin",
      savingsBalance: 1450000,
      savingsAccount: "TAB-2026-0814",
      komiteMonthsPaid: 5,
      pointsTotal: 105,
      pointsBonus: 5,
      pointsPredicate: "Teladan",
      r2KkUrl: "buku-induk/2026/252608014-KK.pdf",
      r2KkUpdated: "14 Jul 2025",
      r2AktaUrl: "buku-induk/2026/252608014-AKTA.pdf",
      r2AktaUpdated: "14 Jul 2025",
      r2IjazahUrl: "buku-induk/2026/252608014-IJAZAH.pdf",
      r2IjazahUpdated: "15 Jul 2025",
      r2FotoUrl: "buku-induk/2026/252608014-FOTO.jpg",
      r2FotoUpdated: "15 Jul 2025",
    },
    {
      nis: "262707042",
      nisn: "0139876543",
      nik: "3204126208130009",
      name: "Aisyah Zahra Kusuma",
      ttl: "Bandung, 22 Agustus 2013",
      gender: "Perempuan",
      fatherName: "Hendra Kusuma, S.T.",
      motherName: "Ratna Sari, S.Pd.",
      address: "Perum Griya Madani Blok B2 No. 11, Cibiru, Kota Bandung",
      prevSchool: "SDN 124 Hanura Bandung",
      rombel: "VII-B",
      waliKelas: "Rizky Pratama, S.Pd.",
      status: "Aktif",
      academicHistory: "2026/2027: Kelas VII-B (Siswa Baru)",
      piketDay: "Rabu",
      savingsBalance: 820000,
      savingsAccount: "TAB-2026-0742",
      komiteMonthsPaid: 4,
      pointsTotal: 115,
      pointsBonus: 15,
      pointsPredicate: "Sangat Teladan",
      r2KkUrl: "buku-induk/2026/262707042-KK.pdf",
      r2KkUpdated: "13 Jul 2026",
      r2AktaUrl: "buku-induk/2026/262707042-AKTA.pdf",
      r2AktaUpdated: "13 Jul 2026",
      r2IjazahUrl: "buku-induk/2026/262707042-IJAZAH.pdf",
      r2IjazahUpdated: "14 Jul 2026",
      r2FotoUrl: "buku-induk/2026/262707042-FOTO.jpg",
      r2FotoUpdated: "14 Jul 2026",
    },
    {
      nis: "262707055",
      nisn: "0138765432",
      nik: "3204126209130008",
      name: "Nabila Khairunnisa",
      ttl: "Bandung, 22 September 2013",
      gender: "Perempuan",
      fatherName: "Dedi Kurniawan",
      motherName: "Lina Marlina",
      address: "Jl. A.H. Nasution No. 108, Cibiru, Kota Bandung",
      prevSchool: "MIS Nurul Huda",
      rombel: "VII-A",
      waliKelas: "Fitriani Rahmawati, S.E.",
      status: "Aktif",
      academicHistory: "2026/2027: Kelas VII-A (Siswa Baru)",
      piketDay: "Selasa",
      savingsBalance: 350000,
      savingsAccount: "TAB-2026-0755",
      komiteMonthsPaid: 5,
      pointsTotal: 100,
      pointsBonus: 0,
      pointsPredicate: "Sangat Baik",
      r2KkUrl: "buku-induk/2026/262707055-KK.pdf",
      r2KkUpdated: "12 Jul 2026",
      r2AktaUrl: "buku-induk/2026/262707055-AKTA.pdf",
      r2AktaUpdated: "12 Jul 2026",
      r2IjazahUrl: null,
      r2IjazahUpdated: null,
      r2FotoUrl: "buku-induk/2026/262707055-FOTO.jpg",
      r2FotoUpdated: "12 Jul 2026",
    },
    {
      nis: "242509003",
      nisn: "0114455667",
      nik: "3204121902110002",
      name: "Fajar Ramadhan Putra",
      ttl: "Sumedang, 19 Februari 2011",
      gender: "Laki-laki",
      fatherName: "Agus Setiawan",
      motherName: "Nenden Hasanah",
      address: "Jl. Raya Cinunuk No. 45, Cileunyi, Kab. Bandung",
      prevSchool: "SDN Cinunuk 02",
      rombel: "IX-A",
      waliKelas: "Budi Santoso, M.Pd.",
      status: "Aktif",
      academicHistory: "2024/2025: VII-A • 2025/2026: VIII-A • 2026/2027: IX-A",
      piketDay: "Kamis",
      savingsBalance: 2150000,
      savingsAccount: "TAB-2026-0903",
      komiteMonthsPaid: 6,
      pointsTotal: 110,
      pointsBonus: 10,
      pointsPredicate: "Teladan",
      r2KkUrl: "buku-induk/2026/242509003-KK.pdf",
      r2KkUpdated: "10 Jul 2024",
      r2AktaUrl: "buku-induk/2026/242509003-AKTA.pdf",
      r2AktaUpdated: "10 Jul 2024",
      r2IjazahUrl: "buku-induk/2026/242509003-IJAZAH.pdf",
      r2IjazahUpdated: "10 Jul 2024",
      r2FotoUrl: "buku-induk/2026/242509003-FOTO.jpg",
      r2FotoUpdated: "10 Jul 2024",
    },
  ];

  for (const s of studentSeeds) {
    const su = await prisma.user.upsert({
      where: { identifier: s.nisn },
      update: { name: s.name },
      create: {
        identifier: s.nisn,
        name: s.name,
        passwordHash: defaultPassword,
        baseRole: "SISWA",
      },
    });

    const stu = await prisma.student.upsert({
      where: { nisn: s.nisn },
      update: {
        rombel: s.rombel,
        savingsBalance: s.savingsBalance,
      },
      create: {
        ...s,
        userId: su.id,
      },
    });

    if (s.fatherName.includes("Hendra Kusuma")) {
      await prisma.studentParent.upsert({
        where: {
          parentUserId_studentId: {
            parentUserId: parentUser.id,
            studentId: stu.id,
          },
        },
        update: {},
        create: {
          parentUserId: parentUser.id,
          studentId: stu.id,
          relation: "Ayah Kandung",
        },
      });
    }
  }

  // 5. Data Pendaftar PPDB Online
  const ppdbSeeds = [
    {
      regNo: "PPDB-2027-0142",
      submittedAt: "12 Nov 2026, 09:40 WIB",
      track: "PRESTASI",
      fullName: "Muhammad Zidan Al-Farizi",
      nisn: "0134582910",
      nik: "3204120804130003",
      birthPlace: "Bandung",
      birthDate: "2013-04-08",
      gender: "LAKI-LAKI",
      previousSchool: "MI Plus Al-Muhajirin",
      avgScore: "92.40",
      fatherName: "H. Syarif Hidayatullah",
      motherName: "Hj. Nenden Rohmah",
      parentPhone: "081322445566",
      parentOccupation: "Wiraswasta",
      address: "Jl. Manisi No. 28, Cibiru, Kota Bandung",
      status: "DITERIMA",
      verificationNotes:
        "Seluruh berkas persyaratan R2 lengkap & sah. Lulus Tes Tahfidz 4 Juz (Mumtaz).",
      targetClassroom: "VII-A",
      scoreBtq: 95,
      scoreAcademic: 91,
      scoreInterview: 93,
      finalScore: 93.2,
      docKkUrl: "ppdb/2027/PPDB-2027-0142-KK.pdf",
      docKkVerified: true,
      docAktaUrl: "ppdb/2027/PPDB-2027-0142-AKTA.pdf",
      docAktaVerified: true,
      docSklUrl: "ppdb/2027/PPDB-2027-0142-SKL.pdf",
      docSklVerified: true,
      docFotoUrl: "ppdb/2027/PPDB-2027-0142-FOTO.jpg",
      docFotoVerified: true,
      docExtraName: "Sertifikat Tahfidz Juz 30, 29, 28, 27",
      docExtraUrl: "ppdb/2027/PPDB-2027-0142-TAHFIDZ.pdf",
      docExtraVerified: true,
    },
    {
      regNo: "PPDB-2027-0148",
      submittedAt: "14 Nov 2026, 13:15 WIB",
      track: "REGULER",
      fullName: "Anindya Putri Salsabila",
      nisn: "0139041822",
      nik: "3273115203140007",
      birthPlace: "Bandung",
      birthDate: "2014-03-12",
      gender: "PEREMPUAN",
      previousSchool: "SDN 124 Hanura Bandung",
      avgScore: "89.20",
      fatherName: "Ir. Bambang Suryadi",
      motherName: "Dewi Kartika, S.E.",
      parentPhone: "081298761234",
      parentOccupation: "Karyawan Swasta",
      address: "Komp. Bumi Panyileukan Blok G4 No. 9, Kota Bandung",
      status: "MENUNGGU_VERIFIKASI",
      verificationNotes:
        "Berkas baru diunggah ke Cloudflare R2. Menunggu pemeriksaan Panitia PPDB.",
      targetClassroom: "VII-A",
      scoreBtq: 86,
      scoreAcademic: 88,
      scoreInterview: 85,
      finalScore: 86.5,
      docKkUrl: "ppdb/2027/PPDB-2027-0148-KK.pdf",
      docKkVerified: true,
      docAktaUrl: "ppdb/2027/PPDB-2027-0148-AKTA.pdf",
      docAktaVerified: true,
      docSklUrl: "ppdb/2027/PPDB-2027-0148-SKL.pdf",
      docSklVerified: false,
      docFotoUrl: "ppdb/2027/PPDB-2027-0148-FOTO.jpg",
      docFotoVerified: true,
    },
    {
      regNo: "PPDB-2027-0151",
      submittedAt: "15 Nov 2026, 08:10 WIB",
      track: "AFIRMASI",
      fullName: "Rafa Aditya Pratama",
      nisn: "0137761209",
      nik: "3204121907130011",
      birthPlace: "Garut",
      birthDate: "2013-07-19",
      gender: "LAKI-LAKI",
      previousSchool: "SDN Cibiru 04",
      avgScore: "84.50",
      fatherName: "Usep Supriatna",
      motherName: "Euis Komariah",
      parentPhone: "085721334455",
      parentOccupation: "Buruh Harian Lepas",
      address: "Kp. Cipadung RT 04/RW 08, Kec. Cibiru, Kota Bandung",
      status: "PERLU_REVISI",
      verificationNotes:
        "Scan Kartu Keluarga (KK) bagian tanda tangan Kepala Keluarga/QR Dukcapil terpotong. Mohon unggah ulang.",
      targetClassroom: "VII-B",
      scoreBtq: 82,
      scoreAcademic: 84,
      scoreInterview: 88,
      finalScore: 84.3,
      docKkUrl: "ppdb/2027/PPDB-2027-0151-KK-BURAM.pdf",
      docKkVerified: false,
      docAktaUrl: "ppdb/2027/PPDB-2027-0151-AKTA.pdf",
      docAktaVerified: true,
      docSklUrl: "ppdb/2027/PPDB-2027-0151-SKL.pdf",
      docSklVerified: true,
      docFotoUrl: "ppdb/2027/PPDB-2027-0151-FOTO.jpg",
      docFotoVerified: true,
      docExtraName: "Kartu Indonesia Pintar (KIP)",
      docExtraUrl: "ppdb/2027/PPDB-2027-0151-KIP.pdf",
      docExtraVerified: true,
    },
  ];

  for (const p of ppdbSeeds) {
    await prisma.ppdbApplicant.upsert({
      where: { regNo: p.regNo },
      update: {},
      create: p,
    });
  }

  // 6.Berita CMS Halaman Publik
  await prisma.cmsPost.deleteMany();
  await prisma.cmsPost.createMany({
    data: [
      {
        title: "Pembukaan PPDB Online Tahun Ajaran 2026/2027 Gelombang I (Jalur Prestasi, Afirmasi & Reguler)",
        slug: "pembukaan-ppdb-online-2026-2027",
        category: "Pengumuman",
        excerpt:
          "MTs Nurul Falah resmi membuka pendaftaran peserta didik baru berbasis pemberkasan digital Cloudflare R2 dan seleksi terpadu.",
        content:
          "Pendaftaran Peserta Didik Baru (PPDB) MTs Nurul Falah Tahun Ajaran 2026/2027 resmi dibuka secara daring penuh. Calon peserta didik dapat mendaftar secara mandiri menggunakan NISN dan NIK serta mengunggah dokumen persyaratan langsung ke sistem.",
        author: "Panitia PPDB & Humas",
        dateLabel: "14 Nov 2026",
        isFeatured: true,
        status: "Published",
      },
      {
        title: "Siswa MTs Nurul Falah Raih Medali Emas Kompetisi Sains Madrasah (KSM) Bidang Matematika Terintegrasi",
        slug: "raih-medali-emas-ksm-matematika",
        category: "Prestasi",
        excerpt:
          "Prestasi membanggakan kembali ditorehkan delegasi siswa kelas VIII-A pada ajang KSM Tingkat Kota/ Provinsi tahun ini.",
        content:
          "Alhamdulillah, kontingen Olimpiade & KSM MTs Nurul Falah berhasil meraih Medali Emas bidang Matematika Terintegrasi dan Juara Harapan I IPA Terpadu Terintegrasi.",
        author: "Waka Kesiswaan",
        dateLabel: "10 Nov 2026",
        isFeatured: false,
        status: "Published",
      },
      {
        title: "Jadwal Pelaksanaan Asesmen Sumatif Akhir Semester (ASAS) Ganjil Tahun Ajaran 2026/2027",
        slug: "jadwal-asas-ganjil-2026-2027",
        category: "Akademik",
        excerpt:
          "Informasi pelaksanaan ujian semester ganjil berbasis komputer dan syarat ketuntasan administrasi akademik siswa.",
        content:
          "Asesmen Sumatif Akhir Semester (ASAS) Ganjil akan dilaksanakan mulai tanggal 1 hingga 9 Desember 2026. Seluruh siswa diharapkan memastikan kehadiran minimal 90% dan menuntaskan tugas proyek P5RA.",
        author: "Waka Kurikulum",
        dateLabel: "05 Nov 2026",
        isFeatured: false,
        status: "Published",
      },
    ],
  });

  console.log("✅ Seeding database SIMS selesai!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
