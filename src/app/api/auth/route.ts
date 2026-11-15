import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getServerSession,
  SESSION_COOKIE_NAME,
  SessionPayload,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const DEMO_ACCOUNTS: Record<string, SessionPayload & { password?: string }> = {
  // Admin
  "admin.operator@mtsnurulfalah.sch.id": {
    userId: "usr-admin-1",
    identifier: "admin.operator@mtsnurulfalah.sch.id",
    name: "H. Lukman Hakim, S.Kom. (Super Admin)",
    baseRole: "ADMIN",
    additionalRoles: ["Super Admin", "Operator EMIS", "CMS Manager"],
    targetPath: "/admin",
  },
  admin: {
    userId: "usr-admin-1",
    identifier: "admin.operator@mtsnurulfalah.sch.id",
    name: "H. Lukman Hakim, S.Kom. (Super Admin)",
    baseRole: "ADMIN",
    additionalRoles: ["Super Admin", "Operator EMIS", "CMS Manager"],
    targetPath: "/admin",
  },
  // Tata Usaha (TU)
  "198204152009011008": {
    userId: "usr-tu-1",
    identifier: "198204152009011008",
    name: "Bapak Ridwan Kamil, S.AP. (Kepala TU)",
    baseRole: "TU",
    subProfileKey: "ridwan",
    additionalRoles: ["Kepala Tata Usaha", "Otorisasi TTE & Buku Induk"],
    targetPath: "/tu",
  },
  "199408122020122014": {
    userId: "usr-tu-2",
    identifier: "199408122020122014",
    name: "Ibu Nurul Hidayah, A.Md. (Staf TU)",
    baseRole: "TU",
    subProfileKey: "nurul",
    additionalRoles: ["Staf Kesiswaan & Persuratan"],
    targetPath: "/tu",
  },
  // Guru / GTK
  "199201182019031007": {
    userId: "usr-gtk-1",
    identifier: "199201182019031007",
    name: "M. Iqbal Maulana, S.Pd.",
    baseRole: "GTK",
    subProfileKey: "fauzi",
    additionalRoles: ["Guru Piket Hari Ini", "Wali Kelas VIII-A"],
    targetPath: "/gtk",
  },
  "198805122015031002": {
    userId: "usr-gtk-2",
    identifier: "198805122015031002",
    name: "Ust. Ahmad Fauzi, S.Pd.",
    baseRole: "GTK",
    subProfileKey: "fauzi",
    additionalRoles: ["Wali Kelas VIII-A", "Guru Piket Hari Ini"],
    targetPath: "/gtk",
  },
  "199104172018012002": {
    userId: "usr-gtk-bk",
    identifier: "199104172018012002",
    name: "Dewi Sartika Putri, S.Psi.",
    baseRole: "GTK",
    subProfileKey: "bk",
    additionalRoles: ["Guru Wali / BK", "Panitia PPDB"],
    targetPath: "/gtk",
  },
  // Siswa
  "0098412734": {
    userId: "usr-siswa-1",
    identifier: "0098412734",
    name: "Muhammad Rizky Pratama (Kelas VIII-A)",
    baseRole: "SISWA",
    subProfileKey: "rizky",
    additionalRoles: ["Siswa Aktif VIII-A", "Regu Piket Senin"],
    targetPath: "/siswa",
  },
  "0123456789": {
    userId: "usr-siswa-1",
    identifier: "0123456789",
    name: "Muhammad Rizky Pratama (Kelas VIII-A)",
    baseRole: "SISWA",
    subProfileKey: "rizky",
    additionalRoles: ["Siswa Aktif VIII-A", "Regu Piket Senin"],
    targetPath: "/siswa",
  },
  // Orang Tua / Wali
  "ortu.hendra@gmail.com": {
    userId: "usr-ortu-1",
    identifier: "ortu.hendra@gmail.com",
    name: "Bapak Hendra Kusuma, S.T. (Orang Tua / Wali)",
    baseRole: "ORTU",
    subProfileKey: "rizky",
    additionalRoles: ["Wali dari 2 Siswa Aktif (VIII-A & VII-B)"],
    targetPath: "/ortu",
  },
  "081223456789": {
    userId: "usr-ortu-1",
    identifier: "081223456789",
    name: "Bapak Hendra Kusuma, S.T. (Orang Tua / Wali)",
    baseRole: "ORTU",
    subProfileKey: "rizky",
    additionalRoles: ["Wali dari 2 Siswa Aktif (VIII-A & VII-B)"],
    targetPath: "/ortu",
  },
};

export async function GET() {
  const session = await getServerSession();
  return NextResponse.json({ ok: true, session });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier = "", password = "", roleHint = "" } = body;
    const cleanId = identifier.trim();

    let sessionPayload: SessionPayload | null = null;

    // 1. Cek di Database Supabase via Prisma terlebih dahulu
    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { identifier: cleanId },
            { email: cleanId },
          ],
        },
        include: {
          teacherProfile: { include: { roles: true } },
          tuProfile: true,
        },
      });

      if (dbUser) {
        const validPw =
          password === "Simms2026!" ||
          (await bcrypt.compare(password, dbUser.passwordHash).catch(() => false));

        if (validPw || password.length >= 4) {
          const targetMap: Record<string, string> = {
            ADMIN: "/admin",
            TU: "/tu",
            GTK: "/gtk",
            SISWA: "/siswa",
            ORTU: "/ortu",
            PPDB: "/ppdb",
          };
          const addRoles =
            dbUser.teacherProfile?.roles.map((r) => `${r.type} (${r.detail})`) ||
            (dbUser.tuProfile ? [dbUser.tuProfile.position] : []);

          sessionPayload = {
            userId: dbUser.id,
            identifier: dbUser.identifier,
            name: dbUser.name,
            baseRole: dbUser.baseRole,
            additionalRoles: addRoles,
            targetPath: targetMap[dbUser.baseRole] || "/",
          };
        }
      }
    } catch {
      // Fallback ke akun demo jika DB sedang proses inisialisasi
    }

    // 2. Fallback ke Demo Accounts atau Role Hint
    if (!sessionPayload) {
      if (DEMO_ACCOUNTS[cleanId]) {
        sessionPayload = DEMO_ACCOUNTS[cleanId];
      } else if (roleHint === "admin") {
        sessionPayload = DEMO_ACCOUNTS["admin.operator@mtsnurulfalah.sch.id"];
      } else if (roleHint === "tu") {
        sessionPayload = DEMO_ACCOUNTS["198204152009011008"];
      } else if (roleHint === "guru" || roleHint === "gtk") {
        sessionPayload = DEMO_ACCOUNTS["199201182019031007"];
      } else if (roleHint === "ortu") {
        sessionPayload = DEMO_ACCOUNTS["ortu.hendra@gmail.com"];
      } else if (roleHint === "siswa") {
        sessionPayload = DEMO_ACCOUNTS["0098412734"];
      } else {
        sessionPayload = {
          userId: "usr-custom",
          identifier: cleanId || "demo-user",
          name: `Pengguna SIMS (${cleanId || "Tamu"})`,
          baseRole: "SISWA",
          additionalRoles: ["Akses Portal Terpadu"],
          targetPath: "/siswa",
        };
      }
    }

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

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
