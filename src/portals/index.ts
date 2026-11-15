/**
 * Registry Modul Portal Native SIMM (Next.js App Router)
 * Seluruh 7 portal SIMM kini terintegrasi penuh sebagai modul TypeScript di dalam `src/portals/`
 * tanpa bergantung pada file `Prototype *.html` di luar `src/`.
 */

import { PUBLIK_PORTAL_TEMPLATE } from "./publik-portal";
import { PPDB_PORTAL_TEMPLATE } from "./ppdb-portal";
import { ADMIN_PORTAL_TEMPLATE } from "./admin-portal";
import { TU_PORTAL_TEMPLATE } from "./tu-portal";
import { GTK_PORTAL_TEMPLATE } from "./gtk-portal";
import { SISWA_PORTAL_TEMPLATE } from "./siswa-portal";
import { ORTU_PORTAL_TEMPLATE } from "./ortu-portal";

export type SimmPortalKey =
  | "publik"
  | "ppdb"
  | "admin"
  | "tu"
  | "gtk"
  | "siswa"
  | "ortu";

export const PORTAL_TEMPLATES: Record<SimmPortalKey, string> = {
  publik: PUBLIK_PORTAL_TEMPLATE,
  ppdb: PPDB_PORTAL_TEMPLATE,
  admin: ADMIN_PORTAL_TEMPLATE,
  tu: TU_PORTAL_TEMPLATE,
  gtk: GTK_PORTAL_TEMPLATE,
  siswa: SISWA_PORTAL_TEMPLATE,
  ortu: ORTU_PORTAL_TEMPLATE,
};

export function getPortalTemplate(portalKey: string): string {
  const normalized = (portalKey || "publik").toLowerCase() as SimmPortalKey;
  return PORTAL_TEMPLATES[normalized] || PORTAL_TEMPLATES.publik;
}
