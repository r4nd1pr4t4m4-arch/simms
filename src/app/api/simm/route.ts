import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

const PROFILE_CONFIG_PATH = path.join(process.cwd(), "madrasah-profile.json");

export interface MadrasahProfileConfig {
  name: string;
  nsm: string;
  npsn: string;
  accreditation: string;
  academicYear: string;
  semester: string;
  curriculum: string;
  headmasterName: string;
  headmasterNip: string;
  tuHeadName: string;
  tuHeadNip: string;
  address: string;
  phone: string;
  email: string;
  gpsLat: string;
  gpsLng: string;
  gpsRadiusMeters: number;
  komiteBankInfo: string;
}

const DEFAULT_MADRASAH_PROFILE: MadrasahProfileConfig = {
  name: "MTs Nurul Falah",
  nsm: "121216050060",
  npsn: "69963460",
  accreditation: "Terakreditasi C",
  academicYear: "2026/2027",
  semester: "Ganjil",
  curriculum: "Kurikulum Merdeka & KMA 450",
  headmasterName: "Syarip Husin, S.Sos., Gr.",
  headmasterNip: "10649207182001",
  tuHeadName: "-",
  tuHeadNip: "-",
  address:
    "Jl. Jambi Lama RT. 004 Kel. Terawas Kec. STL Ulu Terawas Kab. Musi Rawas 30771",
  phone: "-",
  email: "info@mtsnurulfalah.sch.id",
  gpsLat: "-3.0659978",
  gpsLng: "102.8196529",
  gpsRadiusMeters: 100,
  komiteBankInfo: "Bank Mandiri | 1130016126868 a.n. MTSS NURUL FALAH",
};

