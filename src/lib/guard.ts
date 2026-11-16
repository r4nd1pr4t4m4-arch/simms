import { NextResponse } from "next/server";
import { Prisma, BaseRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  computePasswordFingerprint,
  getServerSession,
  SessionPayload,
} from "@/lib/auth";

/**
 * Lapisan otorisasi server-side SIMMS.
 * Setiap request mengambil ulang data User dari database (bukan hanya mempercayai
 * isi JWT), sehingga perubahan peran / penonaktifan akun berlaku seketika.
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

const authUserInclude = {
  teacherProfile: { include: { roles: true } },
  tuProfile: true,
  studentProfile: true,
  parentChildren: { include: { student: true } },
} satisfies Prisma.UserInclude;

export type AuthUser = Prisma.UserGetPayload<{
  include: typeof authUserInclude;
}>;

export interface AuthContext {
  user: AuthUser;
  baseRole: BaseRole;
  /** Daftar jenis tugas tambahan (lowercase), mis. ["wali kelas", "panitia ppdb"] */
  roleTypes: string[];
  isKepalaMadrasah: boolean;
  /** ADMIN atau Kepala Madrasah */
  isAdmin: boolean;
  /** ADMIN, Kepala Madrasah, atau TU */
  isStaff: boolean;
}

export function buildAuthContext(user: AuthUser): AuthContext {
  const roleTypes = (user.teacherProfile?.roles || []).map((r) =>
    String(r.type || "").trim().toLowerCase()
  );
  const isKepalaMadrasah =
    user.baseRole === "GTK" &&
    roleTypes.some((t) => t.startsWith("kepala madrasah"));
  const isAdmin = user.baseRole === "ADMIN" || isKepalaMadrasah;
  return {
    user,
    baseRole: user.baseRole,
    roleTypes,
    isKepalaMadrasah,
    isAdmin,
    isStaff: isAdmin || user.baseRole === "TU",
  };
}

export async function findAuthUserById(id: string): Promise<AuthUser | null> {
  return prisma.user.findUnique({ where: { id }, include: authUserInclude });
}

export async function findAuthUserForLogin(
  identifier: string
): Promise<AuthUser | null> {
  return prisma.user.findFirst({
    where: {
      OR: [{ identifier }, { email: identifier }, { phone: identifier }],
    },
    include: authUserInclude,
  });
}

/** Konteks pengguna yang sedang login (null bila tamu / token invalid / akun nonaktif / sandi sudah berubah). */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession().catch(() => null);
  if (!session?.userId) return null;
  const user = await findAuthUserById(String(session.userId));
  if (!user || !user.isActive) return null;
  if (
    session.pwdFp &&
    session.pwdFp !== computePasswordFingerprint(user.passwordHash)
  ) {
    return null;
  }
  return buildAuthContext(user);
}

export function hasRoleKeyword(ctx: AuthContext, keyword: string): boolean {
  const kw = keyword.toLowerCase();
  return ctx.roleTypes.some((t) => t.includes(kw));
}

export type Permission = (ctx: AuthContext) => boolean;

/** Kumpulan aturan izin yang dipakai ulang di seluruh endpoint. */
export const can = {
  anyUser: (() => true) as Permission,
  superAdminOnly: ((ctx) => ctx.baseRole === "ADMIN") as Permission,
  admin: ((ctx) => ctx.isAdmin) as Permission,
  staff: ((ctx) => ctx.isStaff) as Permission,
  ppdbPanel: ((ctx) =>
    ctx.isStaff ||
    (ctx.baseRole === "GTK" && hasRoleKeyword(ctx, "ppdb"))) as Permission,
  scheduleBuilder: ((ctx) =>
    ctx.isAdmin ||
    (ctx.baseRole === "GTK" &&
      (hasRoleKeyword(ctx, "kurikulum") || hasRoleKeyword(ctx, "piket")))) as Permission,
  bkDesk: ((ctx) =>
    ctx.isAdmin ||
    (ctx.baseRole === "GTK" &&
      (hasRoleKeyword(ctx, "bk") || hasRoleKeyword(ctx, "wali")))) as Permission,
  gtkOrStaff: ((ctx) => ctx.isStaff || ctx.baseRole === "GTK") as Permission,
};

/** Wajib login (dan opsional lolos aturan izin). Melempar HttpError 401/403. */
export async function requireAuth(permission?: Permission): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new HttpError(401, "Sesi tidak ditemukan. Silakan login terlebih dahulu.");
  }
  if (permission && !permission(ctx)) {
    throw new HttpError(403, "Akses ditolak. Peran Anda tidak memiliki izin untuk aksi ini.");
  }
  return ctx;
}

/** Ubah error menjadi respons JSON tanpa membocorkan detail internal. */
export function errorResponse(error: unknown, fallback = "Terjadi kesalahan pada server") {
  if (error instanceof HttpError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  // Prisma unique constraint
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      { ok: false, error: "Data dengan identitas tersebut sudah terdaftar." },
      { status: 409 }
    );
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return NextResponse.json({ ok: false, error: "Data tidak ditemukan." }, { status: 404 });
  }
  console.error("[SIMMS API]", error);
  return NextResponse.json({ ok: false, error: fallback }, { status: 500 });
}

const TARGET_PATH: Record<BaseRole, string> = {
  ADMIN: "/admin",
  TU: "/tu",
  GTK: "/gtk",
  SISWA: "/siswa",
  ORTU: "/ortu",
  PPDB: "/ppdb",
};

/** Susun payload sesi dari data User terbaru di database. */
export async function buildSessionPayload(user: AuthUser): Promise<SessionPayload> {
  const roleDetails =
    user.teacherProfile?.roles.map((r) => ({
      type: r.type,
      detail: r.detail,
      skNumber: r.skNumber,
    })) || [];

  const addRoles =
    user.teacherProfile?.roles.map((r) => `${r.type} (${r.detail})`) ||
    (user.tuProfile ? [user.tuProfile.position] : []);

  let stuProfile = user.studentProfile;
  if (user.baseRole === "SISWA" && !stuProfile) {
    stuProfile = await prisma.student.findUnique({
      where: { nisn: user.identifier },
    });
  }

  return {
    userId: user.id,
    identifier: user.identifier,
    name: user.name,
    baseRole: user.baseRole,
    subject: user.teacherProfile?.subject || undefined,
    nip:
      user.teacherProfile?.nip ||
      user.tuProfile?.nip ||
      (user.baseRole === "GTK" || user.baseRole === "TU"
        ? user.identifier
        : undefined),
    nis: stuProfile?.nis || undefined,
    nisn:
      stuProfile?.nisn ||
      (user.baseRole === "SISWA" ? user.identifier : undefined),
    rombel: stuProfile?.rombel || undefined,
    waliKelas: stuProfile?.waliKelas || undefined,
    additionalRoles: addRoles,
    roleDetails,
    targetPath: TARGET_PATH[user.baseRole] || "/",
    pwdFp: computePasswordFingerprint(user.passwordHash),
  };
}
