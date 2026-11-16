"use client";

import React, { useMemo, useState } from "react";
import {
  Archive,
  BookOpen,
  Calendar,
  CloudUpload,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HeartHandshake,
  Layers,
  LayoutDashboard,
  Mail,
  Newspaper,
  Settings,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import PortalDashboardLayout, { NavGroup } from "./PortalDashboardLayout";
import SharedModules, { SharedModuleKey } from "./SharedModules";
import { ActiveSession, PortalDbSummary, callSimmAction } from "./types";

interface AdminPortalProps {
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
  "academic_period",
  "golive_settings",
  "ppdb_scoring",
  "schedule_conflict",
  "bk_counseling",
  "batch_promotion",
  "tu_persuratan",
  "tu_agenda",
  "tu_emis",
  "r2_uploader",
]);

const VIEW_TITLES: Record<string, { breadcrumb: string; title: string }> = {
  overview: { breadcrumb: "Dashboard / Ringkasan Eksekutif", title: "Ringkasan Operasional Madrasah" },
  gtk: { breadcrumb: "Manajemen / GTK & Tugas Tambahan", title: "Direktori GTK & Role Tambahan" },
  jadwal: { breadcrumb: "Akademik / Jadwal Pelajaran", title: "Jadwal Pelajaran & Anti-Bentrok" },
  "buku-induk": { breadcrumb: "Kesiswaan / Buku Induk", title: "Buku Induk Siswa Aktif" },
  ppdb: { breadcrumb: "Penerimaan / Antrean PPDB", title: "Pendaftar PPDB Online" },
  cms: { breadcrumb: "Publikasi / CMS Berita", title: "Portal Berita & Pengumuman Madrasah" },
  academic_master: { breadcrumb: "Kurikulum / Master Akademik", title: "Tingkat Kelas, Rombel & Mapel" },
  academic_period: { breadcrumb: "Kurikulum / Periode & Arsip", title: "Transisi Semester & Arsip Akademik" },
  piket_management: { breadcrumb: "Kesiswaan / Manajemen Piket", title: "Jadwal & Log Guru Piket" },
  bk_counseling: { breadcrumb: "Kesiswaan / Bimbingan Konseling", title: "Catatan & Poin Konseling BK" },
  batch_promotion: { breadcrumb: "Kesiswaan / Kenaikan Kelas", title: "Kenaikan Kelas & Kelulusan Massal" },
  tu_persuratan: { breadcrumb: "Tata Usaha / Layanan Surat", title: "Antrean Permohonan Surat" },
  tu_agenda: { breadcrumb: "Tata Usaha / Buku Agenda", title: "Agenda Surat Masuk & Keluar" },
  tu_emis: { breadcrumb: "Tata Usaha / Ekspor EMIS", title: "Sinkronisasi EMIS & VervalPD" },
  ppdb_scoring: { breadcrumb: "Penerimaan / Verifikasi Nilai", title: "Penilaian & Migrasi PPDB" },
  schedule_conflict: { breadcrumb: "Akademik / Penjadwalan", title: "Kelola Jadwal & Cek Bentrok" },
  r2_uploader: { breadcrumb: "Kesiswaan / Arsip Digital", title: "Upload Dokumen Cloudflare R2" },
  golive_settings: { breadcrumb: "Sistem / Pengaturan Madrasah", title: "Identitas, GPS Geofence & CSV" },
};

