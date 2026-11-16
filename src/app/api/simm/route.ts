import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  AuthContext,
  HttpError,
  Permission,
  can,
  errorResponse,
  getAuthContext,
  requireAuth,
} from "@/lib/guard";
import {
  AcademicMasterConfig,
  AcademicPeriodArchive,
  MadrasahProfileConfig,
  getAcademicArchives,
  getAcademicMaster,
  getMadrasahProfile,
  getScopedSummary,
  inferGradeCodeFromRombel,
  invalidateScopeCache,
  persistAcademicMaster,
  persistMadrasahProfile,
} from "@/lib/data-scope";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { deepNeutralize } from "@/lib/security";
import {
  asObject,
  codeId,
  digits,
  digitsOrNull,
  numberIn,
  oneOf,
  optText,
  r2KeyOrNull,
  reqText,
} from "@/lib/validate";

// Batas jumlah baris per import massal (mencegah DoS)
const MAX_IMPORT_ROWS = 2000;
const DEFAULT_IMPORT_PASSWORD = "Simms2026!";

const PPDB_STATUSES = [
  "MENUNGGU_VERIFIKASI",
  "PERLU_REVISI",
  "TERVERIFIKASI",
  "DITERIMA",
  "DITOLAK",
  "SUDAH_MIGRASI",
] as const;
const PPDB_TRACKS = ["REGULER", "PRESTASI", "AFIRMASI"] as const;
const PPDB_GENDERS = ["LAKI-LAKI", "PEREMPUAN"] as const;
const STUDENT_GENDERS = ["Laki-laki", "Perempuan"] as const;
const STUDENT_STATUSES = ["Aktif", "Mutasi Masuk", "Mutasi Keluar", "Lulus / Alumni"] as const;
const CMS_STATUSES = ["Published", "Draft"] as const;

/** Normalisasi jenis kelamin (L/P, Laki-laki, PEREMPUAN, dst.) */
function normalizeStudentGender(v: unknown): "Laki-laki" | "Perempuan" {
  return /^\s*p/i.test(String(v ?? "")) ? "Perempuan" : "Laki-laki";
}

