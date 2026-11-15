import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET || "sims-mts-nurul-falah-secret-key-2026"
);

const SESSION_COOKIE_NAME = "sims_session_token";

interface MiddlewareSession {
  userId: string;
  identifier: string;
  name: string;
  baseRole: "ADMIN" | "TU" | "GTK" | "SISWA" | "ORTU" | "PPDB";
  additionalRoles?: string[];
  targetPath: string;
}

async function getSessionFromRequest(
  req: NextRequest
): Promise<MiddlewareSession | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as MiddlewareSession;
  } catch {
    return null;
  }
}

// Pemetaan hak akses rute berdasarkan BaseRole (ADMIN memiliki akses penuh / override)
const ROUTE_ROLE_MAP: Record<string, Array<MiddlewareSession["baseRole"]>> = {
  "/admin": ["ADMIN"],
  "/tu": ["TU", "ADMIN"],
  "/gtk": ["GTK", "ADMIN"],
  "/siswa": ["SISWA", "ADMIN"],
  "/ortu": ["ORTU", "ADMIN"],
  "/api/portal/admin": ["ADMIN"],
  "/api/portal/tu": ["TU", "ADMIN"],
  "/api/portal/gtk": ["GTK", "ADMIN"],
  "/api/portal/siswa": ["SISWA", "ADMIN"],
  "/api/portal/ortu": ["ORTU", "ADMIN"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Cek apakah pathname termasuk rute yang dilindungi RBAC
  const matchedPrefix = Object.keys(ROUTE_ROLE_MAP).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!matchedPrefix) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  // 1. Jika belum login -> arahkan ke halaman utama dengan trigger modal login
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "Sesi tidak ditemukan. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/", req.url);
    loginUrl.searchParams.set("login", "required");
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Cek kesesuaian Role (RBAC) — Kepala Madrasah juga memiliki hak supervisi eksekutif ke /admin & /tu
  const isKepalaMadrasah =
    session.baseRole === "GTK" &&
    (session.additionalRoles || [])
      .join(" ")
      .toLowerCase()
      .includes("kepala madrasah");

  const allowedRoles = ROUTE_ROLE_MAP[matchedPrefix];
  if (!allowedRoles.includes(session.baseRole) && !isKepalaMadrasah) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          ok: false,
          error: `Akses ditolak. Peran Anda (${session.baseRole}) tidak memiliki izin ke modul ini.`,
        },
        { status: 403 }
      );
    }
    // Redirect ke dashboard resmi milik role pengguna tersebut
    const fallbackPath = session.targetPath || "/";
    return NextResponse.redirect(new URL(fallbackPath, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/tu/:path*",
    "/gtk/:path*",
    "/siswa/:path*",
    "/ortu/:path*",
    "/api/portal/:path*",
  ],
};