export default function AdminPortal({
  db,
  session,
  onRefresh,
  onOpenChangePassword,
  onRequestLogout,
  triggerToast,
}: AdminPortalProps) {
  const [activeView, setActiveView] = useState<string>("overview");
  const [busy, setBusy] = useState(false);

  // Buku Induk filters & quick create
  const [studentQuery, setStudentQuery] = useState("");
  const [studentRombelFilter, setStudentRombelFilter] = useState("SEMUA");
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    nis: "",
    nisn: "",
    rombel: db.academicMaster?.rombels?.[0]?.name || "7A",
    gender: "L" as "L" | "P",
  });

  // GTK role assignment modal/form
  const [roleTargetTeacherId, setRoleTargetTeacherId] = useState("");
  const [roleName, setRoleName] = useState("Wali Kelas");
  const [roleDetail, setRoleDetail] = useState("");

  // CMS post composer
  const [cmsTitle, setCmsTitle] = useState("");
  const [cmsCategory, setCmsCategory] = useState<"Pengumuman" | "Berita" | "Prestasi">("Pengumuman");
  const [cmsContent, setCmsContent] = useState("");

  const rombelOptions = useMemo(() => {
    const names = (db.academicMaster?.rombels || []).map((r) => r.name);
    return names.length > 0 ? names : ["7A", "8A", "9A"];
  }, [db.academicMaster]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return (db.students || []).filter((s) => {
      if (studentRombelFilter !== "SEMUA" && s.rombel !== studentRombelFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q)
      );
    });
  }, [db.students, studentQuery, studentRombelFilter]);

  const navGroups: NavGroup[] = [
    {
      title: "Pusat Komando",
      items: [
        { key: "overview", label: "Ringkasan Eksekutif", icon: LayoutDashboard },
        { key: "golive_settings", label: "Pengaturan & GPS Madrasah", icon: Settings },
      ],
    },
    {
      title: "Akademik & Kurikulum",
      items: [
        { key: "academic_master", label: "Master Kelas & Mapel", icon: Layers },
        { key: "jadwal", label: "Jadwal Pelajaran", icon: Calendar, badge: db.schedules.length },
        { key: "schedule_conflict", label: "Tambah & Cek Bentrok", icon: ShieldAlert },
        { key: "academic_period", label: "Semester & Arsip TA", icon: Archive },
      ],
    },
    {
      title: "Kesiswaan & GTK",
      items: [
        { key: "gtk", label: "Direktori GTK & Role", icon: Users, badge: db.teachers.length },
        { key: "buku-induk", label: "Buku Induk Siswa", icon: BookOpen, badge: db.students.length },
        { key: "piket_management", label: "Manajemen Guru Piket", icon: UserCheck },
        { key: "bk_counseling", label: "Bimbingan Konseling", icon: HeartHandshake },
        { key: "batch_promotion", label: "Kenaikan Kelas Massal", icon: TrendingUp },
        { key: "r2_uploader", label: "Arsip Digital R2", icon: CloudUpload },
      ],
    },
    {
      title: "Tata Usaha & PPDB",
      items: [
        { key: "ppdb", label: "Antrean PPDB", icon: GraduationCap, badge: db.ppdb.length },
        { key: "ppdb_scoring", label: "Seleksi & Migrasi PPDB", icon: FileCheck2 },
        { key: "tu_persuratan", label: "Layanan Surat TU", icon: FileText, badge: db.serviceRequests.length },
        { key: "tu_agenda", label: "Agenda Surat Masuk/Keluar", icon: Mail },
        { key: "tu_emis", label: "Ekspor EMIS & VervalPD", icon: FileSpreadsheet },
        { key: "cms", label: "CMS Berita Madrasah", icon: Newspaper },
      ],
    },
  ];

  const handleAction = async (
    action: string,
    payload: Record<string, unknown>,
    okTitle: string,
    okSub: string,
    after?: () => void
  ) => {
    setBusy(true);
    try {
      const res = await callSimmAction(action, payload);
      if (res.ok) {
        triggerToast(okTitle, okSub);
        after?.();
        await onRefresh();
      } else {
        triggerToast("Gagal", res.error || "Aksi ditolak.");
      }
    } catch {
      triggerToast("Error Koneksi", "Tidak dapat menghubungi server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PortalDashboardLayout
      portalBadge="Super Admin"
      portalSubtitle="Pusat Kendali Terpadu"
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
              { label: "Total Siswa Aktif", value: db.stats.studentCount, sub: `${rombelOptions.length} Rombel aktif` },
              { label: "Total GTK & Staf", value: db.stats.teacherCount, sub: "Terdaftar di Direktori" },
              { label: "Antrean PPDB", value: db.ppdb.length, sub: `${db.ppdb.filter((p) => p.status === "Diterima" || p.status === "DITERIMA").length} Diterima` },
              { label: "Layanan Surat TU", value: db.serviceRequests.length, sub: `${db.mailAgenda.length} Agenda surat` },
            ].map((kpi) => (
              <div key={kpi.label} className="glass-surface rounded-2xl p-5 shadow-soft">
                <div className="text-xs font-semibold text-slate-500">{kpi.label}</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-1">{kpi.value}</div>
                <div className="text-xs text-emerald-700 font-medium mt-1">{kpi.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-surface rounded-2xl p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Jejak Aktivitas Sistem (Audit Trail)</h3>
                <span className="text-xs text-slate-500">{db.activityLogs.length} log terbaru</span>
              </div>
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {db.activityLogs.length === 0 ? (
                  <p className="text-xs text-slate-500">Belum ada aktivitas tercatat.</p>
                ) : (
                  db.activityLogs.slice(0, 15).map((log) => (
                    <div key={log.id} className="p-3 rounded-xl bg-white border border-slate-100 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {log.actor} • <span className="text-emerald-700">{log.action}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">{log.detail}</div>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">{log.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-3">
              <h3 className="text-base font-bold text-slate-900">Aksi Cepat Tata Usaha & Akademik</h3>
              {[
                { id: "piket_management", label: "Atur & Log Guru Piket" },
                { id: "academic_master", label: "Kelola Tingkat, Rombel & Mapel" },
                { id: "academic_period", label: "Tutup Semester / Arsip TA" },
                { id: "tu_persuratan", label: "Proses Permohonan Surat TU" },
                { id: "golive_settings", label: "Pengaturan GPS & Rekening Komite" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setActiveView(btn.id)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 text-xs font-semibold text-slate-800 transition flex items-center justify-between"
                >
                  <span>{btn.label}</span>
                  <span className="text-emerald-600">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : activeView === "gtk" ? (
        <div className="space-y-6">
          <div className="glass-surface rounded-2xl p-5 shadow-soft grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-600">Pilih GTK</label>
              <select
                value={roleTargetTeacherId}
                onChange={(e) => setRoleTargetTeacherId(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="">-- Pilih GTK --</option>
                {db.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Tugas Tambahan</label>
              <select
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Wali Kelas">Wali Kelas</option>
                <option value="Guru Piket">Guru Piket</option>
                <option value="Guru BK">Guru BK</option>
                <option value="Bendahara Komite">Bendahara Komite</option>
                <option value="Operator EMIS">Operator EMIS</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Keterangan (misal: 7A)</label>
              <input
                type="text"
                value={roleDetail}
                onChange={(e) => setRoleDetail(e.target.value)}
                placeholder="Kelas / Hari / Bidang"
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={busy || !roleTargetTeacherId}
              onClick={() =>
                handleAction(
                  "ADD_GTK_ROLE",
                  { teacherId: roleTargetTeacherId, role: roleName, detail: roleDetail.trim() },
                  "Tugas Tambahan Ditetapkan",
                  `${roleName} berhasil ditambahkan ke akun GTK.`,
                  () => setRoleDetail("")
                )
              }
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              Tambah Tugas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {db.teachers.map((t) => (
              <div key={t.id} className="glass-surface rounded-2xl p-5 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                    <div className="text-xs text-slate-500">
                      NIP/NUPTK: {t.nip || "-"} • {t.subject}
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                    {t.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(t.additionalRoles || []).map((r: string) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold"
                    >
                      {r}
                      {t.roleDetails?.[r] ? ` (${t.roleDetails[r]})` : ""}
                      <button
                        type="button"
                        onClick={() =>
                          handleAction(
                            "REMOVE_GTK_ROLE",
                            { teacherId: t.id, role: r },
                            "Role Dihapus",
                            `${r} dilepas dari ${t.name}.`
                          )
                        }
                        className="text-rose-500 hover:text-rose-700 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeView === "jadwal" ? (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Jadwal Pelajaran Madrasah</h3>
            <button
              type="button"
              onClick={() => setActiveView("schedule_conflict")}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
            >
              + Tambah Jadwal (Cek Bentrok)
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3">Hari</th>
                  <th className="py-2.5 px-3">Jam</th>
                  <th className="py-2.5 px-3">Rombel</th>
                  <th className="py-2.5 px-3">Mata Pelajaran</th>
                  <th className="py-2.5 px-3">Guru Pengampu</th>
                  <th className="py-2.5 px-3">Ruang</th>
                </tr>
              </thead>
              <tbody>
                {db.schedules.map((sc) => (
                  <tr key={sc.id} className="border-b border-slate-100">
                    <td className="py-2.5 px-3 font-semibold">{sc.day}</td>
                    <td className="py-2.5 px-3">{sc.startTime} - {sc.endTime}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700">{sc.rombel}</td>
                    <td className="py-2.5 px-3">{sc.subject}</td>
                    <td className="py-2.5 px-3">{sc.teacherName}</td>
                    <td className="py-2.5 px-3 text-slate-500">{sc.room}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeView === "buku-induk" ? (
        <div className="space-y-4">
          <div className="glass-surface rounded-2xl p-4 shadow-soft flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Cari nama, NIS, atau NISN..."
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              />
              <select
                value={studentRombelFilter}
                onChange={(e) => setStudentRombelFilter(e.target.value)}
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
              onClick={() => setShowAddStudent((v) => !v)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
            >
              {showAddStudent ? "Tutup Form" : "+ Tambah Siswa Baru"}
            </button>
          </div>

          {showAddStudent && (
            <div className="glass-surface rounded-2xl p-5 shadow-soft grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <input
                type="text"
                placeholder="Nama Lengkap"
                value={newStudent.name}
                onChange={(e) => setNewStudent((p) => ({ ...p, name: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                type="text"
                placeholder="NIS"
                value={newStudent.nis}
                onChange={(e) => setNewStudent((p) => ({ ...p, nis: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                type="text"
                placeholder="NISN"
                value={newStudent.nisn}
                onChange={(e) => setNewStudent((p) => ({ ...p, nisn: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <select
                value={newStudent.rombel}
                onChange={(e) => setNewStudent((p) => ({ ...p, rombel: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {rombelOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !newStudent.name.trim() || !newStudent.nisn.trim()}
                onClick={() =>
                  handleAction(
                    "CREATE_STUDENT",
                    newStudent,
                    "Siswa Ditambahkan",
                    `${newStudent.name} masuk ke Buku Induk kelas ${newStudent.rombel}.`,
                    () => {
                      setNewStudent((p) => ({ ...p, name: "", nis: "", nisn: "" }));
                      setShowAddStudent(false);
                    }
                  )
                }
                className="py-2 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
              >
                Simpan Siswa
              </button>
            </div>
          )}

          <div className="glass-surface rounded-2xl p-5 shadow-soft overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3">NIS / NISN</th>
                  <th className="py-2.5 px-3">Rombel</th>
                  <th className="py-2.5 px-3">JK</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Arsip R2</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-3">{s.nis} / {s.nisn}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700">{s.rombel}</td>
                    <td className="py-2.5 px-3">{s.gender}</td>
                    <td className="py-2.5 px-3">{s.status}</td>
                    <td className="py-2.5 px-3">{s.r2Documents?.length || 0} berkas</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeView === "ppdb" ? (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Antrean Pendaftar PPDB</h3>
            <button
              type="button"
              onClick={() => setActiveView("ppdb_scoring")}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
            >
              Buka Penilaian & Migrasi
            </button>
          </div>
          <div className="space-y-2.5">
            {db.ppdb.map((p) => (
              <div key={p.id} className="p-3.5 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    {p.fullName} ({p.regNumber})
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.originSchool} • NISN {p.nisn} • Jalur {p.track}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-3">
            <h3 className="text-base font-bold text-slate-900">Publikasikan Berita / Pengumuman</h3>
            <input
              type="text"
              value={cmsTitle}
              onChange={(e) => setCmsTitle(e.target.value)}
              placeholder="Judul artikel / pengumuman..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <select
              value={cmsCategory}
              onChange={(e) => setCmsCategory(e.target.value as "Pengumuman" | "Berita" | "Prestasi")}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="Pengumuman">Pengumuman</option>
              <option value="Berita">Berita</option>
              <option value="Prestasi">Prestasi</option>
            </select>
            <textarea
              rows={5}
              value={cmsContent}
              onChange={(e) => setCmsContent(e.target.value)}
              placeholder="Isi berita atau pengumuman resmi madrasah..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <button
              type="button"
              disabled={busy || !cmsTitle.trim() || !cmsContent.trim()}
              onClick={() =>
                handleAction(
                  "CREATE_CMS_POST",
                  {
                    title: cmsTitle.trim(),
                    category: cmsCategory,
                    content: cmsContent.trim(),
                    author: session?.name || "Admin Madrasah",
                  },
                  "Berita Dipublikasikan",
                  "Artikel tampil di halaman Beranda Publik.",
                  () => {
                    setCmsTitle("");
                    setCmsContent("");
                  }
                )
              }
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              Terbitkan ke Portal Publik
            </button>
          </div>
          <div className="lg:col-span-2 glass-surface rounded-2xl p-6 shadow-soft space-y-3">
            <h4 className="text-sm font-bold text-slate-800">Daftar Publikasi ({db.cmsPosts.length})</h4>
            {db.cmsPosts.map((post) => (
              <div key={post.id} className="p-4 rounded-xl bg-white border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-slate-400">{post.publishedAt}</span>
                </div>
                <div className="font-bold text-sm text-slate-900 mt-1">{post.title}</div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{post.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PortalDashboardLayout>
  );
}