function nowLabel() {
  return new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function isKepalaMadrasahRole(type: string) {
  return type.toLowerCase().includes("kepala madrasah");
}

function actorBadge(ctx: AuthContext) {
  return ctx.isKepalaMadrasah ? "KEPALA MADRASAH" : ctx.baseRole;
}

function actorIdentity(ctx: AuthContext) {
  return `${ctx.user.name} (${ctx.user.identifier})`;
}

async function writeAuditLog(
  ctx: AuthContext,
  actionText: string,
  category: "system" | "security_audit" = "system"
) {
  await prisma.systemActivityLog
    .create({
      data: {
        actor: actorIdentity(ctx),
        roleBadge: actorBadge(ctx),
        actionText,
        timeLabel: nowLabel(),
        category,
      },
    })
    .catch(() => null);
}

/** Hitung jarak permukaan bumi (meter) menggunakan rumus Haversine. */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Buat NIS berurutan berikutnya (mis. 262707001, 262707002, dst.) bebas bentrok. */
async function generateNextStudentNis(prefix = "262707"): Promise<string> {
  const latest = await prisma.student.findFirst({
    where: { nis: { startsWith: prefix } },
    orderBy: { nis: "desc" },
    select: { nis: true },
  });
  if (latest?.nis) {
    const tail = parseInt(latest.nis.slice(prefix.length), 10);
    if (Number.isFinite(tail) && tail >= 0) {
      return `${prefix}${String(tail + 1).padStart(3, "0")}`;
    }
  }
  const count = await prisma.student.count();
  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

/** Tentukan rombel tujuan saat kenaikan tahun pelajaran (VII->VIII, VIII->IX, IX->LULUS). */
function computeNextYearRombel(
  currentRombel: string,
  master: AcademicMasterConfig
): { isGraduating: boolean; nextRombel: string } {
  const s = String(currentRombel || "").trim();
  const matchedRombel = master.rombels.find(
    (r) => r.code.toUpperCase() === s.toUpperCase()
  );
  const gradeCode =
    matchedRombel?.gradeCode || inferGradeCodeFromRombel(s);
  const matchedGrade = master.gradeLevels.find(
    (g) => g.code.toUpperCase() === gradeCode.toUpperCase()
  );

  if (matchedGrade?.isFinalGrade || /^(:?IX|9)\b/i.test(s) || /^9[A-Z]/i.test(s)) {
    return { isGraduating: true, nextRombel: s };
  }

  // Naik dari VIII / 8 ke IX / 9
  if (/^VIII/i.test(s)) {
    return { isGraduating: false, nextRombel: s.replace(/^VIII/i, "IX") };
  }
  if (/^8/i.test(s)) {
    return { isGraduating: false, nextRombel: s.replace(/^8/, "9") };
  }
  // Naik dari VII / 7 ke VIII / 8
  if (/^VII/i.test(s)) {
    return { isGraduating: false, nextRombel: s.replace(/^VII/i, "VIII") };
  }
  if (/^7/i.test(s)) {
    return { isGraduating: false, nextRombel: s.replace(/^7/, "8") };
  }

  return { isGraduating: false, nextRombel: s };
}

/**
 * Arsipkan periode akademik aktif (Semester / Tahun Pelajaran) dan jalankan
 * ketentuan transisi akademik secara otomatis.
 */
async function executeAcademicPeriodTransition(
  ctx: AuthContext,
  opts: {
    targetAcademicYear: string;
    targetSemester: "Ganjil" | "Genap";
    targetCurriculum?: string;
    resetSemesterPoints?: boolean;
    autoPromoteAndGraduate?: boolean;
    notes?: string;
  }
): Promise<AcademicPeriodArchive> {
  const currentProfile = await getMadrasahProfile();
  const master = await getAcademicMaster();

  const isNewYear = opts.targetAcademicYear !== currentProfile.academicYear;
  const transitionType: "CHANGE_SEMESTER" | "NEW_ACADEMIC_YEAR" = isNewYear
    ? "NEW_ACADEMIC_YEAR"
    : "CHANGE_SEMESTER";

  const [
    activeStudents,
    activeTeachersCount,
    schedulesCount,
    counselingCount,
  ] = await Promise.all([
    prisma.student.findMany({ where: { status: "Aktif" } }),
    prisma.teacherProfile.count(),
    prisma.classSchedule.count(),
    prisma.counselingNote.count(),
  ]);

  const rombelMap = new Map<string, number>();
  let totalSavings = 0;
  for (const st of activeStudents) {
    rombelMap.set(st.rombel, (rombelMap.get(st.rombel) || 0) + 1);
    totalSavings += st.savingsBalance || 0;
  }
  const rombelBreakdown = Array.from(rombelMap.entries())
    .map(([rombel, count]) => ({ rombel, count }))
    .sort((a, b) => a.rombel.localeCompare(b.rombel));

  let graduatedCount = 0;
  let promotedCount = 0;

  if (transitionType === "NEW_ACADEMIC_YEAR") {
    const shouldPromote = opts.autoPromoteAndGraduate !== false;

    for (const st of activeStudents) {
      if (shouldPromote) {
        const { isGraduating, nextRombel } = computeNextYearRombel(
          st.rombel,
          master
        );
        if (isGraduating) {
          graduatedCount++;
          await prisma.student.update({
            where: { id: st.id },
            data: {
              status: "Lulus / Alumni",
              academicHistory: `${st.academicHistory} • Lulus TA ${currentProfile.academicYear}`,
            },
          });
        } else {
          if (nextRombel !== st.rombel) promotedCount++;
          const nextRombelMeta = master.rombels.find(
            (r) => r.code.toUpperCase() === nextRombel.toUpperCase()
          );
          await prisma.student.update({
            where: { id: st.id },
            data: {
              rombel: nextRombel,
              ...(nextRombelMeta?.waliKelas
                ? { waliKelas: nextRombelMeta.waliKelas }
                : {}),
              hadirCount: 0,
              sakitCount: 0,
              izinCount: 0,
              terlambatCount: 0,
              alpaCount: 0,
              attendanceRate: "100%",
              komiteMonthsPaid: 0,
              pointsTotal: 100,
              pointsBonus: 0,
              pointsPredicate: "Sangat Baik",
              academicHistory: `${st.academicHistory} • ${opts.targetAcademicYear}: Kelas ${nextRombel}`,
            },
          });
        }
      } else {
        await prisma.student.update({
          where: { id: st.id },
          data: {
            hadirCount: 0,
            sakitCount: 0,
            izinCount: 0,
            terlambatCount: 0,
            alpaCount: 0,
            attendanceRate: "100%",
            komiteMonthsPaid: 0,
            pointsTotal: 100,
            pointsBonus: 0,
            pointsPredicate: "Sangat Baik",
          },
        });
      }
    }

    // Reset jurnal jadwal & perbarui masa SK tugas tambahan GTK ke tahun pelajaran baru
    await prisma.classSchedule.updateMany({
      data: { journalFilled: false, journalTopic: null, journalNotes: null },
    });
    await prisma.teacherAdditionalRole.updateMany({
      data: { academicYear: opts.targetAcademicYear },
    });
  } else {
    // Pergantian Semester (Ganjil <-> Genap dalam Tahun Ajaran yang sama):
    // Rombel tetap, saldo tabungan & komite tetap berlanjut, presensi & jurnal di-reset untuk semester baru
    const resetPoints = opts.resetSemesterPoints !== false;
    await prisma.student.updateMany({
      where: { status: "Aktif" },
      data: {
        hadirCount: 0,
        sakitCount: 0,
        izinCount: 0,
        terlambatCount: 0,
        alpaCount: 0,
        attendanceRate: "100%",
        ...(resetPoints
          ? { pointsTotal: 100, pointsBonus: 0, pointsPredicate: "Sangat Baik" }
          : {}),
      },
    });
    await prisma.classSchedule.updateMany({
      data: { journalFilled: false, journalTopic: null, journalNotes: null },
    });
  }

  // Simpan Snapshot Arsip Periode Akademik yang baru saja ditutup
  const archivePayload: Omit<AcademicPeriodArchive, "id"> = {
    academicYear: currentProfile.academicYear,
    semester: currentProfile.semester,
    curriculum: currentProfile.curriculum,
    transitionType,
    targetAcademicYear: opts.targetAcademicYear,
    targetSemester: opts.targetSemester,
    archivedAt: nowLabel(),
    archivedBy: actorIdentity(ctx),
    notes:
      opts.notes ||
      (isNewYear
        ? `Tutup buku Tahun Pelajaran ${currentProfile.academicYear} (${currentProfile.semester}) menuju TA ${opts.targetAcademicYear} (${opts.targetSemester}). ${graduatedCount} siswa lulus menjadi Alumni, ${promotedCount} siswa naik tingkat kelas.`
        : `Tutup buku Semester ${currentProfile.semester} menuju Semester ${opts.targetSemester} TA ${opts.targetAcademicYear}. Rombel siswa & saldo tabungan berlanjut; presensi semester baru di-reset.`),
    summary: {
      activeStudents: activeStudents.length,
      graduatedStudents: graduatedCount,
      promotedStudents: promotedCount,
      activeTeachers: activeTeachersCount,
      totalSchedules: schedulesCount,
      totalCounselingNotes: counselingCount,
      totalSavingsBalance: totalSavings,
      rombelBreakdown,
    },
  };

  const logRecord = await prisma.systemActivityLog.create({
    data: {
      actor: actorIdentity(ctx),
      roleBadge: actorBadge(ctx),
      actionText: JSON.stringify(archivePayload),
      timeLabel: nowLabel(),
      category: "academic_period_archive",
    },
  });

  // Perbarui tabel AcademicYear & profil resmi madrasah
  const newCurriculum = opts.targetCurriculum || currentProfile.curriculum;
  await prisma.academicYear.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
  await prisma.academicYear.create({
    data: {
      name: opts.targetAcademicYear,
      semester: opts.targetSemester,
      curriculum: newCurriculum,
      isActive: true,
    },
  });

  const updatedProfile: MadrasahProfileConfig = {
    ...currentProfile,
    academicYear: opts.targetAcademicYear,
    semester: opts.targetSemester,
    curriculum: newCurriculum,
  };
  await persistMadrasahProfile(
    updatedProfile,
    actorIdentity(ctx),
    actorBadge(ctx)
  );

  await writeAuditLog(
    ctx,
    `Transisi Periode Akademik (${transitionType === "NEW_ACADEMIC_YEAR" ? "Pergantian Tahun Pelajaran" : "Pergantian Semester"}): ${currentProfile.academicYear} ${currentProfile.semester} → ${opts.targetAcademicYear} ${opts.targetSemester}`,
    "security_audit"
  );

  return { id: logRecord.id, ...archivePayload };
}

// ===========================================================================
// GET
// ===========================================================================
export async function GET(req: NextRequest) {
  try {
    const resource = req.nextUrl.searchParams.get("resource") || "summary";

    // Profil madrasah bersifat publik (tampil di halaman depan)
    if (resource === "profile") {
      const profile = await getMadrasahProfile();
      return NextResponse.json({ ok: true, profile: deepNeutralize(profile) });
    }

  // 2. Ringkasan data: wajib login, isi disesuaikan dengan peran
    if (resource === "summary") {
      const ctx = await requireAuth();
      return NextResponse.json(await getScopedSummary(ctx));
    }

    if (resource === "master") {
      await requireAuth();
      const [academicMaster, academicArchives] = await Promise.all([
        getAcademicMaster(),
        getAcademicArchives(),
      ]);
      return NextResponse.json({
        ok: true,
        academicMaster: deepNeutralize(academicMaster),
        academicArchives: deepNeutralize(academicArchives),
      });
    }

    // Cek NISN publik: hanya informasi minimal (tanpa NIK/alamat/orang tua/saldo) + rate limit
    if (resource === "nisn") {
      enforceRateLimit("nisn_lookup", getClientIp(req), 20, 60 * 1000);
      const nisn = digitsOrNull(req.nextUrl.searchParams.get("nisn"), 5, 20);
      if (!nisn) return NextResponse.json({ ok: true, student: null });
      const s = await prisma.student.findUnique({
        where: { nisn },
        select: { nis: true, nisn: true, name: true, rombel: true, waliKelas: true, status: true },
      });
      const student = s
        ? deepNeutralize({
            nisn: s.nisn,
            nis: s.nis.length > 4 ? `${s.nis.slice(0, 2)}${"•".repeat(s.nis.length - 4)}${s.nis.slice(-2)}` : "••••",
            name: s.name,
            rombel: s.rombel,
            waliKelas: s.waliKelas,
            status: s.status,
          })
        : null;
      return NextResponse.json({ ok: true, student });
    }

    return NextResponse.json({ ok: false, error: "Resource tidak dikenal" }, { status: 400 });
  } catch (error) {
    return errorResponse(error, "Database query gagal");
  }
}

// ===========================================================================
// POST — setiap aksi WAJIB terdaftar di ACTION_PERMISSIONS (default deny)
// ===========================================================================
type ActionHandler = (
  payload: Record<string, unknown>,
  ctx: AuthContext | null
) => Promise<NextResponse>;

const ACTION_PERMISSIONS: Record<string, Permission | "PUBLIC"> = {
  SUBMIT_PPDB: "PUBLIC",
  SAVE_MADRASAH_PROFILE: can.admin,
  BULK_IMPORT_STUDENTS: can.staff,
  BULK_IMPORT_TEACHERS: can.staff,
  RESET_DUMMY_DATA: can.superAdminOnly,
  ADD_GTK_ROLE: can.admin,
  REMOVE_GTK_ROLE: can.admin,
  CREATE_STUDENT: can.staff,
  BATCH_PROMOTE_STUDENTS: can.staff,
  UPDATE_PPDB_SCORE_STATUS: can.ppdbPanel,
  MIGRATE_PPDB_TO_BUKU_INDUK: can.staff,
  CREATE_CMS_POST: can.staff,
  CREATE_CLASS_SCHEDULE: can.scheduleBuilder,
  CREATE_COUNSELING_NOTE: can.bkDesk,
  RECORD_TEACHER_ATTENDANCE: can.gtkOrStaff,
  RECORD_TEACHER_CHECKOUT: can.gtkOrStaff,
  SAVE_DAILY_DUTY_SCHEDULE: can.scheduleBuilder,
  OVERRIDE_DAILY_DUTY: can.scheduleBuilder,
  CREATE_PIKET_INCIDENT: can.scheduleBuilder,
  ADD_GRADE_LEVEL: can.staff,
  DELETE_GRADE_LEVEL: can.staff,
  ADD_ROMBEL: can.staff,
  DELETE_ROMBEL: can.staff,
  ADD_SUBJECT: can.staff,
  DELETE_SUBJECT: can.staff,
  TRANSITION_ACADEMIC_PERIOD: can.admin,
  PROCESS_SERVICE_REQUEST: can.staff,
  CREATE_MAIL_AGENDA: can.staff,
  UPDATE_STUDENT_BIODATA: can.staff,
};

const handlers: Record<string, ActionHandler> = {
  // 0. Simpan Identitas & Profil Resmi Madrasah
  async SAVE_MADRASAH_PROFILE(payload, ctx) {
    const current = await getMadrasahProfile();
    const p = payload;
    const coord = (v: unknown, field: string, fallback: string) => {
      if (v === undefined || v === null || v === "") return fallback;
      const s = String(v).trim();
      if (!/^-?\d{1,3}(\.\d{1,10})?$/.test(s)) throw new HttpError(400, `${field} tidak valid.`);
      return s;
    };
    const merged: MadrasahProfileConfig = {
      name: optText(p.name, 120, current.name),
      nsm: optText(p.nsm, 30, current.nsm),
      npsn: optText(p.npsn, 30, current.npsn),
      accreditation: optText(p.accreditation, 80, current.accreditation),
      academicYear: optText(p.academicYear, 20, current.academicYear),
      semester: optText(p.semester, 20, current.semester),
      curriculum: optText(p.curriculum, 120, current.curriculum),
      headmasterName: optText(p.headmasterName, 120, current.headmasterName),
      headmasterNip: optText(p.headmasterNip, 30, current.headmasterNip),
      tuHeadName: optText(p.tuHeadName, 120, current.tuHeadName),
      tuHeadNip: optText(p.tuHeadNip, 30, current.tuHeadNip),
      address: optText(p.address, 300, current.address),
      phone: optText(p.phone, 40, current.phone),
      email: optText(p.email, 120, current.email),
      gpsLat: coord(p.gpsLat, "Latitude GPS", current.gpsLat),
      gpsLng: coord(p.gpsLng, "Longitude GPS", current.gpsLng),
      gpsRadiusMeters: numberIn(p.gpsRadiusMeters, "Radius GPS", 10, 10000, current.gpsRadiusMeters),
      komiteBankInfo: optText(p.komiteBankInfo, 200, current.komiteBankInfo),
    };

    // Perubahan rekening Komite wajib verifikasi kata sandi Admin & dicatat di security_audit
    if (merged.komiteBankInfo !== current.komiteBankInfo) {
      const adminPassword = String(p.adminPassword || "");
      if (!adminPassword) {
        throw new HttpError(
          400,
          "Perubahan Rekening Bank Komite wajib disertai konfirmasi kata sandi akun Anda."
        );
      }
      const validPw = await bcrypt
        .compare(adminPassword, ctx!.user.passwordHash)
        .catch(() => false);
      if (!validPw) {
        throw new HttpError(
          401,
          "Kata sandi konfirmasi tidak sesuai. Perubahan Rekening Komite dibatalkan."
        );
      }
      await writeAuditLog(
        ctx!,
        `Rekening Komite diubah dari "${current.komiteBankInfo}" menjadi "${merged.komiteBankInfo}"`,
        "security_audit"
      );
    }

    // Jika Tahun Pelajaran atau Semester berubah lewat form Identitas Madrasah, otomatis arsipkan periode sebelumnya
    const periodChanged =
      merged.academicYear !== current.academicYear ||
      merged.semester !== current.semester;
    if (periodChanged) {
      await executeAcademicPeriodTransition(ctx!, {
        targetAcademicYear: merged.academicYear,
        targetSemester:
          merged.semester.toLowerCase() === "genap" ? "Genap" : "Ganjil",
        targetCurriculum: merged.curriculum,
        resetSemesterPoints: true,
        autoPromoteAndGraduate: merged.academicYear !== current.academicYear,
      });
    }

    await persistMadrasahProfile(merged, actorIdentity(ctx!), actorBadge(ctx!));
    await writeAuditLog(
      ctx!,
      `Memperbarui identitas resmi madrasah (${merged.name}, TA ${merged.academicYear} ${merged.semester})`
    );
    await prisma.academicYear.updateMany({
      where: { isActive: true },
      data: {
        name: merged.academicYear,
        semester: merged.semester,
        curriculum: merged.curriculum,
      },
    });
    return NextResponse.json({ ok: true, profile: deepNeutralize(merged) });
  },

  // 0B. Import Massal Siswa
  async BULK_IMPORT_STUDENTS(payload, ctx) {
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new HttpError(400, `Maksimal ${MAX_IMPORT_ROWS} baris per import.`);
    }
    const defaultPw = await bcrypt.hash(DEFAULT_IMPORT_PASSWORD, 10);
    let importedCount = 0;
    const skipped: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = (rows[i] && typeof rows[i] === "object" ? rows[i] : {}) as Record<string, unknown>;
      const rowNo = i + 2; // baris 1 = header Excel
      const nis = digitsOrNull(r.nis, 4, 20);
      const nisn = digitsOrNull(r.nisn, 5, 20);
      const name = optText(r.name, 120);
      if (!nis || !nisn || !name) {
        skipped.push(`Baris ${rowNo}: NIS/NISN/Nama kosong atau tidak valid`);
        continue;
      }
      const nikRaw = String(r.nik ?? "").trim();
      const nik = nikRaw ? digitsOrNull(nikRaw, 16, 16) : "3204120000000000";
      if (!nik) {
        skipped.push(`Baris ${rowNo}: NIK harus 16 digit`);
        continue;
      }

      // Jangan menimpa akun milik peran lain (mis. Admin/Guru) yang identifier-nya sama
      const existingUser = await prisma.user.findUnique({ where: { identifier: nisn } });
      if (existingUser && existingUser.baseRole !== "SISWA") {
        skipped.push(`Baris ${rowNo}: NISN ${nisn} sudah dipakai akun non-siswa`);
        continue;
      }

      const u = existingUser
        ? await prisma.user.update({ where: { id: existingUser.id }, data: { name } })
        : await prisma.user.create({
            data: { identifier: nisn, name, passwordHash: defaultPw, baseRole: "SISWA" },
          });

      const data = {
        nis,
        name,
        nik,
        ttl: optText(r.ttl, 120, "-"),
        gender: normalizeStudentGender(r.gender),
        rombel: optText(r.rombel, 20, "VII-A"),
        fatherName: optText(r.fatherName, 120, "-"),
        motherName: optText(r.motherName, 120, "-"),
        parentPhone: optText(r.parentPhone, 30, "-"),
        address: optText(r.address, 300, "-"),
        prevSchool: optText(r.prevSchool, 120, "-"),
        waliKelas: optText(r.waliKelas, 120, "-"),
        status: "Aktif",
      };

      try {
        await prisma.student.upsert({
          where: { nisn },
          update: data,
          create: {
            ...data,
            userId: u.id,
            nisn,
            academicHistory: `Tahun Ajaran Aktif: Kelas ${data.rombel} (Impor EMIS)`,
          },
        });
        importedCount++;
      } catch {
        skipped.push(`Baris ${rowNo}: NIS ${nis} bentrok dengan siswa lain`);
      }
    }

    await writeAuditLog(
      ctx!,
      `Import massal Excel Buku Induk Siswa: ${importedCount} berhasil, ${skipped.length} dilewati`
    );
    return NextResponse.json({ ok: true, importedCount, skippedCount: skipped.length, skipped: skipped.slice(0, 50) });
  },

  // 0C. Import Massal Guru / GTK
  async BULK_IMPORT_TEACHERS(payload, ctx) {
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new HttpError(400, `Maksimal ${MAX_IMPORT_ROWS} baris per import.`);
    }
    const defaultPw = await bcrypt.hash(DEFAULT_IMPORT_PASSWORD, 10);
    let importedCount = 0;
    const skipped: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = (rows[i] && typeof rows[i] === "object" ? rows[i] : {}) as Record<string, unknown>;
      const rowNo = i + 2;
      const nip = digitsOrNull(r.nip, 5, 20);
      const name = optText(r.name, 120);
      const subject = optText(r.subject, 120, "Guru Mata Pelajaran");
      if (!nip || !name) {
        skipped.push(`Baris ${rowNo}: NIP/Nama kosong atau tidak valid`);
        continue;
      }

      const existingUser = await prisma.user.findUnique({ where: { identifier: nip } });
      if (existingUser && existingUser.baseRole !== "GTK") {
        skipped.push(`Baris ${rowNo}: NIP ${nip} sudah dipakai akun non-GTK`);
        continue;
      }
      const u = existingUser
        ? await prisma.user.update({ where: { id: existingUser.id }, data: { name } })
        : await prisma.user.create({
            data: { identifier: nip, name, passwordHash: defaultPw, baseRole: "GTK" },
          });

      const tp = await prisma.teacherProfile.upsert({
        where: { nip },
        update: { subject },
        create: { userId: u.id, nip, subject },
      });

      const roleType = optText(r.additionalRole, 80);
      if (roleType) {
        // Hanya Super Admin yang boleh menetapkan Kepala Madrasah (mencegah eskalasi hak akses)
        if (isKepalaMadrasahRole(roleType) && ctx!.baseRole !== "ADMIN") {
          skipped.push(`Baris ${rowNo}: tugas "Kepala Madrasah" hanya dapat ditetapkan oleh Super Admin`);
        } else {
          await prisma.teacherAdditionalRole.create({
            data: {
              teacherId: tp.id,
              type: roleType,
              detail: optText(r.roleDetail, 120, "SK Tahun Ajaran Aktif"),
            },
          });
          if (isKepalaMadrasahRole(roleType)) {
            const currentProfile = await getMadrasahProfile();
            await persistMadrasahProfile(
              { ...currentProfile, headmasterName: name, headmasterNip: nip },
              ctx!.user.name,
              actorBadge(ctx!)
            );
          }
        }
      }
      importedCount++;
    }

    await writeAuditLog(
      ctx!,
      `Import massal Excel Guru/GTK: ${importedCount} berhasil, ${skipped.length} dilewati`
    );
    return NextResponse.json({ ok: true, importedCount, skippedCount: skipped.length, skipped: skipped.slice(0, 50) });
  },

  // 0D. Reset Data Dummy — hanya Super Admin + konfirmasi di server
  async RESET_DUMMY_DATA(payload, ctx) {
    if (payload.confirm !== "SIAP-GOLIVE") {
      throw new HttpError(400, "Konfirmasi tidak valid. Ketik SIAP-GOLIVE untuk melanjutkan.");
    }
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
        where: { category: { notIn: ["madrasah_profile", "security_audit"] } },
      }),
    ]);
    await writeAuditLog(ctx!, "RESET_DUMMY_DATA dijalankan", "security_audit");
    return NextResponse.json({
      ok: true,
      message:
        "Seluruh data operasional/contoh berhasil dibersihkan. Data riil Guru, Siswa, dan Identitas Resmi Madrasah tetap dipertahankan.",
    });
  },

  // 1. Tambah Tugas Tambahan GTK
  async ADD_GTK_ROLE(payload, ctx) {
    const nip = digits(payload.nip, "NIP", 5, 20);
    const type = reqText(payload.type, "Jenis tugas", 80);
    const detail = optText(payload.detail, 120, "SK Tahun Ajaran Aktif");
    const skNumber = optText(payload.skNumber, 80, "SK-024/MTs.NF/2026");

    if (isKepalaMadrasahRole(type) && ctx!.baseRole !== "ADMIN") {
      throw new HttpError(403, "Tugas Kepala Madrasah hanya dapat ditetapkan oleh Super Admin.");
    }

    const teacher = await prisma.teacherProfile.findUnique({
      where: { nip },
      include: { user: { select: { name: true } } },
    });
    if (!teacher) throw new HttpError(404, "GTK tidak ditemukan");

    const created = await prisma.teacherAdditionalRole.create({
      data: { teacherId: teacher.id, type, detail, skNumber },
    });

    if (isKepalaMadrasahRole(type)) {
      const currentProfile = await getMadrasahProfile();
      await persistMadrasahProfile(
        {
          ...currentProfile,
          headmasterName: teacher.user?.name || currentProfile.headmasterName,
          headmasterNip: teacher.nip || currentProfile.headmasterNip,
        },
        actorIdentity(ctx!),
        actorBadge(ctx!)
      );
    }
    await writeAuditLog(
      ctx!,
      `Menetapkan tugas tambahan "${type} (${detail})" kepada ${teacher.user?.name || nip}`
    );
    return NextResponse.json({ ok: true, data: deepNeutralize(created) });
  },

  // 2. Hapus Tugas Tambahan GTK
  async REMOVE_GTK_ROLE(payload, ctx) {
    const roleId = codeId(payload.roleId, "ID tugas");
    const role = await prisma.teacherAdditionalRole.findUnique({ where: { id: roleId } });
    if (!role) return NextResponse.json({ ok: true });
    if (isKepalaMadrasahRole(role.type) && ctx!.baseRole !== "ADMIN") {
      throw new HttpError(403, "Tugas Kepala Madrasah hanya dapat dicabut oleh Super Admin.");
    }
    await prisma.teacherAdditionalRole.delete({ where: { id: roleId } });
    await writeAuditLog(ctx!, `Mencabut tugas tambahan "${role.type} (${role.detail})"`);
    return NextResponse.json({ ok: true });
  },

  // 3. Tambah Siswa Baru ke Buku Induk
  async CREATE_STUDENT(payload, ctx) {
    const rombel = optText(payload.rombel, 20, "VII-A");
    const nikRaw = String(payload.nik ?? "").trim();
    const created = await prisma.student.create({
      data: {
        nis: digits(payload.nis, "NIS", 4, 20),
        nisn: digits(payload.nisn, "NISN", 5, 20),
        nik: nikRaw ? digits(nikRaw, "NIK", 16, 16) : "3204120000000001",
        name: reqText(payload.name, "Nama siswa", 120),
        ttl: optText(payload.ttl, 120, "-"),
        gender: normalizeStudentGender(payload.gender),
        fatherName: optText(payload.fatherName, 120, "-"),
        motherName: optText(payload.motherName, 120, "-"),
        address: optText(payload.address, 300, "-"),
        prevSchool: optText(payload.prevSchool, 120, "-"),
        rombel,
        waliKelas: optText(payload.waliKelas, 120, "-"),
        status: oneOf(payload.status, STUDENT_STATUSES, "Status", "Aktif"),
        academicHistory: `2026/2027: Kelas ${rombel}`,
        r2KkUrl: r2KeyOrNull(payload.r2KkUrl),
        r2AktaUrl: r2KeyOrNull(payload.r2AktaUrl),
        r2IjazahUrl: r2KeyOrNull(payload.r2IjazahUrl),
        r2FotoUrl: r2KeyOrNull(payload.r2FotoUrl),
      },
    });
    await writeAuditLog(
      ctx!,
      `Menambahkan siswa baru ke Buku Induk: ${created.name} (NIS ${created.nis}, Rombel ${rombel})`
    );
    return NextResponse.json({ ok: true, data: deepNeutralize(created) });
  },

  // 4. Kenaikan Kelas Massal
  async BATCH_PROMOTE_STUDENTS(payload, ctx) {
    const fromRombel = reqText(payload.fromRombel, "Rombel asal", 20);
    const toRombel = reqText(payload.toRombel, "Rombel tujuan", 20);
    const isGraduating = toRombel === "LULUS_ALUMNI";
    const students = await prisma.student.findMany({
      where: { rombel: fromRombel, status: "Aktif" },
    });
    await prisma.$transaction(
      students.map((s) =>
        prisma.student.update({
          where: { id: s.id },
          data: {
            rombel: isGraduating ? s.rombel : toRombel,
            status: isGraduating ? "Lulus / Alumni" : "Aktif",
            academicHistory: isGraduating
              ? `${s.academicHistory} • Lulus Tahun 2027`
              : `${s.academicHistory} • Naik ke ${toRombel}`,
          },
        })
      )
    );
    await writeAuditLog(
      ctx!,
      `Kenaikan kelas massal: ${students.length} siswa dari Rombel ${fromRombel} ke ${toRombel}`
    );
    return NextResponse.json({ ok: true, count: students.length });
  },

  // 5. Pendaftaran PPDB Online (PUBLIK) — hanya membuat pendaftaran baru
  async SUBMIT_PPDB(payload) {
    const nisn = digits(payload.nisn, "NISN", 10, 10);
    const existing = await prisma.ppdbApplicant.findUnique({
      where: { nisn },
      select: { id: true },
    });
    if (existing) {
      throw new HttpError(
        409,
        "NISN ini sudah terdaftar. Untuk revisi data/berkas, silakan hubungi Panitia PPDB."
      );
    }

    const birthDateRaw = String(payload.birthDate ?? "").trim();
    const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw) ? birthDateRaw : "-";
    const avgRaw = String(payload.avgScore ?? "").trim();
    const avgScore = /^\d{1,3}(\.\d{1,2})?$/.test(avgRaw) && Number(avgRaw) <= 100 ? avgRaw : "0";
    const phoneRaw = String(payload.parentPhone ?? "").trim();
    const parentPhone = /^\+?[0-9\s-]{8,20}$/.test(phoneRaw) ? phoneRaw : "-";
    const ppdbKey = /^ppdb[A-Za-z0-9._-]*\//;

    // Nomor registrasi dibuat di server (bukan dari klien)
    const year = new Date().getFullYear() + 1;
    let regNo = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `PPDB-${year}-${randomInt(100000, 999999)}`;
      const clash = await prisma.ppdbApplicant.findUnique({
        where: { regNo: candidate },
        select: { id: true },
      });
      if (!clash) {
        regNo = candidate;
        break;
      }
    }
    if (!regNo) throw new HttpError(503, "Gagal membuat nomor registrasi, coba lagi.");

    const created = await prisma.ppdbApplicant.create({
      data: {
        regNo,
        submittedAt: nowLabel(),
        track: oneOf(payload.track, PPDB_TRACKS, "Jalur", "REGULER"),
        fullName: reqText(payload.fullName, "Nama lengkap", 120),
        nisn,
        nik: digits(payload.nik, "NIK", 16, 16),
        birthPlace: optText(payload.birthPlace, 80, "-"),
        birthDate,
        gender: normalizeStudentGender(payload.gender) === "Perempuan" ? "PEREMPUAN" : "LAKI-LAKI",
        previousSchool: optText(payload.previousSchool, 120, "-"),
        avgScore,
        fatherName: optText(payload.fatherName, 120, "-"),
        motherName: optText(payload.motherName, 120, "-"),
        parentPhone,
        parentOccupation: optText(payload.parentOccupation, 80, "-"),
        address: optText(payload.address, 300, "-"),
        status: "MENUNGGU_VERIFIKASI",
        docKkUrl: r2KeyOrNull(payload.docKkUrl, ppdbKey),
        docAktaUrl: r2KeyOrNull(payload.docAktaUrl, ppdbKey),
        docSklUrl: r2KeyOrNull(payload.docSklUrl, ppdbKey),
        docFotoUrl: r2KeyOrNull(payload.docFotoUrl, ppdbKey),
        docExtraName: optText(payload.docExtraName, 120) || null,
        docExtraUrl: r2KeyOrNull(payload.docExtraUrl, ppdbKey),
      },
      select: { regNo: true, status: true, submittedAt: true },
    });
    // Pendaftar publik hanya menerima nomor registrasi & status (bukan seluruh record)
    return NextResponse.json({ ok: true, data: created });
  },

  // 6. Input Nilai Seleksi & Update Status PPDB
  async UPDATE_PPDB_SCORE_STATUS(payload, ctx) {
    const regNo = codeId(payload.regNo, "Nomor registrasi", 40);
    const hasScores = payload.scoreBtq !== undefined;
    const btq = hasScores ? numberIn(payload.scoreBtq, "Nilai BTQ", 0, 100) : 0;
    const acad = hasScores ? numberIn(payload.scoreAcademic, "Nilai akademik", 0, 100, 0) : 0;
    const intv = hasScores ? numberIn(payload.scoreInterview, "Nilai wawancara", 0, 100, 0) : 0;
    const finalScore = Number((btq * 0.4 + acad * 0.35 + intv * 0.25).toFixed(2));

    const status = payload.status ? oneOf(payload.status, PPDB_STATUSES, "Status PPDB") : undefined;
    if (status === "SUDAH_MIGRASI") {
      throw new HttpError(400, "Status SUDAH_MIGRASI hanya diatur melalui proses migrasi.");
    }
    const verificationNotes = optText(payload.verificationNotes, 500);
    const targetClassroom = optText(payload.targetClassroom, 20);

    const updated = await prisma.ppdbApplicant.update({
      where: { regNo },
      data: {
        ...(hasScores
          ? {
              scoreBtq: Math.round(btq),
              scoreAcademic: Math.round(acad),
              scoreInterview: Math.round(intv),
              finalScore,
            }
          : {}),
        ...(status ? { status } : {}),
        ...(verificationNotes ? { verificationNotes } : {}),
        ...(targetClassroom ? { targetClassroom } : {}),
      },
    });
    await writeAuditLog(
      ctx!,
      `Memperbarui seleksi PPDB ${regNo} (${updated.fullName}): skor akhir ${updated.finalScore}, status ${updated.status}`
    );
    return NextResponse.json({ ok: true, data: deepNeutralize(updated) });
  },

  // 7. Migrasi PPDB ke Buku Induk Siswa (dengan penomoran NIS berurutan bebas bentrok)
  async MIGRATE_PPDB_TO_BUKU_INDUK(payload, ctx) {
    const regNo = codeId(payload.regNo, "Nomor registrasi", 40);
    const app = await prisma.ppdbApplicant.findUnique({ where: { regNo } });
    if (!app) throw new HttpError(404, "Pendaftar tidak ditemukan");

    const issuedNis = payload.issuedNis ? digits(payload.issuedNis, "NIS", 4, 20) : "";
    const nisFinal = issuedNis || (await generateNextStudentNis("262707"));
    const rombelFinal = optText(payload.targetRombel, 20) || app.targetClassroom || "VII-A";

    const student = await prisma.student.upsert({
      where: { nisn: app.nisn },
      update: { rombel: rombelFinal, status: "Aktif" },
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
        waliKelas: "-",
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
      data: { status: "SUDAH_MIGRASI", nisIssued: student.nis },
    });

    await writeAuditLog(
      ctx!,
      `Migrasi PPDB ${app.regNo} (${app.fullName}) ke Buku Induk Siswa Rombel ${rombelFinal} dengan NIS ${student.nis}`
    );

    return NextResponse.json({ ok: true, student: deepNeutralize(student) });
  },

  // 8. Buat Artikel CMS Halaman Publik
  async CREATE_CMS_POST(payload, ctx) {
    const title = reqText(payload.title, "Judul", 200);
    const slugBase =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80) || "berita";
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const excerpt = optText(payload.excerpt, 500);

    const created = await prisma.cmsPost.create({
      data: {
        title,
        slug,
        category: optText(payload.category, 50, "Pengumuman"),
        excerpt,
        content: optText(payload.content, 20000) || excerpt,
        author: optText(payload.author, 120) || ctx!.user.name,
        dateLabel: new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Jakarta",
        }),
        r2ThumbUrl: r2KeyOrNull(payload.r2ThumbUrl),
        status: oneOf(payload.status, CMS_STATUSES, "Status", "Published"),
      },
    });
    await writeAuditLog(ctx!, `Membuat artikel CMS "${title}" (${created.status})`);
    return NextResponse.json({ ok: true, data: deepNeutralize(created) });
  },

  // 9. Penyusunan Jadwal Pelajaran dengan Deteksi Bentrok di Server
  async CREATE_CLASS_SCHEDULE(payload, ctx) {
    const day = reqText(payload.day, "Hari", 20);
    const timeSlot = reqText(payload.timeSlot, "Jam pelajaran", 60);
    const classroom = reqText(payload.classroom, "Rombel / Kelas", 20);
    const subject = reqText(payload.subject, "Mata pelajaran", 80);
    const teacherName = reqText(payload.teacherName, "Nama guru", 120);

    const conflict = await prisma.classSchedule.findFirst({
      where: {
        day,
        timeSlot,
        OR: [{ classroom }, { teacherName }],
      },
    });
    if (conflict) {
      throw new HttpError(
        409,
        `Jadwal bentrok di server: ${conflict.teacherName} / Kelas ${conflict.classroom} sudah terjadwal pada ${conflict.day} ${conflict.timeSlot}.`
      );
    }

    const created = await prisma.classSchedule.create({
      data: {
        day,
        timeSlot,
        classroom,
        room: `R. Kelas ${classroom}`,
        subject,
        teacherName,
        isToday: true,
      },
    });
    await writeAuditLog(
      ctx!,
      `Menambahkan jadwal ${subject} (${classroom}) — ${teacherName} pada ${day} ${timeSlot}`
    );
    return NextResponse.json({ ok: true, data: deepNeutralize(created) });
  },

  // 10. Pencatatan Bimbingan Konseling (BK) & Sinkronisasi Poin Siswa di Server
  async CREATE_COUNSELING_NOTE(payload, ctx) {
    const studentLabel = reqText(payload.student, "Nama siswa", 140);
    const category = reqText(payload.category, "Kategori BK", 80);
    const note = reqText(payload.note, "Catatan pembinaan", 1000);
    const rawPoints = numberIn(payload.points, "Poin", -100, 100, 0);
    const isNegative = category.toLowerCase().includes("pelanggaran");
    const pointDelta = isNegative ? -Math.abs(rawPoints) : Math.abs(rawPoints);

    const cleanName = studentLabel.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const matchedStudent = await prisma.student.findFirst({
      where: { name: cleanName },
    });

    const classroom = matchedStudent?.rombel || optText(payload.classroom, 20, "VII-A");

    const created = await prisma.counselingNote.create({
      data: {
        studentId: matchedStudent?.id || null,
        studentName: matchedStudent?.name || cleanName,
        classroom,
        dateLabel: new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Jakarta",
        }),
        counselor: ctx!.user.name,
        category,
        pointDelta,
        note,
      },
    });

    if (matchedStudent) {
      const newTotal = Math.max(0, (matchedStudent.pointsTotal || 100) + pointDelta);
      const newBonus = (matchedStudent.pointsBonus || 0) + pointDelta;
      const predicate =
        newTotal >= 110
          ? "Teladan"
          : newTotal >= 95
            ? "Sangat Baik"
            : newTotal >= 80
              ? "Baik"
              : "Perlu Pembinaan";
      await prisma.student.update({
        where: { id: matchedStudent.id },
        data: {
          pointsTotal: newTotal,
          pointsBonus: newBonus,
          pointsPredicate: predicate,
        },
      });
    }

    await writeAuditLog(
      ctx!,
      `Mencatat BK ${category} (${pointDelta >= 0 ? "+" + pointDelta : pointDelta} poin) untuk ${created.studentName}`
    );
    return NextResponse.json({ ok: true, data: deepNeutralize(created) });
  },

  // 11. Presensi Guru dengan Validasi Geofencing (Haversine) di Server
  async RECORD_TEACHER_ATTENDANCE(payload, ctx) {
    const status = oneOf(
      payload.status,
      ["Hadir", "Sakit", "Izin", "Dinas Luar"] as const,
      "Status kehadiran",
      "Hadir"
    );
    const profile = await getMadrasahProfile();
    const todayDateLabel = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });

    // Cek apakah guru sudah check-in pada tanggal hari ini (cegah duplikasi check-in)
    const existingToday = await prisma.teacherAttendance.findFirst({
      where: {
        teacherName: ctx!.user.name,
        dateLabel: todayDateLabel,
      },
    });
    if (existingToday) {
      throw new HttpError(
        409,
        `Anda sudah tercatat melakukan presensi hari ini (${existingToday.status} pukul ${existingToday.checkInTime || "-"}).`
      );
    }

    let gpsDistanceLabel = "Divalidasi Server";
    let distanceMeters: number | null = null;

    if (status === "Hadir") {
      if (payload.lat === undefined || payload.lng === undefined) {
        throw new HttpError(
          400,
          "Koordinat GPS wajib dikirim untuk melakukan Check-In Hadir."
        );
      }
      const lat = numberIn(payload.lat, "Latitude", -90, 90);
      const lng = numberIn(payload.lng, "Longitude", -180, 180);
      const centerLat = Number(profile.gpsLat);
      const centerLng = Number(profile.gpsLng);
      const maxRadius = Number(profile.gpsRadiusMeters) || 100;

      if (Number.isFinite(centerLat) && Number.isFinite(centerLng)) {
        const dist = haversineMeters(lat, lng, centerLat, centerLng);
        distanceMeters = dist;
        // Toleransi akurasi GPS perangkat +50m
        if (dist > maxRadius + 50) {
          throw new HttpError(
            400,
            `Presensi ditolak server: lokasi Anda berjarak ${dist}m dari titik ${profile.name} (batas radius ${maxRadius}m).`
          );
        }
        gpsDistanceLabel = `${lat.toFixed(6)}, ${lng.toFixed(6)} (Radius ${dist}m dari ${profile.name})`;
      }
    }

    const checkInTime =
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }) + " WIB";

    const created = await prisma.teacherAttendance.create({
      data: {
        teacherId: ctx!.user.teacherProfile?.id || null,
        teacherName: ctx!.user.name,
        dateLabel: todayDateLabel,
        checkInTime,
        gpsDistance: gpsDistanceLabel,
        status,
        leaveReason: optText(payload.leaveReason, 300) || null,
        r2FileKey: r2KeyOrNull(payload.r2FileKey),
      },
    });

    await writeAuditLog(ctx!, `Presensi GTK: ${status} (${gpsDistanceLabel})`);
    return NextResponse.json({
      ok: true,
      distanceMeters,
      data: deepNeutralize(created),
    });
  },

  // 11B. Check-Out (Jam Pulang) Guru
  async RECORD_TEACHER_CHECKOUT(payload, ctx) {
    const todayDateLabel = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
    const record = await prisma.teacherAttendance.findFirst({
      where: {
        teacherName: ctx!.user.name,
        dateLabel: todayDateLabel,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!record) {
      throw new HttpError(404, "Belum ada catatan Check-In hari ini.");
    }
    const checkOutTime =
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }) + " WIB";

    const updated = await prisma.teacherAttendance.update({
      where: { id: record.id },
      data: { checkOutTime },
    });
    await writeAuditLog(ctx!, `Check-Out GTK pukul ${checkOutTime}`);
    return NextResponse.json({ ok: true, data: deepNeutralize(updated) });
  },

  // 11C. Manajemen Jadwal Guru Piket Mingguan
  async SAVE_DAILY_DUTY_SCHEDULE(payload, ctx) {
    const day = oneOf(
      payload.day,
      ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const,
      "Hari piket"
    );
    const shift = optText(
      payload.shift,
      80,
      "Piket Pagi (06.45 – 11.00)"
    );
    const teacherName = reqText(payload.teacherName, "Nama guru piket", 120);
    const teacher = await prisma.teacherProfile.findFirst({
      where: { user: { name: teacherName } },
      select: { id: true, nip: true },
    });

    const created = await prisma.dailyDutySchedule.create({
      data: {
        day,
        shift,
        originalTeacherId: teacher?.id || null,
        originalTeacherName: teacherName,
        originalTeacherNip: teacher?.nip || "-",
        dateLabel: nowLabel(),
      },
    });
    await writeAuditLog(
      ctx!,
      `Menambahkan jadwal Guru Piket: ${teacherName} (${day} • ${shift})`
    );
    return NextResponse.json({ ok: true, data: deepNeutralize(created) });
  },

  // 11D. Override / Penggantian Guru Piket Harian
  async OVERRIDE_DAILY_DUTY(payload, ctx) {
    const id = codeId(payload.id, "ID jadwal piket", 64);
    const overrideTeacherName = reqText(
      payload.overrideTeacherName,
      "Guru piket pengganti",
      120
    );
    const overrideReason = optText(
      payload.overrideReason,
      200,
      "Penyesuaian Tugas Piket"
    );
    const teacher = await prisma.teacherProfile.findFirst({
      where: { user: { name: overrideTeacherName } },
      select: { id: true, nip: true },
    });

    const updated = await prisma.dailyDutySchedule.update({
      where: { id },
      data: {
        isOverridden: true,
        overrideTeacherId: teacher?.id || null,
        overrideTeacherName,
        overrideTeacherNip: teacher?.nip || "-",
        overrideReason,
      },
    });
    await writeAuditLog(
      ctx!,
      `Override Guru Piket (${updated.day}): ${updated.originalTeacherName} digantikan oleh ${overrideTeacherName} (${overrideReason})`
    );
    return NextResponse.json({ ok: true, data: deepNeutralize(updated) });
  },

  // 11E. Log Kejadian Piket Harian (Terlambat, Izin Pulang, Sakit UKS)
  async CREATE_PIKET_INCIDENT(payload, ctx) {
    const studentName = reqText(payload.studentName, "Nama siswa", 120);
    const classroom = reqText(payload.classroom, "Kelas / Rombel", 20);
    const incidentType = oneOf(
      payload.incidentType,
      ["Terlambat Masuk", "Izin Pulang Mendadak", "Sakit di UKS"] as const,
      "Jenis kejadian"
    );
    const reason = reqText(payload.reason, "Keterangan kejadian", 300);
    const timeLabel =
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }) + " WIB";

    const created = await prisma.piketIncidentLog.create({
      data: {
        timeLabel,
        studentName,
        classroom,
        incidentType,
        reason,
        recordedBy: ctx!.user.name,
      },
    });
    await writeAuditLog(
      ctx!,
      `Log Piket: ${studentName} (${classroom}) — ${incidentType}: ${reason}`
    );
    return NextResponse.json({ ok: true, data: deepNeutralize(created) });
  },

  // 12. Tambah / Update Tingkat Kelas (Master Akademik)
  async ADD_GRADE_LEVEL(payload, ctx) {
    const code = codeId(payload.code, "Kode tingkat kelas", 12).toUpperCase();
    const label = reqText(payload.label, "Nama tingkat kelas", 80);
    const phase = optText(
      payload.phase,
      100,
      "Fase D — Kurikulum Merdeka & KMA 450"
    );
    const isFinalGrade = Boolean(payload.isFinalGrade);

    const master = await getAcademicMaster();
    const idx = master.gradeLevels.findIndex(
      (g) => g.code.toUpperCase() === code
    );
    const item = { code, label, phase, isFinalGrade };
    if (idx >= 0) {
      master.gradeLevels[idx] = item;
    } else {
      master.gradeLevels.push(item);
    }
    await persistAcademicMaster(master, actorIdentity(ctx!), actorBadge(ctx!));
    await writeAuditLog(ctx!, `Menyimpan Tingkat Kelas Master: ${code} (${label})`);
    return NextResponse.json({ ok: true, academicMaster: deepNeutralize(master) });
  },

  async DELETE_GRADE_LEVEL(payload, ctx) {
    const code = codeId(payload.code, "Kode tingkat kelas", 12).toUpperCase();
    const master = await getAcademicMaster();
    master.gradeLevels = master.gradeLevels.filter(
      (g) => g.code.toUpperCase() !== code
    );
    await persistAcademicMaster(master, actorIdentity(ctx!), actorBadge(ctx!));
    await writeAuditLog(ctx!, `Menghapus Tingkat Kelas Master: ${code}`);
    return NextResponse.json({ ok: true, academicMaster: deepNeutralize(master) });
  },

  // 13. Tambah / Update Rombongan Belajar (Rombel)
  async ADD_ROMBEL(payload, ctx) {
    const code = codeId(payload.code, "Kode rombel", 16).toUpperCase();
    const name = optText(payload.name, 60, `Kelas ${code}`);
    const gradeCode = optText(
      payload.gradeCode,
      12,
      inferGradeCodeFromRombel(code)
    ).toUpperCase();
    const waliKelas = optText(payload.waliKelas, 120, "-");
    const room = optText(payload.room, 60, `R. Kelas ${code}`);
    const quota = numberIn(payload.quota, "Kuota rombel", 1, 60, 32);

    const master = await getAcademicMaster();
    const idx = master.rombels.findIndex((r) => r.code.toUpperCase() === code);
    const item = { code, name, gradeCode, waliKelas, room, quota };
    if (idx >= 0) {
      master.rombels[idx] = item;
    } else {
      master.rombels.push(item);
    }

    // Jika waliKelas diisi, sinkronkan ke siswa aktif di rombel tersebut
    if (waliKelas && waliKelas !== "-") {
      await prisma.student
        .updateMany({
          where: { rombel: code, status: "Aktif" },
          data: { waliKelas },
        })
        .catch(() => null);
    }

    await persistAcademicMaster(master, actorIdentity(ctx!), actorBadge(ctx!));
    await writeAuditLog(
      ctx!,
      `Menyimpan Rombel Master: ${code} (Tingkat ${gradeCode}, Wali Kelas: ${waliKelas})`
    );
    return NextResponse.json({ ok: true, academicMaster: deepNeutralize(master) });
  },

  async DELETE_ROMBEL(payload, ctx) {
    const code = codeId(payload.code, "Kode rombel", 16).toUpperCase();
    const master = await getAcademicMaster();
    master.rombels = master.rombels.filter(
      (r) => r.code.toUpperCase() !== code
    );
    await persistAcademicMaster(master, actorIdentity(ctx!), actorBadge(ctx!));
    await writeAuditLog(ctx!, `Menghapus Rombel Master: ${code}`);
    return NextResponse.json({ ok: true, academicMaster: deepNeutralize(master) });
  },

  // 14. Tambah / Update Mata Pelajaran Referensi
  async ADD_SUBJECT(payload, ctx) {
    const name = reqText(payload.name, "Nama mata pelajaran", 100);
    const rawCode = String(payload.code || "").trim();
    const code = rawCode
      ? codeId(rawCode, "Kode mata pelajaran", 20).toUpperCase()
      : `MP-${name
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 5)
          .toUpperCase()}`;
    const group = optText(
      payload.group,
      80,
      "Umum (Kurikulum Merdeka)"
    );
    const jpPerWeek = numberIn(payload.jpPerWeek, "Alokasi JP/pekan", 1, 24, 2);

    const master = await getAcademicMaster();
    const idx = master.subjects.findIndex(
      (s) =>
        s.code.toUpperCase() === code ||
        s.name.toLowerCase() === name.toLowerCase()
    );
    const item = { code, name, group, jpPerWeek };
    if (idx >= 0) {
      master.subjects[idx] = item;
    } else {
      master.subjects.push(item);
    }

    await persistAcademicMaster(master, actorIdentity(ctx!), actorBadge(ctx!));
    await writeAuditLog(
      ctx!,
      `Menyimpan Mata Pelajaran Master: ${name} (${code} • ${group})`
    );
    return NextResponse.json({ ok: true, academicMaster: deepNeutralize(master) });
  },

  async DELETE_SUBJECT(payload, ctx) {
    const code = codeId(payload.code, "Kode mata pelajaran", 24).toUpperCase();
    const master = await getAcademicMaster();
    master.subjects = master.subjects.filter(
      (s) => s.code.toUpperCase() !== code
    );
    await persistAcademicMaster(master, actorIdentity(ctx!), actorBadge(ctx!));
    await writeAuditLog(ctx!, `Menghapus Mata Pelajaran Master: ${code}`);
    return NextResponse.json({ ok: true, academicMaster: deepNeutralize(master) });
  },

  // 15. Transisi & Pengarsipan Semester / Tahun Pelajaran Aktif
  async TRANSITION_ACADEMIC_PERIOD(payload, ctx) {
    const targetAcademicYear = reqText(
      payload.targetAcademicYear,
      "Tahun Pelajaran Tujuan",
      20
    );
    if (!/^\d{4}\/\d{4}$/.test(targetAcademicYear)) {
      throw new HttpError(
        400,
        "Format Tahun Pelajaran harus YYYY/YYYY (contoh: 2026/2027 atau 2027/2028)."
      );
    }
    const targetSemester = oneOf(
      payload.targetSemester,
      ["Ganjil", "Genap"] as const,
      "Semester Tujuan",
      "Ganjil"
    );
    const targetCurriculum = optText(payload.targetCurriculum, 120);
    const notes = optText(payload.notes, 500);

    const archive = await executeAcademicPeriodTransition(ctx!, {
      targetAcademicYear,
      targetSemester,
      targetCurriculum: targetCurriculum || undefined,
      resetSemesterPoints: payload.resetSemesterPoints !== false,
      autoPromoteAndGraduate: payload.autoPromoteAndGraduate !== false,
      notes: notes || undefined,
    });

    const [profile, archives] = await Promise.all([
      getMadrasahProfile(),
      getAcademicArchives(),
    ]);

    return NextResponse.json({
      ok: true,
      archive: deepNeutralize(archive),
      profile: deepNeutralize(profile),
      academicArchives: deepNeutralize(archives),
    });
  },

  // 16. Proses Layanan Persuratan & Koreksi Data Buku Induk (TU & Super Admin)
  async PROCESS_SERVICE_REQUEST(payload, ctx) {
    const ticketOrId = codeId(payload.id, "ID permohonan", 64);
    const decision = oneOf(
      payload.decision,
      ["APPROVE_CORRECTION", "REJECT", "ISSUE_LETTER"] as const,
      "Keputusan layanan"
    );

    const reqItem = await prisma.serviceRequest.findFirst({
      where: { OR: [{ id: ticketOrId }, { ticketNo: ticketOrId }] },
    });

    if (reqItem) {
      if (decision === "APPROVE_CORRECTION") {
        const allowedFields = new Set([
          "name",
          "ttl",
          "fatherName",
          "motherName",
          "address",
          "parentPhone",
          "prevSchool",
          "nik",
        ]);
        if (
          reqItem.studentId &&
          reqItem.fieldToCorrect &&
          allowedFields.has(reqItem.fieldToCorrect) &&
          reqItem.newValue
        ) {
          await prisma.student.update({
            where: { id: reqItem.studentId },
            data: { [reqItem.fieldToCorrect]: reqItem.newValue },
          });
        }
        await prisma.serviceRequest.update({
          where: { id: reqItem.id },
          data: { status: "Disetujui" },
        });
      } else if (decision === "REJECT") {
        await prisma.serviceRequest.update({
          where: { id: reqItem.id },
          data: { status: "Ditolak" },
        });
      } else if (decision === "ISSUE_LETTER") {
        const letterNumber =
          optText(payload.letterNumber, 80) ||
          `B-${randomInt(100, 999)}/MTs.NF/PP.00.5/${new Date().getFullYear()}`;
        await prisma.serviceRequest.update({
          where: { id: reqItem.id },
          data: { status: "Disetujui", letterNumber },
        });
        await prisma.mailAgenda.create({
          data: {
            mailType: "SURAT_KELUAR",
            category: "Kesiswaan",
            mailNumber: letterNumber,
            dateLabel: nowLabel(),
            party: `${reqItem.studentName} (${reqItem.classroom})`,
            subject: reqItem.title,
            r2FileKey: `persuratan/keluar/${letterNumber.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`,
            status: "Terarsip & TTE",
          },
        });
      }
    }

    await writeAuditLog(
      ctx!,
      `Memproses layanan administrasi TU (${decision}) untuk tiket ${ticketOrId}`
    );
    return NextResponse.json({ ok: true });
  },

  // 17. Catat Agenda Surat Masuk / Keluar Baru (TU & Super Admin)
  async CREATE_MAIL_AGENDA(payload, ctx) {
    const mailType =
      String(payload.type || "").toLowerCase().includes("keluar")
        ? "SURAT_KELUAR"
        : "SURAT_MASUK";
    const category = optText(payload.category, 60, "Kemenag");
    const mailNumber = reqText(payload.letterNo, "Nomor surat", 100);
    const dateLabel = optText(payload.date, 60, nowLabel());
    const party = reqText(payload.party, "Pengirim / Tujuan surat", 160);
    const subject = reqText(payload.subject, "Perihal surat", 300);
    const r2FileKey =
      r2KeyOrNull(payload.r2File) ||
      `persuratan/scan/${Date.now()}-surat.pdf`;

    const created = await prisma.mailAgenda.create({
      data: {
        mailType,
        category,
        mailNumber,
        dateLabel,
        party,
        subject,
        r2FileKey,
        status: "Terarsip & TTE",
      },
    });
    await writeAuditLog(
      ctx!,
      `Mencatat ${mailType === "SURAT_MASUK" ? "Surat Masuk" : "Surat Keluar"} (${mailNumber}) — ${subject}`
    );
    return NextResponse.json({ ok: true, data: deepNeutralize(created) });
  },

  // 18. Update Biodata Siswa Buku Induk / Perbaikan Residu EMIS (TU & Super Admin)
  async UPDATE_STUDENT_BIODATA(payload, ctx) {
    const nisn = digitsOrNull(payload.nisn, 5, 20);
    const nis = digitsOrNull(payload.nis, 4, 20);
    if (!nisn && !nis) {
      throw new HttpError(400, "NIS atau NISN siswa wajib diisi.");
    }
    const existing = await prisma.student.findFirst({
      where: nisn ? { nisn } : { nis: nis! },
    });
    if (!existing) throw new HttpError(404, "Data siswa tidak ditemukan.");

    const updated = await prisma.student.update({
      where: { id: existing.id },
      data: {
        ...(nis ? { nis } : {}),
        ...(nisn ? { nisn } : {}),
        ...(payload.nik ? { nik: digits(payload.nik, "NIK", 16, 16) } : {}),
        ...(payload.name ? { name: optText(payload.name, 120, existing.name) } : {}),
        ...(payload.ttl ? { ttl: optText(payload.ttl, 120, existing.ttl) } : {}),
        ...(payload.fatherName
          ? { fatherName: optText(payload.fatherName, 120, existing.fatherName) }
          : {}),
        ...(payload.motherName
          ? { motherName: optText(payload.motherName, 120, existing.motherName) }
          : {}),
        ...(payload.rombel
          ? { rombel: optText(payload.rombel, 20, existing.rombel) }
          : {}),
        ...(payload.status
          ? {
              status: oneOf(
                payload.status,
                STUDENT_STATUSES,
                "Status",
                "Aktif"
              ),
            }
          : {}),
        ...(payload.prevSchool
          ? { prevSchool: optText(payload.prevSchool, 120, existing.prevSchool) }
          : {}),
        ...(payload.address
          ? { address: optText(payload.address, 300, existing.address) }
          : {}),
      },
    });
    await writeAuditLog(
      ctx!,
      `Memperbarui biodata Buku Induk / EMIS siswa: ${updated.name} (NIS ${updated.nis})`
    );
    return NextResponse.json({ ok: true, data: deepNeutralize(updated) });
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new HttpError(400, "Body permintaan tidak valid.");
    }
    const action = String((body as Record<string, unknown>).action || "");
    const permission = ACTION_PERMISSIONS[action];
    const handler = handlers[action];
    if (!permission || !handler) {
      throw new HttpError(400, "Aksi tidak dikenal.");
    }

    const rawPayload = (body as Record<string, unknown>).payload;
    const payload =
      rawPayload === undefined || rawPayload === null ? {} : asObject(rawPayload);

    let ctx: AuthContext | null = null;
    if (permission === "PUBLIC") {
      enforceRateLimit(`public_${action}`, getClientIp(req), 6, 60 * 1000);
      ctx = await getAuthContext();
    } else {
      ctx = await requireAuth(permission);
    }

    const res = await handler(payload, ctx);
    invalidateScopeCache();
    return res;
  } catch (error) {
    return errorResponse(error, "Gagal memproses aksi");
  }
}
