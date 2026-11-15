import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getServerSession,
  SESSION_COOKIE_NAME,
  SessionPayload,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession();
  return NextResponse.json({ ok: true, session });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier = "", password = "" } = body;
    const cleanId = identifier.trim();

    if (!cleanId || !password) {
      return NextResponse.json(
        { ok: false, error: "Harap isi NIP / NISN / Email dan kata sandi." },
        { status: 400 }
      );
    }

    // 1. Cari pengguna di tabel User Supabase
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { identifier: cleanId },
          { email: cleanId },
          { phone: cleanId },
        ],
      },
      include: {
        teacherProfile: { include: { roles: true } },
        tuProfile: true,
        studentProfile: true,
        parentChildren: { include: { student: true } },
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Akun dengan NIP / NISN / Email tersebut tidak ditemukan di dalam sistem.",
        },
        { status: 404 }
      );
    }

    // 2. Verifikasi kata sandi terhadap hash di database Supabase
    const validPw = await bcrypt
      .compare(password, dbUser.passwordHash)
      .catch(() => false);

    if (!validPw) {
      return NextResponse.json(
        { ok: false, error: "Kata sandi yang Anda masukkan tidak sesuai." },
        { status: 401 }
      );
    }

    // 3. Susun daftar Tugas Tambahan Dinamis & Detail Profil
    const roleDetails =
      dbUser.teacherProfile?.roles.map((r) => ({
        type: r.type,
        detail: r.detail,
        skNumber: r.skNumber,
      })) || [];

    const addRoles =
      dbUser.teacherProfile?.roles.map((r) => `${r.type} (${r.detail})`) ||
      (dbUser.tuProfile ? [dbUser.tuProfile.position] : []);

    // Jika Siswa namun relasi studentProfile belum terhubung langsung lewat userId, cari via NISN
    let stuProfile = dbUser.studentProfile;
    if (dbUser.baseRole === "SISWA" && !stuProfile) {
      stuProfile = await prisma.student.findUnique({
        where: { nisn: dbUser.identifier },
      });
    }

    // 4. Tentukan halaman tujuan (targetPath) otomatis berdasarkan peran & tugas tambahan
    const targetMap: Record<string, string> = {
      ADMIN: "/admin",
      TU: "/tu",
      GTK: "/gtk",
      SISWA: "/siswa",
      ORTU: "/ortu",
      PPDB: "/ppdb",
    };

    const sessionPayload: SessionPayload = {
      userId: dbUser.id,
      identifier: dbUser.identifier,
      name: dbUser.name,
      baseRole: dbUser.baseRole,
      subject: dbUser.teacherProfile?.subject || undefined,
      nip:
        dbUser.teacherProfile?.nip ||
        dbUser.tuProfile?.nip ||
        (dbUser.baseRole === "GTK" || dbUser.baseRole === "TU"
          ? dbUser.identifier
          : undefined),
      nis: stuProfile?.nis || undefined,
      nisn:
        stuProfile?.nisn ||
        (dbUser.baseRole === "SISWA" ? dbUser.identifier : undefined),
      rombel: stuProfile?.rombel || undefined,
      waliKelas: stuProfile?.waliKelas || undefined,
      additionalRoles: addRoles,
      roleDetails,
      targetPath: targetMap[dbUser.baseRole] || "/",
    };

    const token = await createSessionToken(sessionPayload);
    const res = NextResponse.json({
      ok: true,
      session: sessionPayload,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Gagal memproses autentikasi" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Anda belum login" },
        { status: 401 }
      );
    }
    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Kata sandi baru minimal 6 karakter" },
        { status: 400 }
      );
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.updateMany({
      where: {
        OR: [{ id: session.userId }, { identifier: session.identifier }],
      },
      data: { passwordHash },
    });
    return NextResponse.json({
      ok: true,
      message: "Kata sandi berhasil diperbarui di database.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Gagal mengubah kata sandi" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