export async function getMadrasahProfile(): Promise<MadrasahProfileConfig> {
  try {
    // Cek dari SystemActivityLog kategori "madrasah_profile" di Supabase terlebih dahulu
    const latest = await prisma.systemActivityLog.findFirst({
      where: { category: "madrasah_profile" },
      orderBy: { createdAt: "desc" },
    });
    if (latest && latest.actionText) {
      return { ...DEFAULT_MADRASAH_PROFILE, ...JSON.parse(latest.actionText) };
    }
  } catch {
    // Fallback ke file JSON lokal jika ada
  }
  try {
    const raw = await fs.readFile(PROFILE_CONFIG_PATH, "utf-8");
    return { ...DEFAULT_MADRASAH_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_MADRASAH_PROFILE;
  }
}

export async function getPortalDatabaseSummary() {
  const [
    teachers,
    students,
    ppdb,
    cmsPosts,
    serviceRequests,
    mailAgenda,
    profile,
  ] = await Promise.all([
    prisma.teacherProfile.findMany({
      include: { user: true, roles: true },
      orderBy: { nip: "asc" },
    }),
    prisma.student.findMany({
      orderBy: { nis: "asc" },
    }),
    prisma.ppdbApplicant.findMany({
      orderBy: { regNo: "desc" },
    }),
    prisma.cmsPost.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.serviceRequest.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.mailAgenda.findMany({
      orderBy: { createdAt: "desc" },
    }),
    getMadrasahProfile(),
  ]);

  return {
    ok: true,
    profile,
    teachers,
    students,
    ppdb,
    cmsPosts,
    serviceRequests,
    mailAgenda,
  };
}

export async function GET(req: NextRequest) {
  try {
    const resource = req.nextUrl.searchParams.get("resource") || "summary";

    if (resource === "profile") {
      const profile = await getMadrasahProfile();
      return NextResponse.json({ ok: true, profile });
    }

    if (resource === "summary") {
      const summary = await getPortalDatabaseSummary();
      return NextResponse.json(summary);
    }

    if (resource === "nisn") {
      const nisn = req.nextUrl.searchParams.get("nisn") || "";
      const student = await prisma.student.findUnique({
        where: { nisn },
      });
      return NextResponse.json({ ok: true, student });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Database query gagal" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      // 0. Simpan Identitas & Profil Resmi Madrasah (Go-Live)
      case "SAVE_MADRASAH_PROFILE": {
        const merged: MadrasahProfileConfig = {
          ...DEFAULT_MADRASAH_PROFILE,
          ...payload,
        };
        await prisma.systemActivityLog.create({
          data: {
            actor: "Super Admin",
            roleBadge: "ADMIN",
            actionText: JSON.stringify(merged),
            timeLabel: new Date().toLocaleString("id-ID"),
            category: "madrasah_profile",
          },
        });
        await prisma.academicYear.updateMany({
          where: { isActive: true },
          data: {
            name: merged.academicYear,
            semester: merged.semester,
            curriculum: merged.curriculum,
          },
        });
        await fs
          .writeFile(
            PROFILE_CONFIG_PATH,
            JSON.stringify(merged, null, 2),
            "utf-8"
          )
          .catch(() => null);

        return NextResponse.json({ ok: true, profile: merged });
      }

      // 0B. Import Massal Siswa dari CSV/Excel (Format EMIS / Buku Induk)
      case "BULK_IMPORT_STUDENTS": {
        const rows = Array.isArray(payload?.rows) ? payload.rows : [];
        const defaultPw = await bcrypt.hash("Simms2026!", 10);
        let importedCount = 0;

        for (const r of rows) {
          const nis = String(r.nis || "").trim();
          const nisn = String(r.nisn || "").trim();
          const name = String(r.name || "").trim();
          if (!nis || !nisn || !name) continue;

          const u = await prisma.user.upsert({
            where: { identifier: nisn },
            update: { name },
            create: {
              identifier: nisn,
              name,
              passwordHash: defaultPw,
              baseRole: "SISWA",
            },
          });

          await prisma.student.upsert({
            where: { nisn },
            update: {
              nis,
              name,
              nik: String(r.nik || "3204120000000000"),
              ttl: String(r.ttl || "Bandung, 01 Januari 2013"),
              gender: String(r.gender || "Laki-laki"),
              rombel: String(r.rombel || "VII-A"),
              fatherName: String(r.fatherName || "-"),
              motherName: String(r.motherName || "-"),
              parentPhone: String(r.parentPhone || "-"),
              address: String(r.address || "-"),
              prevSchool: String(r.prevSchool || "-"),
              waliKelas: String(r.waliKelas || "-"),
              status: "Aktif",
            },
            create: {
              userId: u.id,
              nis,
              nisn,
              name,
              nik: String(r.nik || "3204120000000000"),
              ttl: String(r.ttl || "Bandung, 01 Januari 2013"),
              gender: String(r.gender || "Laki-laki"),
              rombel: String(r.rombel || "VII-A"),
              fatherName: String(r.fatherName || "-"),
              motherName: String(r.motherName || "-"),
              parentPhone: String(r.parentPhone || "-"),
              address: String(r.address || "-"),
              prevSchool: String(r.prevSchool || "-"),
              waliKelas: String(r.waliKelas || "-"),
              status: "Aktif",
              academicHistory: `Tahun Ajaran Aktif: Kelas ${r.rombel || "VII-A"} (Impor EMIS)`,
            },
          });
          importedCount++;
        }

        return NextResponse.json({ ok: true, importedCount });
      }

      // 0C. Import Massal Guru / GTK dari CSV/Excel
      case "BULK_IMPORT_TEACHERS": {
        const rows = Array.isArray(payload?.rows) ? payload.rows : [];
        const defaultPw = await bcrypt.hash("Simms2026!", 10);
        let importedCount = 0;

        for (const r of rows) {
          const nip = String(r.nip || "").trim();
          const name = String(r.name || "").trim();
          const subject = String(r.subject || "Guru Mata Pelajaran").trim();
          if (!nip || !name) continue;

          const u = await prisma.user.upsert({
            where: { identifier: nip },
            update: { name },
            create: {
              identifier: nip,
              name,
              passwordHash: defaultPw,
              baseRole: "GTK",
            },
          });

          const tp = await prisma.teacherProfile.upsert({
            where: { nip },
            update: { subject },
            create: {
              userId: u.id,
              nip,
              subject,
            },
          });

          if (r.additionalRole && String(r.additionalRole).trim()) {
            const roleType = String(r.additionalRole).trim();
            await prisma.teacherAdditionalRole.create({
              data: {
                teacherId: tp.id,
                type: roleType,
                detail: String(r.roleDetail || "SK Tahun Ajaran Aktif").trim(),
              },
            });

            // Jika tugas tambahan adalah Kepala Madrasah, perbarui otomatis profil Kepala Madrasah resmi
            if (roleType.toLowerCase().includes("kepala madrasah")) {
              const currentProfile = await getMadrasahProfile();
              const updatedProfile: MadrasahProfileConfig = {
                ...currentProfile,
                headmasterName: name,
                headmasterNip: nip,
              };
              await prisma.systemActivityLog.create({
                data: {
                  actor: "System Import GTK",
                  roleBadge: "ADMIN",
                  actionText: JSON.stringify(updatedProfile),
                  timeLabel: new Date().toLocaleString("id-ID"),
                  category: "madrasah_profile",
                },
              });
            }
          }

          importedCount++;
        }

        return NextResponse.json({ ok: true, importedCount });
      }

      // 0D. Reset / Bersihkan Data Dummy (Pertahankan Data Riil Guru, Siswa & Identitas Madrasah)
      case "RESET_DUMMY_DATA": {
        await prisma.$transaction([
          prisma.savingsTransaction.deleteMany(),
          prisma.savingsWithdrawalRequest.deleteMany(),
          prisma.komitePayment.deleteMany(),
          prisma.studentLeaveRequest.deleteMany(),
          prisma.counselingNote.deleteMany(),
          prisma.studentAchievement.deleteMany(),
          prisma.serviceRequest.deleteMany(),
          prisma.ppdbApplicant.deleteMany(),
          prisma.teacherAttendance.deleteMany(),
          prisma.dailyDutySchedule.deleteMany(),
          prisma.cleaningRoster.deleteMany(),
          prisma.piketIncidentLog.deleteMany(),
          prisma.directMessage.deleteMany(),
          prisma.classSchedule.deleteMany(),
          prisma.cmsPost.deleteMany(),
          prisma.mailAgenda.deleteMany(),
          prisma.systemActivityLog.deleteMany({
            where: { category: { not: "madrasah_profile" } },
          }),
        ]);
        return NextResponse.json({
          ok: true,
          message:
            "Seluruh data operasional/contoh berhasil dibersihkan. Data riil Guru, Siswa, dan Identitas Resmi Madrasah tetap dipertahankan.",
        });
      }

      // 1. Tambah Tugas Tambahan GTK (Dynamic RBAC)
      case "ADD_GTK_ROLE": {
        const { nip, type, detail, skNumber } = payload;
        const teacher = await prisma.teacherProfile.findUnique({
          where: { nip },
          include: { user: true },
        });
        if (!teacher) {
          return NextResponse.json(
            { ok: false, error: "GTK tidak ditemukan" },
            { status: 404 }
          );
        }
        const created = await prisma.teacherAdditionalRole.create({
          data: {
            teacherId: teacher.id,
            type,
            detail,
            skNumber: skNumber || "SK-024/MTs.NF/2026",
          },
        });
        if (String(type || "").toLowerCase().includes("kepala madrasah")) {
          const currentProfile = await getMadrasahProfile();
          const updatedProfile: MadrasahProfileConfig = {
            ...currentProfile,
            headmasterName: teacher.user?.name || currentProfile.headmasterName,
            headmasterNip: teacher.nip || currentProfile.headmasterNip,
          };
          await prisma.systemActivityLog.create({
            data: {
              actor: "Super Admin",
              roleBadge: "ADMIN",
              actionText: JSON.stringify(updatedProfile),
              timeLabel: new Date().toLocaleString("id-ID"),
              category: "madrasah_profile",
            },
          });
        }
        return NextResponse.json({ ok: true, data: created });
      }

      // 2. Hapus Tugas Tambahan GTK
      case "REMOVE_GTK_ROLE": {
        const { roleId } = payload;
        await prisma.teacherAdditionalRole
          .delete({
            where: { id: String(roleId) },
          })
          .catch(() => null);
        return NextResponse.json({ ok: true });
      }

      // 3. Tambah Siswa Baru ke Buku Induk
      case "CREATE_STUDENT": {
        const created = await prisma.student.create({
          data: {
            nis: payload.nis,
            nisn: payload.nisn,
            nik: payload.nik || "3204120000000001",
            name: payload.name,
            ttl: payload.ttl || "Bandung, 01 Januari 2013",
            gender: payload.gender || "Laki-laki",
            fatherName: payload.fatherName || "-",
            motherName: payload.motherName || "-",
            address: payload.address || "Kota Bandung",
            prevSchool: payload.prevSchool || "SD/MI Asal",
            rombel: payload.rombel || "VII-A",
            waliKelas: payload.waliKelas || "Fitriani Rahmawati, S.E.",
            status: payload.status || "Aktif",
            academicHistory: `2026/2027: Kelas ${payload.rombel || "VII-A"}`,
            r2KkUrl: payload.r2KkUrl || null,
            r2AktaUrl: payload.r2AktaUrl || null,
            r2IjazahUrl: payload.r2IjazahUrl || null,
            r2FotoUrl: payload.r2FotoUrl || null,
          },
        });
        return NextResponse.json({ ok: true, data: created });
      }

      // 4. Kenaikan Kelas Massal (Batch Promotion)
      case "BATCH_PROMOTE_STUDENTS": {
        const { fromRombel, toRombel } = payload;
        const students = await prisma.student.findMany({
          where: { rombel: fromRombel, status: "Aktif" },
        });
        const isGraduating = toRombel === "LULUS_ALUMNI";
        for (const s of students) {
          await prisma.student.update({
            where: { id: s.id },
            data: {
              rombel: isGraduating ? s.rombel : toRombel,
              status: isGraduating ? "Lulus / Alumni" : "Aktif",
              academicHistory: isGraduating
                ? `${s.academicHistory} • Lulus Tahun 2027`
                : `${s.academicHistory} • Naik ke ${toRombel}`,
            },
          });
        }
        return NextResponse.json({ ok: true, count: students.length });
      }

      // 5. Pendaftaran PPDB Online Baru
      case "SUBMIT_PPDB": {
        const created = await prisma.ppdbApplicant.upsert({
          where: { nisn: payload.nisn },
          update: {
            fullName: payload.fullName,
            track: payload.track,
            docKkUrl: payload.docKkUrl,
            docAktaUrl: payload.docAktaUrl,
            docSklUrl: payload.docSklUrl,
            docFotoUrl: payload.docFotoUrl,
            docExtraUrl: payload.docExtraUrl,
          },
          create: {
            regNo: payload.regNo,
            submittedAt: payload.submittedAt || "Hari Ini, Baru Saja",
            track: payload.track || "REGULER",
            fullName: payload.fullName,
            nisn: payload.nisn,
            nik: payload.nik,
            birthPlace: payload.birthPlace || "Bandung",
            birthDate: payload.birthDate || "2014-01-01",
            gender: payload.gender || "LAKI-LAKI",
            previousSchool: payload.previousSchool || "SD/MI Asal",
            avgScore: payload.avgScore || "88.00",
            fatherName: payload.fatherName || "-",
            motherName: payload.motherName || "-",
            parentPhone: payload.parentPhone || "-",
            parentOccupation: payload.parentOccupation || "-",
            address: payload.address || "-",
            status: "MENUNGGU_VERIFIKASI",
            docKkUrl: payload.docKkUrl || null,
            docAktaUrl: payload.docAktaUrl || null,
            docSklUrl: payload.docSklUrl || null,
            docFotoUrl: payload.docFotoUrl || null,
            docExtraName: payload.docExtraName || null,
            docExtraUrl: payload.docExtraUrl || null,
          },
        });
        return NextResponse.json({ ok: true, data: created });
      }

      // 6. Input Nilai Seleksi & Update Status PPDB (Panitia PPDB / Admin)
      case "UPDATE_PPDB_SCORE_STATUS": {
        const {
          regNo,
          scoreBtq,
          scoreAcademic,
          scoreInterview,
          status,
          verificationNotes,
          targetClassroom,
        } = payload;
        const btq = Number(scoreBtq ?? 0);
        const acad = Number(scoreAcademic ?? 0);
        const intv = Number(scoreInterview ?? 0);
        const finalScore = Number(
          (btq * 0.4 + acad * 0.35 + intv * 0.25).toFixed(2)
        );

        const updated = await prisma.ppdbApplicant.update({
          where: { regNo },
          data: {
            ...(scoreBtq !== undefined
              ? {
                  scoreBtq: btq,
                  scoreAcademic: acad,
                  scoreInterview: intv,
                  finalScore,
                }
              : {}),
            ...(status ? { status } : {}),
            ...(verificationNotes ? { verificationNotes } : {}),
            ...(targetClassroom ? { targetClassroom } : {}),
          },
        });
        return NextResponse.json({ ok: true, data: updated });
      }

      // 7. One-Click Migration PPDB ke Buku Induk Siswa
      case "MIGRATE_PPDB_TO_BUKU_INDUK": {
        const { regNo, issuedNis, targetRombel } = payload;
        const app = await prisma.ppdbApplicant.findUnique({ where: { regNo } });
        if (!app) {
          return NextResponse.json(
            { ok: false, error: "Pendaftar tidak ditemukan" },
            { status: 404 }
          );
        }

        const nisFinal =
          issuedNis || `262707${Math.floor(100 + Math.random() * 899)}`;
        const rombelFinal = targetRombel || app.targetClassroom || "VII-A";

        const student = await prisma.student.upsert({
          where: { nisn: app.nisn },
          update: {
            rombel: rombelFinal,
            status: "Aktif",
          },
          create: {
            nis: nisFinal,
            nisn: app.nisn,
            nik: app.nik,
            name: app.fullName,
            ttl: `${app.birthPlace}, ${app.birthDate}`,
            gender: app.gender === "PEREMPUAN" ? "Perempuan" : "Laki-laki",
            fatherName: app.fatherName,
            motherName: app.motherName,
            parentPhone: app.parentPhone,
            address: app.address,
            prevSchool: app.previousSchool,
            rombel: rombelFinal,
            waliKelas: "Fitriani Rahmawati, S.E.",
            status: "Aktif",
            academicHistory: `2026/2027: Kelas ${rombelFinal} (Migrasi Otomatis PPDB ${app.regNo})`,
            r2KkUrl: app.docKkUrl,
            r2KkUpdated: "Baru Saja (Migrasi PPDB)",
            r2AktaUrl: app.docAktaUrl,
            r2AktaUpdated: "Baru Saja (Migrasi PPDB)",
            r2IjazahUrl: app.docSklUrl,
            r2IjazahUpdated: "Baru Saja (Migrasi PPDB)",
            r2FotoUrl: app.docFotoUrl,
            r2FotoUpdated: "Baru Saja (Migrasi PPDB)",
          },
        });

        await prisma.ppdbApplicant.update({
          where: { regNo },
          data: {
            status: "SUDAH_MIGRASI",
            nisIssued: nisFinal,
          },
        });

        return NextResponse.json({ ok: true, student });
      }

      // 8. Buat / Toggle Artikel CMS Halaman Publik
      case "CREATE_CMS_POST": {
        const slug =
          (payload.title || "berita")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") +
          "-" +
          Date.now().toString().slice(-4);

        const created = await prisma.cmsPost.create({
          data: {
            title: payload.title,
            slug,
            category: payload.category || "Pengumuman",
            excerpt: payload.excerpt || "",
            content: payload.content || payload.excerpt || "",
            author: payload.author || "Admin Humas",
            dateLabel: payload.dateLabel || "15 Nov 2026",
            r2ThumbUrl: payload.r2ThumbUrl || null,
            status: payload.status || "Published",
          },
        });
        return NextResponse.json({ ok: true, data: created });
      }

      default:
        return NextResponse.json({ ok: true, action });
    }
  } catch (error: any) {
    console.error("API /api/simm POST error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Gagal memproses aksi" },
      { status: 500 }
    );
  }
}
