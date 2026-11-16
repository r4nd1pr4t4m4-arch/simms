import { NextRequest } from "next/server";
import { HttpError } from "@/lib/guard";

/**
 * Rate limiter & brute-force lockout di memori server.
 * Melindungi endpoint sensitif (login, cek NISN, PPDB publik, upload publik).
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

interface LockoutEntry {
  failures: number;
  lockedUntil: number;
  lastFailureAt: number;
}

const rateWindows = new Map<string, WindowEntry>();
const loginLockouts = new Map<string, LockoutEntry>();

function cleanupExpired(now: number) {
  if (rateWindows.size > 5000) {
    rateWindows.forEach((v, k) => {
      if (v.resetAt <= now) rateWindows.delete(k);
    });
  }
  if (loginLockouts.size > 5000) {
    loginLockouts.forEach((v, k) => {
      if (now - v.lastFailureAt > 30 * 60 * 1000 && v.lockedUntil <= now) {
        loginLockouts.delete(k);
      }
    });
  }
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "127.0.0.1";
}

/**
 * Batasi jumlah request dalam jendela waktu tertentu.
 * Melempar HttpError 429 bila batas terlampaui.
 */
export function enforceRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  cleanupExpired(now);

  const mapKey = `${bucket}:${key}`;
  const current = rateWindows.get(mapKey);

  if (!current || current.resetAt <= now) {
    rateWindows.set(mapKey, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    const waitSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    throw new HttpError(
      429,
      `Terlalu banyak permintaan. Silakan tunggu ${waitSec} detik sebelum mencoba kembali.`
    );
  }

  current.count += 1;
}

/**
 * Periksa apakah kombinasi IP / akun sedang terkunci akibat gagal login berulang.
 */
export function checkLoginLockout(ip: string, identifier: string) {
  const now = Date.now();
  const keys = [`ip:${ip}`, `id:${identifier.toLowerCase()}`];

  for (const k of keys) {
    const entry = loginLockouts.get(k);
    if (entry && entry.lockedUntil > now) {
      const waitSec = Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000));
      throw new HttpError(
        429,
        `Akun atau koneksi dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam ${waitSec} detik.`
      );
    }
  }
}

/**
 * Catat kegagalan login; kunci bertahap setelah >= 5 kali gagal.
 */
export function recordLoginFailure(ip: string, identifier: string) {
  const now = Date.now();
  const keys = [`ip:${ip}`, `id:${identifier.toLowerCase()}`];

  for (const k of keys) {
    const prev = loginLockouts.get(k);
    const failures =
      prev && now - prev.lastFailureAt < 15 * 60 * 1000
        ? prev.failures + 1
        : 1;
    let lockedUntil = 0;
    if (failures >= 10) {
      lockedUntil = now + 15 * 60 * 1000; // 15 menit
    } else if (failures >= 5) {
      lockedUntil = now + 2 * 60 * 1000; // 2 menit
    }
    loginLockouts.set(k, { failures, lockedUntil, lastFailureAt: now });
  }
}

/**
 * Bersihkan catatan gagal login untuk akun setelah berhasil masuk.
 */
export function clearLoginFailures(identifier: string) {
  loginLockouts.delete(`id:${identifier.toLowerCase()}`);
}
