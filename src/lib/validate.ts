import { HttpError } from "@/lib/guard";
import { neutralizeText } from "@/lib/security";

/**
 * Validasi & sanitasi input server-side (tanpa dependensi eksternal).
 * Semua teks bebas dinetralisasi (lihat security.ts) sebelum disimpan ke database.
 */

/** Teks bebas opsional: dinetralisasi, di-trim, dan dipotong ke panjang maksimum. */
export function optText(value: unknown, max = 200, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  const s = neutralizeText(String(value)).trim().slice(0, max);
  return s || fallback;
}

/** Teks bebas wajib. */
export function reqText(value: unknown, field: string, max = 200): string {
  const s = optText(value, max);
  if (!s) throw new HttpError(400, `${field} wajib diisi.`);
  return s;
}

/** String angka dengan panjang tertentu (NISN, NIK, NIP, NIS). */
export function digits(
  value: unknown,
  field: string,
  min: number,
  max: number,
  required = true
): string {
  const s = String(value ?? "").trim();
  if (!s && !required) return "";
  const re = new RegExp(`^\\d{${min},${max}}$`);
  if (!re.test(s)) {
    const len = min === max ? `${min}` : `${min}–${max}`;
    throw new HttpError(400, `${field} harus berupa ${len} digit angka.`);
  }
  return s;
}

/** Sama seperti digits() tetapi mengembalikan null (bukan melempar) bila tidak valid. */
export function digitsOrNull(value: unknown, min: number, max: number): string | null {
  const s = String(value ?? "").trim();
  return new RegExp(`^\\d{${min},${max}}$`).test(s) ? s : null;
}

/** Kode/ID sederhana: huruf, angka, titik, garis bawah, strip, garis miring. */
export function codeId(value: unknown, field: string, max = 64): string {
  const s = String(value ?? "").trim();
  if (!s || s.length > max || !/^[A-Za-z0-9._\/-]+$/.test(s)) {
    throw new HttpError(400, `${field} tidak valid.`);
  }
  return s;
}

/** Key objek R2 opsional; null bila kosong/tidak valid. */
export function r2KeyOrNull(value: unknown, allowedPrefix?: RegExp): string | null {
  if (value === undefined || value === null || value === "") return null;
  const s = String(value).trim();
  if (s.length > 300 || !/^[A-Za-z0-9._\/-]+$/.test(s) || s.includes("..")) {
    return null;
  }
  if (allowedPrefix && !allowedPrefix.test(s)) return null;
  return s;
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  fallback?: T
): T {
  const s = String(value ?? "").trim();
  if (!s && fallback !== undefined) return fallback;
  const hit = allowed.find((a) => a.toLowerCase() === s.toLowerCase());
  if (!hit) throw new HttpError(400, `${field} tidak valid.`);
  return hit;
}

export function numberIn(
  value: unknown,
  field: string,
  min: number,
  max: number,
  fallback?: number
): number {
  if ((value === undefined || value === null || value === "") && fallback !== undefined) {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new HttpError(400, `${field} harus berupa angka ${min}–${max}.`);
  }
  return n;
}

export function asObject(value: unknown, field = "payload"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `${field} tidak valid.`);
  }
  return value as Record<string, unknown>;
}
