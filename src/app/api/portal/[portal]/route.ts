import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getMadrasahProfile } from "@/app/api/simm/route";

export const dynamic = "force-dynamic";

const PORTAL_FILE_MAP: Record<string, string> = {
  publik: "Prototype Halaman Publik SIMM.html",
  ppdb: "Prototype Halaman Portal PPDB Online.html",
  admin: "Prototype Dashboard Admin SIMM.html",
  tu: "Prototype Dashboard TU SIMM.html",
  gtk: "Prototype Dashboard Guru - GTK SIMM.html",
  siswa: "Prototype Dashboard Siswa SIMM.html",
  ortu: "Prototype Dashboard Orang Tua-Wali Siswa SIMM.html",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { portal: string } }
) {
  try {
    const portalKey = (params.portal || "publik").toLowerCase();
    const filename = PORTAL_FILE_MAP[portalKey] || PORTAL_FILE_MAP.publik;
    const filePath = path.join(process.cwd(), filename);

    let html = await fs.readFile(filePath, "utf-8");

    // Terapkan Identitas Resmi Madrasah yang dikonfigurasi Admin secara dinamis
    const profile = await getMadrasahProfile();
    if (profile.name && profile.name !== "MTs Nurul Falah") {
      html = html.replace(/MTs Nurul Falah/g, profile.name);
    }
    if (profile.nsm && profile.nsm !== "121232040089") {
      html = html.replace(/121232040089/g, profile.nsm);
    }
    if (profile.npsn && profile.npsn !== "20278412") {
      html = html.replace(/20278412/g, profile.npsn);
    }
    if (
      profile.address &&
      profile.address !==
        "Jl. Pendidikan No. 45, Kel. Mekarjaya, Kec. Cileunyi, Kab. Bandung, Jawa Barat 40622"
    ) {
      html = html.replace(
        /Jl\. Pendidikan No\. 45, Kel\. Mekarjaya, Kec\. Cileunyi, Kab\. Bandung, Jawa Barat 40622/g,
        profile.address
      );
    }

    // Sisipkan konfigurasi profil madrasah & bridge integrasi sebelum </body>
    const profileScript = `<script>window.__MADRASAH_PROFILE__ = ${JSON.stringify(
      profile
    )};</script>`;
    const bridgeTag = `\n${profileScript}\n<script src="/simm-bridge.js"></script>\n</body>`;
    if (html.includes("</body>")) {
      html = html.replace("</body>", bridgeTag);
    } else {
      html += `\n${profileScript}\n<script src="/simm-bridge.js"></script>`;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return new NextResponse(
      `<h1>Gagal memuat portal: ${error?.message || "File tidak ditemukan"}</h1>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
