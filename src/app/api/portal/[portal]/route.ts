import { NextRequest, NextResponse } from "next/server";
import { BaseRole } from "@prisma/client";
import { getPortalTemplate, PORTAL_TEMPLATES, SimmPortalKey } from "@/portals";
import {
  AuthContext,
  buildSessionPayload,
  getAuthContext,
} from "@/lib/guard";
import { getScopedSummary } from "@/lib/data-scope";
import {
  deepNeutralize,
  escapeHtml,
  safeJsonForScript,
} from "@/lib/security";

export const dynamic = "force-dynamic";

const PORTAL_ROLE_MAP: Partial<Record<SimmPortalKey, BaseRole[]>> = {
  admin: ["ADMIN"],
  tu: ["TU", "ADMIN"],
  gtk: ["GTK", "ADMIN"],
  siswa: ["SISWA", "ADMIN"],
  ortu: ["ORTU", "ADMIN"],
};

function canAccessPortal(
  portalKey: SimmPortalKey,
  ctx: AuthContext | null
): boolean {
  const allowedRoles = PORTAL_ROLE_MAP[portalKey];
  if (!allowedRoles) return true; // publik & ppdb
  if (!ctx) return false;
  if (allowedRoles.includes(ctx.baseRole)) return true;
  if (
    ctx.isKepalaMadrasah &&
    (portalKey === "admin" || portalKey === "tu" || portalKey === "gtk")
  ) {
    return true;
  }
  return false;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { portal: string } }
) {
  try {
    const rawParam = String(params.portal || "publik");
    // Tolak jika huruf kapital atau tidak terdaftar di PORTAL_TEMPLATES (cegah bypass case-sensitivity)
    if (
      rawParam !== rawParam.toLowerCase() ||
      !(rawParam in PORTAL_TEMPLATES)
    ) {
      return NextResponse.json(
        { ok: false, error: "Portal tidak valid." },
        { status: 404 }
      );
    }

    const portalKey = rawParam as SimmPortalKey;
    const ctx = await getAuthContext().catch(() => null);

    // Wajibkan autentikasi & RBAC untuk portal non-publik
    if (!canAccessPortal(portalKey, ctx)) {
      if (!ctx) {
        return NextResponse.json(
          {
            ok: false,
            error: "Sesi tidak ditemukan. Silakan login terlebih dahulu.",
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: `Akses ditolak. Peran Anda (${ctx.baseRole}) tidak memiliki izin ke modul ini.`,
        },
        { status: 403 }
      );
    }

    // Untuk portal publik & ppdb, selalu kirim ringkasan cakupan publik saja
    const summaryCtx =
      portalKey === "publik" || portalKey === "ppdb" ? null : ctx;

    const [sessionPayload, dbSummary] = await Promise.all([
      ctx ? buildSessionPayload(ctx.user).catch(() => null) : Promise.resolve(null),
      getScopedSummary(summaryCtx).catch(() => null),
    ]);

    const rawHtml = getPortalTemplate(portalKey);
    // Pin versi pustaka ikon Lucide agar tidak memakai tag @latest yang berisiko supply-chain
    let html = rawHtml.replace(
      /https:\/\/unpkg\.com\/lucide@latest/g,
      "https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"
    );
    const profile = dbSummary?.profile;

    if (profile) {
      if (profile.name) {
        html = html.replace(/MTs Nurul Falah/g, () => escapeHtml(profile.name));
      }
      if (profile.nsm) {
        html = html
          .replace(/121232040089/g, () => escapeHtml(profile.nsm))
          .replace(/121216050060/g, () => escapeHtml(profile.nsm));
      }
      if (profile.npsn) {
        html = html
          .replace(/20278412/g, () => escapeHtml(profile.npsn))
          .replace(/69963460/g, () => escapeHtml(profile.npsn));
      }
      if (profile.address) {
        html = html
          .replace(
            /Jl\. Pendidikan No\. 45, Kel\. Mekarjaya, Kec\. Cileunyi, Kab\. Bandung, Jawa Barat 40622/g,
            () => escapeHtml(profile.address)
          )
          .replace(
            /KP 4 Dusun IV Desa Lubuk Tua, Kec\. Muara Kelingi, Kab\. Musi Rawas, Prov\. Sumatera Selatan/g,
            () => escapeHtml(profile.address)
          );
      }
      if (profile.accreditation) {
        html = html
          .replace(/Terakreditasi A \(Unggul\)/g, () =>
            escapeHtml(profile.accreditation)
          )
          .replace(/Terakreditasi C/g, () => escapeHtml(profile.accreditation))
          .replace(/>Peringkat A</g, () => `>${escapeHtml(profile.accreditation)}<`)
          .replace(/>Unggul \(BAN-S\/M\)</g, ">BAN-PDM / Kemenag RI<");
      }
      if (profile.headmasterName) {
        html = html
          .replace(/Dr\. H\. Ahmad Fauzi, M\.Pd\./g, () =>
            escapeHtml(profile.headmasterName)
          )
          .replace(/Syarip Husin, S\.Sos\., Gr\./g, () =>
            escapeHtml(profile.headmasterName)
          );
      }
      if (profile.headmasterNip) {
        html = html
          .replace(/197605142003121003/g, () =>
            escapeHtml(profile.headmasterNip)
          )
          .replace(/10649207182001/g, () => escapeHtml(profile.headmasterNip));
      }
      if (profile.komiteBankInfo) {
        html = html
          .replace(/Bank Syariah Indonesia \(BSI\) • 7148920115/g, () =>
            escapeHtml(profile.komiteBankInfo)
          )
          .replace(
            /BSI \(Bank Syariah Indonesia\) 7123456789 a\.n\. Komite MTs Nurul Falah/g,
            () => escapeHtml(profile.komiteBankInfo)
          )
          .replace(/Bank Mandiri \| 1130016126868 a\.n\. MTSS NURUL FALAH/g, () =>
            escapeHtml(profile.komiteBankInfo)
          );
      }
      if (profile.gpsLat && profile.gpsLng) {
        const coords = `${escapeHtml(profile.gpsLat)}, ${escapeHtml(profile.gpsLng)}`;
        html = html
          .replace(/-6\.9389,\s*107\.7184/g, () => coords)
          .replace(/-3\.0659978,\s*102\.8196529/g, () => coords);
      }
    }

    // Ganti angka statis siswa & guru di HTML dengan jumlah riil dari database
    if (dbSummary) {
      const stuCount =
        typeof dbSummary.stats?.studentCount === "number"
          ? dbSummary.stats.studentCount
          : Array.isArray(dbSummary.students)
            ? dbSummary.students.length
            : 0;
      const gtkCount =
        typeof dbSummary.stats?.teacherCount === "number"
          ? dbSummary.stats.teacherCount
          : Array.isArray(dbSummary.teachers)
            ? dbSummary.teachers.length
            : 0;
      html = html
        .replace(
          /<strong class="text-slate-800 font-semibold">(?:486|59)<\/strong> Siswa Aktif/g,
          `<strong class="text-slate-800 font-semibold">${Number(stuCount) || 0}</strong> Siswa Aktif`
        )
        .replace(
          /<strong class="text-slate-800 font-semibold">(?:34|14)<\/strong> Pendidik &amp; Tenaga Kependidikan/g,
          `<strong class="text-slate-800 font-semibold">${Number(gtkCount) || 0}</strong> Pendidik &amp; Tenaga Kependidikan`
        );
    }

    const safeSession = sessionPayload ? deepNeutralize(sessionPayload) : null;
    const preloadScript = `<script>
window.__MADRASAH_PROFILE__ = ${safeJsonForScript(profile || {})};
window.__SIMM_PRELOADED_SESSION__ = ${safeJsonForScript(safeSession)};
window.__SIMM_PRELOADED_DB__ = ${safeJsonForScript(dbSummary || null)};
</script>`;
    const bridgeTag = `\n${preloadScript}\n<script src="/simm-bridge.js"></script>\n</body>`;
    if (html.includes("</body>")) {
      html = html.replace("</body>", () => bridgeTag);
    } else {
      html += `\n${preloadScript}\n<script src="/simm-bridge.js"></script>`;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Frame-Options": "SAMEORIGIN",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Portal Route Error]", error);
    return new NextResponse(
      "<h1>Gagal memuat portal: Terjadi kesalahan internal server</h1>",
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
