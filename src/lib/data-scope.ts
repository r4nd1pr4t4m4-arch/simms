import fs from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthContext, hasRoleKeyword } from "@/lib/guard";
import { deepNeutralize } from "@/lib/security";

/**
 * Akses data per peran (data scoping).
 * Prinsip: whitelist kolom dengan `select` eksplisit, TIDAK PERNAH mengirim
 * `passwordHash`, dan setiap peran hanya menerima data yang memang ia butuhkan.
 */

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

export const MADRASAH_PROFILE_KEYS: Array<keyof MadrasahProfileConfig> = [
  "name",
  "nsm",
  "npsn",
  "accreditation",
  "academicYear",
  "semester",
  "curriculum",
  "headmasterName",
  "headmasterNip",
  "tuHeadName",
  "tuHeadNip",
  "address",
  "phone",
  "email",
  "gpsLat",
  "gpsLng",
  "gpsRadiusMeters",
  "komiteBankInfo",
];

export const DEFAULT_MADRASAH_PROFILE: MadrasahProfileConfig = {
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

/** Hanya ambil key yang dikenal (mencegah field liar dari data lama). */
function pickProfile(raw: unknown): Partial<MadrasahProfileConfig> {
  const out: Partial<MadrasahProfileConfig> = {};
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;
  for (const k of MADRASAH_PROFILE_KEYS) {
    if (obj[k] === undefined || obj[k] === null) continue;
    if (k === "gpsRadiusMeters") {
      const n = Number(obj[k]);
      if (Number.isFinite(n)) out.gpsRadiusMeters = n;
    } else {
      (out as Record<string, unknown>)[k] = String(obj[k]);
    }
  }
  return out;
}

export async function getMadrasahProfile(): Promise<MadrasahProfileConfig> {
  try {
    const latest = await prisma.systemActivityLog.findFirst({
      where: { category: "madrasah_profile" },
      orderBy: { createdAt: "desc" },
    });
    if (latest && latest.actionText) {
      return { ...DEFAULT_MADRASAH_PROFILE, ...pickProfile(JSON.parse(latest.actionText)) };
    }
  } catch {
    // fallback ke file lokal
  }
  try {
    const raw = await fs.readFile(PROFILE_CONFIG_PATH, "utf-8");
    return { ...DEFAULT_MADRASAH_PROFILE, ...pickProfile(JSON.parse(raw)) };
  } catch {
    return DEFAULT_MADRASAH_PROFILE;
  }
}

export async function persistMadrasahProfile(
  profile: MadrasahProfileConfig,
  actor: string,
  roleBadge: string
) {
  await prisma.systemActivityLog.create({
    data: {
      actor,
      roleBadge,
      actionText: JSON.stringify(profile),
      timeLabel: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
      category: "madrasah_profile",
    },
  });
  await fs
    .writeFile(PROFILE_CONFIG_PATH, JSON.stringify(profile, null, 2), "utf-8")
    .catch(() => null);
}

// ---------------------------------------------------------------------------
// Whitelist kolom
// ---------------------------------------------------------------------------

const teacherSelect = {
  id: true,
  nip: true,
  subject: true,
  statusKepeg: true,
  totalJp: true,
  user: { select: { name: true } }, // JANGAN PERNAH include user penuh (ada passwordHash)
  roles: { select: { id: true, type: true, detail: true, skNumber: true } },
} satisfies Prisma.TeacherProfileSelect;

/** Kolom siswa untuk Guru (tanpa NIK, alamat, data & kontak orang tua). */
const studentForTeacherSelect = {
  id: true,
  nis: true,
  nisn: true,
  name: true,
  gender: true,
  rombel: true,
  waliKelas: true,
  status: true,
  piketDay: true,
  attendanceRate: true,
  pointsTotal: true,
  komiteMonthsPaid: true,
} satisfies Prisma.StudentSelect;

const classmateSelect = {
  name: true,
  rombel: true,
} satisfies Prisma.StudentSelect;

function maskNip(nip: string): string {
  const s = String(nip || "");
  if (s.length <= 6) return "••••";
  return `${s.slice(0, 4)}${"•".repeat(Math.max(4, s.length - 6))}${s.slice(-2)}`;
}

async function getPublicStats() {
  const [studentCount, teacherCount, rombelRows] = await Promise.all([
    prisma.student.count({ where: { status: "Aktif" } }),
    prisma.teacherProfile.count(),
    prisma.student.findMany({
      where: { status: "Aktif" },
      select: { rombel: true },
      distinct: ["rombel"],
    }),
  ]);
  return {
    studentCount,
    teacherCount,
    rombels: rombelRows.map((r) => r.rombel).filter(Boolean).sort(),
  };
}

export type ScopedSummary = Awaited<ReturnType<typeof getScopedSummary>>;

/**
 * Ringkasan data portal sesuai peran.
 * - `ctx = null`  → data publik saja (profil, statistik, nama & mapel guru, berita Published).
 * - Staff (Admin/Kepala Madrasah/TU) → data operasional penuh (tanpa kredensial).
 * - GTK → daftar guru + data siswa terbatas; PPDB hanya bila Panitia PPDB.
 * - Siswa → data dirinya sendiri + nama teman sekelas.
 * - Orang Tua → data anak-anaknya (relasi StudentParent) saja.
 */
export async function getScopedSummary(ctx: AuthContext | null) {
  const [profile, stats] = await Promise.all([getMadrasahProfile(), getPublicStats()]);

  const publishedCms = { where: { status: "Published" }, orderBy: { createdAt: "desc" as const } };

  // ---------------------------- PUBLIK ----------------------------
  const buildPublic = async () => {
    const [teachers, cmsPosts] = await Promise.all([
      prisma.teacherProfile.findMany({ select: teacherSelect, orderBy: { nip: "asc" } }),
      prisma.cmsPost.findMany(publishedCms),
    ]);
    return deepNeutralize({
      ok: true as const,
      scope: "public",
      profile,
      stats,
      teachers: teachers.map((t) => ({ ...t, nip: maskNip(t.nip) })),
      students: [] as unknown[],
      ppdb: [] as unknown[],
      cmsPosts,
      serviceRequests: [] as unknown[],
      mailAgenda: [] as unknown[],
      activityLogs: [] as unknown[],
      schedules: [] as unknown[],
      counselingNotes: [] as unknown[],
    });
  };

  if (!ctx) return buildPublic();

  const teachersP = prisma.teacherProfile.findMany({
    select: teacherSelect,
    orderBy: { nip: "asc" },
  });
  const schedulesP = prisma.classSchedule.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // ---------------------------- STAFF ----------------------------
  if (ctx.isStaff) {
    const [
      teachers,
      students,
      ppdb,
      cmsPosts,
      serviceRequests,
      mailAgenda,
      activityLogs,
      schedules,
      counselingNotes,
    ] = await Promise.all([
      teachersP,
      prisma.student.findMany({ orderBy: { nis: "asc" } }),
      prisma.ppdbApplicant.findMany({ orderBy: { regNo: "desc" } }),
      prisma.cmsPost.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.serviceRequest.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.mailAgenda.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.systemActivityLog.findMany({
        where: { category: { not: "madrasah_profile" } },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      schedulesP,
      prisma.counselingNote.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    return deepNeutralize({
      ok: true as const,
      scope: "staff",
      profile,
      stats,
      teachers,
      students,
      ppdb,
      cmsPosts,
      serviceRequests,
      mailAgenda,
      activityLogs,
      schedules,
      counselingNotes,
    });
  }

  // ---------------------------- GTK ----------------------------
  if (ctx.baseRole === "GTK") {
    const canSeeSavings = hasRoleKeyword(ctx, "tabungan");
    const isPpdbPanel = hasRoleKeyword(ctx, "ppdb");
    const canSeeBk = hasRoleKeyword(ctx, "bk") || hasRoleKeyword(ctx, "wali");
    const [teachers, students, ppdb, cmsPosts, schedules, counselingNotes] =
      await Promise.all([
        teachersP,
        prisma.student.findMany({
          select: { ...studentForTeacherSelect, savingsBalance: canSeeSavings },
          where: { status: "Aktif" },
          orderBy: { nis: "asc" },
        }),
        isPpdbPanel
          ? prisma.ppdbApplicant.findMany({ orderBy: { regNo: "desc" } })
          : Promise.resolve([]),
        prisma.cmsPost.findMany(publishedCms),
        schedulesP,
        canSeeBk
          ? prisma.counselingNote.findMany({
              orderBy: { createdAt: "desc" },
              take: 100,
            })
          : Promise.resolve([]),
      ]);
    return deepNeutralize({
      ok: true as const,
      scope: "gtk",
      profile,
      stats,
      teachers,
      students,
      ppdb,
      cmsPosts,
      serviceRequests: [] as unknown[],
      mailAgenda: [] as unknown[],
      activityLogs: [] as unknown[],
      schedules,
      counselingNotes,
    });
  }

  // ---------------------------- SISWA ----------------------------
  if (ctx.baseRole === "SISWA") {
    const own =
      ctx.user.studentProfile ||
      (await prisma.student.findUnique({ where: { nisn: ctx.user.identifier } }));
    const [teachers, classmates, cmsPosts, schedules, counselingNotes] =
      await Promise.all([
        teachersP,
        own
          ? prisma.student.findMany({
              select: classmateSelect,
              where: { rombel: own.rombel, status: "Aktif", NOT: { id: own.id } },
              orderBy: { name: "asc" },
            })
          : Promise.resolve([]),
        prisma.cmsPost.findMany(publishedCms),
        own
          ? prisma.classSchedule.findMany({
              where: { classroom: own.rombel },
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
        own
          ? prisma.counselingNote.findMany({
              where: { studentId: own.id },
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
      ]);
    return deepNeutralize({
      ok: true as const,
      scope: "siswa",
      profile,
      stats,
      teachers,
      students: own ? [own, ...classmates] : [],
      ppdb: [] as unknown[],
      cmsPosts,
      serviceRequests: [] as unknown[],
      mailAgenda: [] as unknown[],
      activityLogs: [] as unknown[],
      schedules,
      counselingNotes,
    });
  }

  // ---------------------------- ORANG TUA ----------------------------
  if (ctx.baseRole === "ORTU") {
    const children = ctx.user.parentChildren.map((pc) => pc.student);
    const childIds = children.map((c) => c.id);
    const [teachers, cmsPosts, counselingNotes] = await Promise.all([
      teachersP,
      prisma.cmsPost.findMany(publishedCms),
      childIds.length > 0
        ? prisma.counselingNote.findMany({
            where: { studentId: { in: childIds } },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);
    return deepNeutralize({
      ok: true as const,
      scope: "ortu",
      profile,
      stats,
      teachers,
      students: children,
      ppdb: [] as unknown[],
      cmsPosts,
      serviceRequests: [] as unknown[],
      mailAgenda: [] as unknown[],
      activityLogs: [] as unknown[],
      schedules: [] as unknown[],
      counselingNotes,
    });
  }

  // Peran lain (mis. PPDB) → hanya data publik
  return buildPublic();
}
