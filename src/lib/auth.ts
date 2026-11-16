import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function getJwtSecretKey(): Uint8Array {
  const raw = process.env.AUTH_SECRET || "";
  if (raw.length >= 32) {
    return new TextEncoder().encode(raw);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: Environment variable AUTH_SECRET wajib diatur (minimal 32 karakter) pada mode produksi."
    );
  }
  return new TextEncoder().encode(
    raw || "dev-only-sims-mts-nurul-falah-secret-key-2026"
  );
}

export const SESSION_COOKIE_NAME = "sims_session_token";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 jam

export interface SessionPayload {
  userId: string;
  identifier: string;
  name: string;
  baseRole: "ADMIN" | "TU" | "GTK" | "SISWA" | "ORTU" | "PPDB";
  subProfileKey?: string;
  subject?: string;
  nip?: string;
  nis?: string;
  nisn?: string;
  rombel?: string;
  waliKelas?: string;
  additionalRoles?: string[];
  roleDetails?: Array<{ type: string; detail: string; skNumber?: string | null }>;
  targetPath: string;
  /** Sidik jari singkat dari passwordHash untuk membatalkan token lama saat sandi berubah */
  pwdFp?: string;
  /** Penanda apabila akun masih memakai kata sandi awal/default dan disarankan segera menggantinya */
  mustChangePassword?: boolean;
}

/**
 * Buat sidik jari non-reversibel 12 karakter dari ekor bcrypt hash.
 * Tidak membocorkan hash penuh namun berubah setiap kali password di-hash ulang.
 */
export function computePasswordFingerprint(passwordHash: string): string {
  const s = String(passwordHash || "");
  if (s.length < 16) return "fp0";
  let acc = 2166136261;
  for (let i = 0; i < s.length; i++) {
    acc ^= s.charCodeAt(i);
    acc = Math.imul(acc, 16777619) >>> 0;
  }
  return `${acc.toString(36)}-${s.slice(-6, -2)}`;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}
