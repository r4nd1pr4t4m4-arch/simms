import { NextRequest, NextResponse } from "next/server";
import { getPortalDatabaseSummary } from "@/app/api/simm/route";
import { getServerSession } from "@/lib/auth";
import { getPortalTemplate } from "@/portals";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { portal: string } }
) {
  try {
    const portalKey = (params.portal || "publik").toLowerCase();
    const rawHtml = getPortalTemplate(portalKey);

    const [session, dbSummary] = await Promise.all([
      getServerSession().catch(() => null),
      getPortalDatabaseSummary().catch(() => null),
    ]);

    let html = rawHtml;
    const profile = dbSummary?.profile;

    if (profile) {
      if (profile.name) {
        html = html.replace(/MTs Nurul Falah/g, profile.name);
      }
      if (profile.nsm) {
        html = html
          .replace(/121232040089/g, profile.nsm)
          .replace(/121216050060/g, profile.nsm);
      }
      if (profile.npsn) {
        html = html
          .replace(/20278412/g, profile.npsn)
          .replace(/69963460/g, profile.npsn);
      }
      if (profile.address) {
        html = html
          .replace(
            /Jl\. Pendidikan No\. 45, Kel\. Mekarjaya, Kec\. Cileunyi, Kab\. Bandung, Jawa Barat 40622/g,
            profile.address
          )
          .replace(
            /KP 4 Dusun IV Desa Lubuk Tua, Kec\. Muara Kelingi, Kab\. Musi Rawas, Prov\. Sumatera Selatan/g,
            profile.address
          );
      }
      if (profile.accreditation) {
        html = html
          .replace(/Terakreditasi A \(Unggul\)/g, profile.accreditation)
          .replace(/Terakreditasi C/g, profile.accreditation)
          .replace(/>Peringkat A</g, `>${profile.accreditation}<`)
          .replace(/>Unggul \(BAN-S\/M\)</g, `>BAN-PDM / Kemenag RI<`);
      }
      if (profile.headmasterName) {
        html = html
          .replace(/Dr\. H\. Ahmad Fauzi, M\.Pd\./g, profile.headmasterName)
          .replace(/Syarip Husin, S\.Sos\., Gr\./g, profile.headmasterName);
      }
      if (profile.headmasterNip) {
        html = html
          .replace(/197605142003121003/g, profile.headmasterNip)
          .replace(/10649207182001/g, profile.headmasterNip);
      }
      if (profile.komiteBankInfo) {
        html = html
          .replace(
            /Bank Syariah Indonesia \(BSI\) • 7148920115/g,
            profile.komiteBankInfo
          )
          .replace(
            /BSI \(Bank Syariah Indonesia\) 7123456789 a\.n\. Komite MTs Nurul Falah/g,
            profile.komiteBankInfo
          )
          .replace(
            /Bank Mandiri \| 1130016126868 a\.n\. MTSS NURUL FALAH/g,
            profile.komiteBankInfo
          );
      }
      if (profile.gpsLat && profile.gpsLng) {
        html = html
          .replace(
            /-6\.9389,\s*107\.7184/g,
            `${profile.gpsLat}, ${profile.gpsLng}`
          )
          .replace(
            /-3\.0659978,\s*102\.8196529/g,
            `${profile.gpsLat}, ${profile.gpsLng}`
          );
      }
    }

    // Ganti angka statis siswa & guru di HTML dengan jumlah riil dari database
    if (dbSummary) {
      const stuCount = Array.isArray(dbSummary.students)
        ? dbSummary.students.length
        : 0;
      const gtkCount = Array.isArray(dbSummary.teachers)
        ? dbSummary.teachers.length
        : 0;
      html = html
        .replace(
          /<strong class="text-slate-800 font-semibold">(?:486|59)<\/strong> Siswa Aktif/g,
          `<strong class="text-slate-800 font-semibold">${stuCount}</strong> Siswa Aktif`
        )
        .replace(
          /<strong class="text-slate-800 font-semibold">(?:34|14)<\/strong> Pendidik &amp; Tenaga Kependidikan/g,
          `<strong class="text-slate-800 font-semibold">${gtkCount}</strong> Pendidik &amp; Tenaga Kependidikan`
        );
    }

    // Sisipkan data sesi & database preloaded agar semua menu sidebar dan data riil tampil serentak (0ms delay)
    const preloadScript = `<script>
window.__MADRASAH_PROFILE__ = ${JSON.stringify(profile || {})};
window.__SIMM_PRELOADED_SESSION__ = ${JSON.stringify(session || null)};
window.__SIMM_PRELOADED_DB__ = ${JSON.stringify(dbSummary || null)};
</script>`;
    const bridgeTag = `\n${preloadScript}\n<script src="/simm-bridge.js"></script>\n</body>`;
    if (html.includes("</body>")) {
      html = html.replace("</body>", bridgeTag);
    } else {
      html += `\n${preloadScript}\n<script src="/simm-bridge.js"></script>`;
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
      `<h1>Gagal memuat portal: ${error?.message || "Kesalahan internal"}</h1>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
