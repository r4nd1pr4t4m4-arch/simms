"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  CloudUpload,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Mail,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import PortalDashboardLayout, { NavGroup } from "./PortalDashboardLayout";
import SharedModules, { SharedModuleKey } from "./SharedModules";
import { ActiveSession, PortalDbSummary, callSimmAction } from "./types";

interface TuPortalProps {
  db: PortalDbSummary;
  session: ActiveSession | null;
  onRefresh: () => Promise<void> | void;
  onOpenChangePassword: () => void;
  onRequestLogout: () => void;
  triggerToast: (title: string, sub: string) => void;
}

const SHARED_VIEWS: ReadonlySet<string> = new Set<SharedModuleKey>([
  "piket_management",
  "academic_master",
  "golive_settings",
  "ppdb_scoring",
  "batch_promotion",
  "tu_persuratan",
  "tu_agenda",
  "tu_emis",
  "r2_uploader",
]);

const VIEW_TITLES: Record<string, { breadcrumb: string; title: string }> = {
  overview: { breadcrumb: "Tata Usaha / Ringkasan", title: "Dashboard Layanan Tata Usaha" },
  bukuinduk: { breadcrumb: "Tata Usaha / Kesiswaan", title: "Buku Induk & Mutasi Siswa" },
  tu_persuratan: { breadcrumb: "Tata Usaha / Persuratan", title: "Antrean Permohonan Surat" },
  tu_agenda: { breadcrumb: "Tata Usaha / Buku Agenda", title: "Agenda Surat Masuk & Keluar" },
  ppdb: { breadcrumb: "Tata Usaha / PPDB", title: "Daftar Pendaftar PPDB" },
  ppdb_scoring: { breadcrumb: "Tata Usaha / Seleksi PPDB", title: "Verifikasi & Migrasi PPDB" },
  gtk: { breadcrumb: "Tata Usaha / Kepegawaian", title: "Direktori & Administrasi GTK" },
  tu_emis: { breadcrumb: "Tata Usaha / EMIS", title: "Ekspor Data EMIS & VervalPD" },
  academic_master: { breadcrumb: "Tata Usaha / Master Akademik", title: "Tingkat Kelas, Rombel & Mapel" },
  piket_management: { breadcrumb: "Tata Usaha / Piket", title: "Manajemen Guru Piket" },
  batch_promotion: { breadcrumb: "Tata Usaha / Kenaikan Kelas", title: "Kenaikan Kelas & Alumni" },
  r2_uploader: { breadcrumb: "Tata Usaha / Arsip Digital", title: "Upload Dokumen Cloudflare R2" },
  golive_settings: { breadcrumb: "Tata Usaha / Pengaturan", title: "Identitas & Import Data CSV" },
};

