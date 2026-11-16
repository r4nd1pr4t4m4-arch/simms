import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  HttpError,
  buildSessionPayload,
  errorResponse,
  findAuthUserById,
  findAuthUserForLogin,
  getAuthContext,
  requireAuth,
} from "@/lib/guard";
import {
  checkLoginLockout,
  clearLoginFailures,
  enforceRateLimit,
  getClientIp,
  recordLoginFailure,
} from "@/lib/rate-limit";
import { deepNeutralize } from "@/lib/security";

// Hash dummy untuk menyamakan waktu komputasi bcrypt saat akun tidak ditemukan
const DUMMY_BCRYPT_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

const WEAK_PASSWORDS = new Set([
  "simms2026!",
  "simms2026",
  "password",
  "password123",
  "admin123",
  "12345678",
  "123456789",
  "qwerty123",
  "mtsnurulfalah",
]);

function validateStrongPassword(pw: string) {
  if (pw.length < 8) {
    throw new HttpError(400, "Kata sandi baru minimal 8 karakter.");
  }
  if (pw.length > 128) {
    throw new HttpError(400, "Kata sandi baru terlalu panjang.");
  }
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) {
    throw new HttpError(
      400,
      "Kata sandi baru wajib mengandung kombinasi huruf dan angka."
    );
  }
  if (WEAK_PASSWORDS.has(pw.toLowerCase())) {
    throw new HttpError(
      400,
      "Kata sandi tersebut terlalu umum atau merupakan sandi awal. Gunakan kombinasi lain."
    );
  }
}

export async function GET() {
  const ctx = await getAuthContext().catch(() => null);
  if (!ctx) {
    return NextResponse.json({ ok: true, session: null });
  }
  const session = await buildSessionPayload(ctx.user);
  return NextResponse.json({ ok: true, session: deepNeutralize(session) });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    enforceRateLimit("auth_login", ip, 15, 60 * 1000); // maks 15 req/menit per IP

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new HttpError(400, "Permintaan tidak valid.");
    }
    const identifier = String(
      (body as Record<string, unknown>).identifier || ""
    ).trim();
    const password = String((body as Record<string, unknown>).password || "");

    if (
      !identifier ||
      !password ||
      identifier.length > 120 ||
      password.length > 200
    ) {
      throw new HttpError(
        400,
        "Harap isi NIP / NISN / Email dan kata sandi dengan benar."
      );
    }

    checkLoginLockout(ip, identifier);

    const dbUser = await findAuthUserForLogin(identifier);

    const hashToCompare = dbUser?.passwordHash || DUMMY_BCRYPT_HASH;
    const validPw = await bcrypt
      .compare(password, hashToCompare)
      .catch(() => false);

    if (!dbUser || !dbUser.isActive || !validPw) {
      recordLoginFailure(ip, identifier);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Identitas akun atau kata sandi yang Anda masukkan tidak sesuai.",
        },
        { status: 401 }
      );
    }

    clearLoginFailures(identifier);

    const builtPayload = await buildSessionPayload(dbUser);
    if (password === "Simms2026!") {
      builtPayload.mustChangePassword = true;
    }

    const sessionPayload = deepNeutralize(builtPayload);
    const token = await createSessionToken(sessionPayload);

    const res = NextResponse.json({
      ok: true,
      session: sessionPayload,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: "lax",
    });

    return res;
  } catch (error) {
    return errorResponse(error, "Gagal memproses autentikasi");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    enforceRateLimit("auth_patch", ip, 10, 60 * 1000);

    const ctx = await requireAuth();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new HttpError(400, "Permintaan tidak valid.");
    }
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || typeof currentPassword !== "string") {
      throw new HttpError(400, "Kata sandi saat ini wajib diisi.");
    }
    if (!newPassword || typeof newPassword !== "string") {
      throw new HttpError(400, "Kata sandi baru wajib diisi.");
    }

    const okOld = await bcrypt
      .compare(currentPassword, ctx.user.passwordHash)
      .catch(() => false);
    if (!okOld) {
      recordLoginFailure(ip, ctx.user.identifier);
      throw new HttpError(401, "Kata sandi saat ini tidak sesuai.");
    }

    if (currentPassword === newPassword) {
      throw new HttpError(
        400,
        "Kata sandi baru harus berbeda dari kata sandi saat ini."
      );
    }

    validateStrongPassword(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: ctx.user.id },
      data: { passwordHash },
    });

    // Terbitkan ulang token sesi baru dengan pwdFp terbaru (sesi di perangkat lain otomatis gugur)
    const updatedUser = await findAuthUserById(ctx.user.id);
    const res = NextResponse.json({
      ok: true,
      message:
        "Kata sandi berhasil diperbarui. Seluruh sesi lama di perangkat lain telah diakhiri.",
    });

    if (updatedUser) {
      const freshSession = deepNeutralize(await buildSessionPayload(updatedUser));
      const newToken = await createSessionToken(freshSession);
      res.cookies.set(SESSION_COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
        sameSite: "lax",
      });
    }

    return res;
  } catch (error) {
    return errorResponse(error, "Gagal mengubah kata sandi");
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