export default function TuPortal({
  db,
  session,
  onRefresh,
  onOpenChangePassword,
  onRequestLogout,
  triggerToast,
}: TuPortalProps) {
  const [activeView, setActiveView] = useState<string>("overview");
  const [query, setQuery] = useState("");
  const [rombelFilter, setRombelFilter] = useState("SEMUA");
  const [busy, setBusy] = useState(false);

  const rombelOptions = useMemo(() => {
    const names = (db.academicMaster?.rombels || []).map((r) => r.name);
    return names.length > 0 ? names : ["7A", "8A", "9A"];
  }, [db.academicMaster]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (db.students || []).filter((s) => {
      if (rombelFilter !== "SEMUA" && s.rombel !== rombelFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q)
      );
    });
  }, [db.students, query, rombelFilter]);

  const navGroups: NavGroup[] = [
    {
      title: "Layanan Utama TU",
      items: [
        { key: "overview", label: "Ringkasan Tata Usaha", icon: LayoutDashboard },
        { key: "tu_persuratan", label: "Permohonan Surat", icon: FileText, badge: db.serviceRequests.length },
        { key: "tu_agenda", label: "Agenda Surat Masuk/Keluar", icon: Mail },
        { key: "tu_emis", label: "Ekspor EMIS & VervalPD", icon: FileSpreadsheet },
      ],
    },
    {
      title: "Data Induk & PPDB",
      items: [
        { key: "bukuinduk", label: "Buku Induk Siswa", icon: BookOpen, badge: db.students.length },
        { key: "r2_uploader", label: "Arsip Digital R2", icon: CloudUpload },
        { key: "ppdb", label: "Data Pendaftar PPDB", icon: GraduationCap, badge: db.ppdb.length },
        { key: "ppdb_scoring", label: "Migrasi PPDB ke Induk", icon: FileCheck2 },
        { key: "gtk", label: "Data Kepegawaian GTK", icon: Users, badge: db.teachers.length },
      ],
    },
    {
      title: "Akademik & Operasional",
      items: [
        { key: "academic_master", label: "Master Kelas & Mapel", icon: Layers },
        { key: "piket_management", label: "Manajemen Guru Piket", icon: UserCheck },
        { key: "batch_promotion", label: "Kenaikan Kelas Massal", icon: TrendingUp },
        { key: "golive_settings", label: "Identitas & Import CSV", icon: Settings },
      ],
    },
  ];

  const quickMarkDone = async (id: string, applicantName: string) => {
    setBusy(true);
    try {
      const res = await callSimmAction("PROCESS_SERVICE_REQUEST", { id, status: "Selesai" });
      if (res.ok) {
        triggerToast("Surat Diterbitkan", `Permohonan ${applicantName} telah diselesaikan.`);
        await onRefresh();
      } else {
        triggerToast("Gagal", res.error || "Gagal memproses surat.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <PortalDashboardLayout
      portalBadge="Tata Usaha"
      portalSubtitle="Administrasi & Persuratan"
      profile={db.profile}
      session={session}
      navGroups={navGroups}
      activeView={activeView}
      onSelectView={setActiveView}
      pageMeta={VIEW_TITLES[activeView] || VIEW_TITLES.overview}
      onOpenChangePassword={onOpenChangePassword}
      onRequestLogout={onRequestLogout}
    >
      {SHARED_VIEWS.has(activeView) ? (
        <SharedModules
          moduleKey={activeView as SharedModuleKey}
          db={db}
          session={session}
          onRefresh={onRefresh}
          triggerToast={triggerToast}
          onSelectView={setActiveView}
        />
      ) : activeView === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Total Siswa Induk", value: db.stats.studentCount, sub: "Terverifikasi" },
              { label: "Permohonan Surat", value: db.serviceRequests.length, sub: "Antrean TU" },
              { label: "Agenda Surat", value: db.mailAgenda.length, sub: "Masuk & Keluar" },
              { label: "Pendaftar PPDB", value: db.ppdb.length, sub: `${db.ppdb.filter((p) => p.status === "Diterima" || p.status === "DITERIMA").length} Diterima` },
            ].map((k) => (
              <div key={k.label} className="glass-surface rounded-2xl p-5 shadow-soft">
                <div className="text-xs font-semibold text-slate-500">{k.label}</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-1">{k.value}</div>
                <div className="text-xs text-emerald-700 font-medium mt-1">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Antrean Layanan Surat Terbaru</h3>
              <button
                type="button"
                onClick={() => setActiveView("tu_persuratan")}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                Kelola Semua →
              </button>
            </div>
            {db.serviceRequests.length === 0 ? (
              <p className="text-xs text-slate-500">Tidak ada permohonan surat baru.</p>
            ) : (
              db.serviceRequests.slice(0, 6).map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl bg-white border border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-slate-900">
                      {req.type} — {req.applicantName}
                    </div>
                    <div className="text-[11px] text-slate-500">{req.purpose} • Status: {req.status}</div>
                  </div>
                  <button
                    type="button"
                    disabled={busy || req.status === "Selesai"}
                    onClick={() => quickMarkDone(req.id, req.applicantName)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {req.status === "Selesai" ? "Selesai" : "Terbitkan"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeView === "bukuinduk" ? (
        <div className="space-y-4">
          <div className="glass-surface rounded-2xl p-4 shadow-soft flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama / NIS / NISN..."
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              />
              <select
                value={rombelFilter}
                onChange={(e) => setRombelFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="SEMUA">Semua Rombel</option>
                {rombelOptions.map((r) => (
                  <option key={r} value={r}>
                    Kelas {r}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setActiveView("r2_uploader")}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
            >
              Upload Berkas R2
            </button>
          </div>
          <div className="glass-surface rounded-2xl p-5 shadow-soft overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3">NIS / NISN</th>
                  <th className="py-2.5 px-3">Rombel</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Berkas R2</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-3">{s.nis} / {s.nisn}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700">{s.rombel}</td>
                    <td className="py-2.5 px-3">{s.status}</td>
                    <td className="py-2.5 px-3">{s.r2Documents?.length || 0} berkas</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeView === "ppdb" ? (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Pendaftar PPDB</h3>
            <button
              type="button"
              onClick={() => setActiveView("ppdb_scoring")}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
            >
              Verifikasi & Migrasi
            </button>
          </div>
          {db.ppdb.map((p) => (
            <div key={p.id} className="p-3.5 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-slate-900">{p.fullName}</div>
                <div className="text-xs text-slate-500">
                  {p.regNumber} • {p.originSchool} • NISN {p.nisn}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                {p.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {db.teachers.map((t) => (
            <div key={t.id} className="glass-surface rounded-2xl p-5 shadow-soft">
              <div className="font-bold text-sm text-slate-900">{t.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                NIP: {t.nip || "-"} • {t.subject} • {t.status}
              </div>
              {t.additionalRoles && t.additionalRoles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {t.additionalRoles.map((r: string) => (
                    <span key={r} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalDashboardLayout>
  );
}
