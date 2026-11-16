"use client";

import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardCheck,
  Newspaper,
  Mail,
  FileSpreadsheet,
  Layers,
  CalendarClock,
  ShieldCheck,
  Calendar,
  HeartHandshake,
  ArrowUpRight,
  Settings,
  CloudUpload,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Archive,
} from "lucide-react";
import DashboardLayout, { NavGroup } from "./DashboardLayout";
import {
  ActiveSession,
  SimmDbSummary,
  callSimmAction,
  uploadToR2,
} from "@/types/simm";

interface AdminTuPortalViewProps {
  mode: "admin" | "tu";
  session: ActiveSession;
  db: SimmDbSummary;
  onRefresh: () => Promise<void>;
  onToast: (msg: string, tone?: "success" | "error" | "info") => void;
  onOpenChangePassword: () => void;
  onRequestLogout: () => void;
}

export default function AdminTuPortalView({
  mode,
  session,
  db,
  onRefresh,
  onToast,
  onOpenChangePassword,
  onRequestLogout,
}: AdminTuPortalViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [busy, setBusy] = useState(false);

  // Buku Induk Filter & Create
  const [rombelFilter, setRombelFilter] = useState("ALL");
  const [newStudent, setNewStudent] = useState({
    name: "",
    nisn: "",
    nis: "",
    rombel: db.academicMaster?.rombels?.[0]?.name || "7A",
    gender: "L",
  });

  // RBAC GTK
  const [rbacTeacherId, setRbacTeacherId] = useState("");
  const [rbacRole, setRbacRole] = useState("GURU_PIKET");
  const [rbacDetail, setRbacDetail] = useState("");

  // CMS Post
  const [cmsTitle, setCmsTitle] = useState("");
  const [cmsCategory, setCmsCategory] = useState("BERITA");
  const [cmsContent, setCmsContent] = useState("");

  // Mail Agenda
  const [mailType, setMailType] = useState("MASUK");
  const [mailNumber, setMailNumber] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailSender, setMailSender] = useState("");
  const [mailFile, setMailFile] = useState<File | null>(null);

  // Academic Master
  const [gradeForm, setGradeForm] = useState({
    code: "",
    label: "",
    phase: "D",
    isFinalGrade: false,
  });
  const [rombelForm, setRombelForm] = useState({
    code: "",
    name: "",
    gradeCode: db.academicMaster?.gradeLevels?.[0]?.code || "7",
    waliKelas: "",
    room: "",
    quota: 32,
  });
  const [subjectForm, setSubjectForm] = useState({
    code: "",
    name: "",
    group: "UMUM",
    jpPerWeek: 2,
  });

  // Academic Period Transition
  const [nextYear, setNextYear] = useState(db.profile.academicYear || "2026/2027");
  const [nextSemester, setNextSemester] = useState(
    db.profile.semester === "Ganjil" ? "Genap" : "Ganjil"
  );

  // Piket Management
  const [dutyDay, setDutyDay] = useState("Senin");
  const [dutyTeachers, setDutyTeachers] = useState("");
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDesc, setIncidentDesc] = useState("");

  // Schedule Builder
  const [schedForm, setSchedForm] = useState({
    day: "Senin",
    timeSlot: "07:00 - 08:20",
    rombel: db.academicMaster?.rombels?.[0]?.name || "7A",
    subject: db.academicMaster?.subjects?.[0]?.name || "Matematika",
    teacherName: db.teachers?.[0]?.name || "",
  });

  // BK Counseling
  const [bkForm, setBkForm] = useState({
    studentId: "",
    category: "PEMBINAAN",
    points: 0,
    note: "",
  });

  // Batch Promotion
  const [promoFrom, setPromoFrom] = useState(
    db.academicMaster?.rombels?.[0]?.name || "7A"
  );
  const [promoTo, setPromoTo] = useState(
    db.academicMaster?.rombels?.[1]?.name || "8A"
  );

  // Go-Live Profile Settings
  const [profileForm, setProfileForm] = useState({
    ...db.profile,
    adminPassword: "",
  });

  // R2 Uploader
  const [r2Folder, setR2Folder] = useState("dokumen-madrasah");
  const [r2File, setR2File] = useState<File | null>(null);
  const [r2ResultUrl, setR2ResultUrl] = useState("");

  const navGroups: NavGroup[] = useMemo(() => {
    const groups: NavGroup[] = [
      {
        title: "Utama",
        items: [
          { key: "overview", label: "Dashboard & Audit", icon: LayoutDashboard },
          {
            key: "buku_induk",
            label: "Buku Induk Siswa",
            icon: GraduationCap,
            badge: String((db.students || []).length),
            badgeTone: "emerald",
          },
          {
            key: "gtk_rbac",
            label: "GTK & Hak Akses RBAC",
            icon: Users,
            badge: String((db.teachers || []).length),
            badgeTone: "sky",
          },
          {
            key: "ppdb_scoring",
            label: "Verifikasi & PPDB",
            icon: ClipboardCheck,
            badge: String((db.ppdb || []).length),
            badgeTone: "amber",
          },
        ],
      },
      {
        title: "Tata Usaha & Layanan",
        items: [
          { key: "tu_persuratan", label: "Persuratan & Koreksi", icon: Mail },
          { key: "tu_agenda", label: "Agenda Surat R2", icon: FileSpreadsheet },
          { key: "tu_emis", label: "Validasi & Ekspor EMIS", icon: Download },
          { key: "cms_publik", label: "CMS Berita Publik", icon: Newspaper },
        ],
      },
      {
        title: "Akademik & Operasional",
        items: [
          { key: "academic_master", label: "Master Kelas & Mapel", icon: Layers },
          {
            key: "academic_period",
            label: "Periode & Arsip",
            icon: CalendarClock,
          },
          { key: "piket_management", label: "Manajemen Guru Piket", icon: ShieldCheck },
          { key: "schedule_conflict", label: "Jadwal Anti-Bentrok", icon: Calendar },
          { key: "bk_counseling", label: "Meja Kerja BK", icon: HeartHandshake },
          { key: "batch_promotion", label: "Kenaikan Kelas Massal", icon: ArrowUpRight },
        ],
      },
    ];

    if (mode === "admin") {
      groups.push({
        title: "Sistem & Infrastruktur",
        items: [
          { key: "golive_settings", label: "Profil & Import Go-Live", icon: Settings },
          { key: "r2_uploader", label: "R2 Cloud Storage", icon: CloudUpload },
        ],
      });
    } else {
      groups.push({
        title: "Penyimpanan",
        items: [{ key: "r2_uploader", label: "R2 Cloud Storage", icon: CloudUpload }],
      });
    }

    return groups;
  }, [mode, db.students, db.teachers, db.ppdb]);

  const filteredStudents = useMemo(() => {
    const list = db.students || [];
    if (rombelFilter === "ALL") return list;
    return list.filter((s: any) => s.rombel === rombelFilter);
  }, [db.students, rombelFilter]);

  const runAction = async (
    action: string,
    payload: Record<string, unknown>,
    successMsg: string
  ) => {
    setBusy(true);
    try {
      const res = await callSimmAction(action, payload);
      if (!res.ok) throw new Error(res.error || `Aksi ${action} gagal.`);
      onToast(successMsg, "success");
      await onRefresh();
      return res;
    } catch (e: any) {
      onToast(e.message || "Terjadi kesalahan.", "error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const tabMeta: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: mode === "admin" ? "Dashboard Super Admin" : "Dashboard Tata Usaha",
      subtitle: `${db.profile.name} • TA ${db.profile.academicYear} (${db.profile.semester})`,
    },
    buku_induk: {
      title: "Buku Induk Peserta Didik",
      subtitle: "Manajemen data siswa aktif berbasis Master Rombel",
    },
    gtk_rbac: {
      title: "Direktori GTK & Hak Akses RBAC",
      subtitle: "Penugasan peran dinamis (Piket, BK, Kurikulum, PPDB, Walas)",
    },
    ppdb_scoring: {
      title: "Seleksi & Migrasi PPDB",
      subtitle: "Verifikasi pendaftar dan migrasi otomatis ke Buku Induk",
    },
    tu_persuratan: {
      title: "Layanan Persuratan & Koreksi Induk",
      subtitle: "Proses pengajuan surat keterangan & pembaruan data",
    },
    tu_agenda: {
      title: "Agenda Surat Masuk & Keluar",
      subtitle: "Arsip digital persuratan terintegrasi Cloudflare R2",
    },
    tu_emis: {
      title: "Validasi EMIS & Ekspor Excel",
      subtitle: "Unduh laporan XLSX siswa dan GTK siap unggah EMIS",
    },
    cms_publik: {
      title: "CMS Berita & Pengumuman Publik",
      subtitle: "Kelola informasi yang tampil di halaman depan madrasah",
    },
    academic_master: {
      title: "Master Tingkat Kelas, Rombel & Mapel",
      subtitle: "Sumber referensi tunggal seluruh dropdown aplikasi",
    },
    academic_period: {
      title: "Periode Akademik & Arsip Semester",
      subtitle: "Transisi semester/tahun ajaran dengan snapshot arsip otomatis",
    },
    piket_management: {
      title: "Manajemen Guru Piket Harian",
      subtitle: "Penjadwalan piket, override petugas, dan log kejadian harian",
    },
    schedule_conflict: {
      title: "Penyusunan Jadwal Anti-Bentrok",
      subtitle: "Validasi bentrok guru dan rombel secara otomatis",
    },
    bk_counseling: {
      title: "Meja Kerja Bimbingan Konseling",
      subtitle: "Catatan pembinaan, prestasi, dan poin siswa",
    },
    batch_promotion: {
      title: "Kenaikan Kelas & Kelulusan Massal",
      subtitle: "Pindahkan seluruh siswa antar rombel dalam satu klik",
    },
    golive_settings: {
      title: "Pengaturan Profil Go-Live & Import XLSX",
      subtitle: "Identitas madrasah, GPS Haversine, rekening komite & reset data",
    },
    r2_uploader: {
      title: "Cloudflare R2 Storage Manager",
      subtitle: "Unggah dokumen lampiran dan arsip ke penyimpanan cloud",
    },
  };

  const currentMeta = tabMeta[activeTab] || tabMeta.overview;

  return (
    <DashboardLayout
      portalBadge={mode === "admin" ? "Super Admin SIMMS" : "Tata Usaha (TU)"}
      portalSubtitle={db.profile.name}
      profile={db.profile}
      session={session}
      navGroups={navGroups}
      activeMenu={activeTab}
      onSelectMenu={setActiveTab}
      pageBreadcrumb={currentMeta.subtitle}
      pageTitle={currentMeta.title}
      onOpenChangePassword={onOpenChangePassword}
      onRequestLogout={onRequestLogout}
    >
      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">
                Total Peserta Didik
              </p>
              <p className="text-3xl font-black text-emerald-700 mt-1">
                {db.stats?.studentCount ?? (db.students || []).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {(db.academicMaster?.rombels || []).length} Rombel aktif
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">
                Pendidik & GTK
              </p>
              <p className="text-3xl font-black text-sky-700 mt-1">
                {db.stats?.teacherCount ?? (db.teachers || []).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Terdaftar aktif</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">
                Pendaftar PPDB
              </p>
              <p className="text-3xl font-black text-amber-600 mt-1">
                {(db.ppdb || []).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Gelombang berjalan</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">
                Layanan Surat
              </p>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {(db.serviceRequests || []).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Permohonan tercatat</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">
              Log Aktivitas & Audit Sistem Terbaru
            </h3>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {(db.activityLogs || []).length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada aktivitas tercatat.</p>
              ) : (
                (db.activityLogs || []).slice(0, 20).map((log: any, idx: number) => (
                  <div
                    key={log.id || idx}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {log.actorName || log.actor || "Sistem"}
                      </span>{" "}
                      <span className="text-slate-600">{log.action || log.detail}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {log.timestamp || log.createdAt || ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* BUKU INDUK SISWA */}
      {activeTab === "buku_induk" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">
              Tambah Peserta Didik Baru
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                type="text"
                placeholder="Nama Lengkap"
                value={newStudent.name}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, name: e.target.value })
                }
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                placeholder="NISN (10 digit)"
                value={newStudent.nisn}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, nisn: e.target.value })
                }
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                placeholder="NIS Lokal"
                value={newStudent.nis}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, nis: e.target.value })
                }
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <select
                value={newStudent.rombel}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, rombel: e.target.value })
                }
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                {(db.academicMaster?.rombels || []).map((r) => (
                  <option key={r.code} value={r.name}>
                    Rombel {r.name}
                  </option>
                ))}
              </select>
              <button
                disabled={busy}
                onClick={() =>
                  runAction(
                    "CREATE_STUDENT",
                    newStudent,
                    "Siswa berhasil ditambahkan ke Buku Induk."
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> Simpan Siswa
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-extrabold text-slate-900">
                Daftar Siswa ({filteredStudents.length})
              </h3>
              <select
                value={rombelFilter}
                onChange={(e) => setRombelFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
              >
                <option value="ALL">Semua Rombel</option>
                {(db.academicMaster?.rombels || []).map((r) => (
                  <option key={r.code} value={r.name}>
                    Rombel {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-4 font-bold">NISN</th>
                    <th className="py-2.5 pr-4 font-bold">Nama</th>
                    <th className="py-2.5 pr-4 font-bold">Rombel</th>
                    <th className="py-2.5 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((st: any) => (
                    <tr key={st.id || st.nisn}>
                      <td className="py-2.5 pr-4 font-mono">{st.nisn}</td>
                      <td className="py-2.5 pr-4 font-bold text-slate-900">
                        {st.name}
                      </td>
                      <td className="py-2.5 pr-4">{st.rombel}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                          {st.status || "AKTIF"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GTK & RBAC */}
      {activeTab === "gtk_rbac" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">
              Tetapkan Peran Tambahan (Dynamic RBAC)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={rbacTeacherId}
                onChange={(e) => setRbacTeacherId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                <option value="">-- Pilih GTK --</option>
                {(db.teachers || []).map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subject || "GTK"})
                  </option>
                ))}
              </select>
              <select
                value={rbacRole}
                onChange={(e) => setRbacRole(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                <option value="GURU_PIKET">GURU_PIKET</option>
                <option value="GURU_BK">GURU_BK</option>
                <option value="WAKA_KURIKULUM">WAKA_KURIKULUM</option>
                <option value="WAKA_KESISWAAN">WAKA_KESISWAAN</option>
                <option value="PANITIA_PPDB">PANITIA_PPDB</option>
                <option value="WALI_KELAS">WALI_KELAS</option>
              </select>
              <input
                type="text"
                placeholder="Detail (misal: Senin / Kelas 7A)"
                value={rbacDetail}
                onChange={(e) => setRbacDetail(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                disabled={busy || !rbacTeacherId}
                onClick={() =>
                  runAction(
                    "ADD_GTK_ROLE",
                    {
                      teacherId: rbacTeacherId,
                      roleType: rbacRole,
                      detail: rbacDetail,
                    },
                    "Peran tambahan GTK berhasil ditambahkan."
                  )
                }
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
              >
                Tambah Peran
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">
              Direktori GTK ({(db.teachers || []).length})
            </h3>
            <div className="space-y-3">
              {(db.teachers || []).map((t: any) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Mapel: {t.subject || "-"} • NIP: {t.nip || "-"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(t.additionalRoles || []).map((r: string) => (
                      <button
                        key={r}
                        onClick={() =>
                          runAction(
                            "REMOVE_GTK_ROLE",
                            { teacherId: t.id, roleType: r },
                            `Peran ${r} dihapus.`
                          )
                        }
                        title="Klik untuk hapus peran"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold hover:bg-rose-50 hover:text-rose-700"
                      >
                        {r} ×
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PPDB SCORING */}
      {activeTab === "ppdb_scoring" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-extrabold text-slate-900 mb-4">
            Verifikasi Pendaftar PPDB ({(db.ppdb || []).length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-bold">No. Reg</th>
                  <th className="py-2.5 pr-4 font-bold">Nama</th>
                  <th className="py-2.5 pr-4 font-bold">Asal Sekolah</th>
                  <th className="py-2.5 pr-4 font-bold">Status</th>
                  <th className="py-2.5 font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(db.ppdb || []).map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-4 font-mono">{p.regNumber || p.id}</td>
                    <td className="py-2.5 pr-4 font-bold text-slate-900">
                      {p.name}
                    </td>
                    <td className="py-2.5 pr-4">{p.originSchool || "-"}</td>
                    <td className="py-2.5 pr-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 flex flex-wrap gap-1.5">
                      <button
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            "UPDATE_PPDB_SCORE_STATUS",
                            { id: p.id, status: "DITERIMA" },
                            "Status PPDB diubah ke DITERIMA."
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold"
                      >
                        Terima
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            "MIGRATE_PPDB_TO_BUKU_INDUK",
                            {
                              id: p.id,
                              targetRombel:
                                db.academicMaster?.rombels?.[0]?.name || "7A",
                            },
                            "Siswa PPDB dimigrasikan ke Buku Induk!"
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold"
                      >
                        Migrasi Induk
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TU PERSURATAN */}
      {activeTab === "tu_persuratan" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-extrabold text-slate-900 mb-4">
            Permohonan Surat & Koreksi Data ({(db.serviceRequests || []).length})
          </h3>
          <div className="space-y-3">
            {(db.serviceRequests || []).length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada permohonan layanan.</p>
            ) : (
              (db.serviceRequests || []).map((req: any) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {req.type || req.title} — {req.requesterName}
                    </p>
                    <p className="text-xs text-slate-500">{req.note || req.detail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-bold">
                      {req.status || "MENUNGGU"}
                    </span>
                    <button
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          "PROCESS_SERVICE_REQUEST",
                          { id: req.id, status: "SELESAI" },
                          "Permohonan surat ditandai SELESAI."
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                    >
                      Selesaikan
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TU AGENDA SURAT */}
      {activeTab === "tu_agenda" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Catat Agenda Surat Baru
            </h3>
            <select
              value={mailType}
              onChange={(e) => setMailType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              <option value="MASUK">Surat Masuk</option>
              <option value="KELUAR">Surat Keluar</option>
            </select>
            <input
              type="text"
              placeholder="Nomor Surat"
              value={mailNumber}
              onChange={(e) => setMailNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              placeholder="Perihal Surat"
              value={mailSubject}
              onChange={(e) => setMailSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              placeholder="Pengirim / Tujuan"
              value={mailSender}
              onChange={(e) => setMailSender(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="file"
              onChange={(e) => setMailFile(e.target.files?.[0] || null)}
              className="text-xs"
            />
            <button
              disabled={busy}
              onClick={async () => {
                let fileUrl = "";
                if (mailFile) {
                  const up = await uploadToR2(mailFile, "agenda-surat");
                  if (up?.ok) fileUrl = up.url;
                }
                await runAction(
                  "CREATE_MAIL_AGENDA",
                  {
                    type: mailType,
                    letterNumber: mailNumber,
                    subject: mailSubject,
                    correspondent: mailSender,
                    attachmentUrl: fileUrl,
                  },
                  "Agenda surat berhasil dicatat."
                );
                setMailNumber("");
                setMailSubject("");
                setMailSender("");
              }}
              className="px-4 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              Simpan Agenda Surat
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">
              Daftar Agenda Surat ({(db.mailAgenda || []).length})
            </h3>
            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {(db.mailAgenda || []).map((m: any, idx: number) => (
                <div
                  key={m.id || idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <span className="font-bold text-sky-700">{m.type}</span> •{" "}
                  <span className="font-mono">{m.letterNumber}</span>
                  <p className="font-bold text-slate-900 mt-1">{m.subject}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TU EMIS EXPORT */}
      {activeTab === "tu_emis" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">
            Ekspor Data EMIS Resmi (.XLSX)
          </h3>
          <p className="text-xs text-slate-500">
            Unduh spreadsheet Excel terformat standar Kemenag EMIS langsung dari
            database madrasah.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/xlsx?type=students"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              <Download className="w-4 h-4" /> Ekspor Buku Induk Siswa (.xlsx)
            </a>
            <a
              href="/api/xlsx?type=teachers"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
            >
              <Download className="w-4 h-4" /> Ekspor Direktori GTK (.xlsx)
            </a>
          </div>
        </div>
      )}

      {/* CMS PUBLIK */}
      {activeTab === "cms_publik" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Terbitkan Berita / Pengumuman Baru
            </h3>
            <input
              type="text"
              placeholder="Judul Artikel / Pengumuman"
              value={cmsTitle}
              onChange={(e) => setCmsTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <select
              value={cmsCategory}
              onChange={(e) => setCmsCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              <option value="BERITA">Berita Madrasah</option>
              <option value="PENGUMUMAN">Pengumuman Resmi</option>
              <option value="PRESTASI">Prestasi Siswa</option>
            </select>
            <textarea
              rows={4}
              placeholder="Isi konten berita..."
              value={cmsContent}
              onChange={(e) => setCmsContent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <button
              disabled={busy || !cmsTitle.trim()}
              onClick={async () => {
                await runAction(
                  "CREATE_CMS_POST",
                  {
                    title: cmsTitle,
                    category: cmsCategory,
                    content: cmsContent,
                  },
                  "Berita publik berhasil diterbitkan!"
                );
                setCmsTitle("");
                setCmsContent("");
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Publikasikan Sekarang
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">
              Artikel Terbit ({(db.cmsPosts || []).length})
            </h3>
            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {(db.cmsPosts || []).map((post: any, i: number) => (
                <div
                  key={post.id || i}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <span className="font-bold text-emerald-700">{post.category}</span>
                  <p className="font-bold text-slate-900 mt-0.5">{post.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ACADEMIC MASTER */}
      {activeTab === "academic_master" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grade Levels */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Tingkat Kelas ({(db.academicMaster?.gradeLevels || []).length})
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Kode (misal: 7)"
                value={gradeForm.code}
                onChange={(e) =>
                  setGradeForm({ ...gradeForm, code: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                placeholder="Label (misal: Kelas VII)"
                value={gradeForm.label}
                onChange={(e) =>
                  setGradeForm({ ...gradeForm, label: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                disabled={busy}
                onClick={() =>
                  runAction(
                    "ADD_GRADE_LEVEL",
                    gradeForm,
                    "Tingkat kelas ditambahkan."
                  )
                }
                className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                + Tambah Tingkat
              </button>
            </div>
            <div className="space-y-1.5">
              {(db.academicMaster?.gradeLevels || []).map((g) => (
                <div
                  key={g.code}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-xs"
                >
                  <span className="font-bold">
                    {g.code} — {g.label}
                  </span>
                  <button
                    onClick={() =>
                      runAction(
                        "DELETE_GRADE_LEVEL",
                        { code: g.code },
                        "Tingkat dihapus."
                      )
                    }
                    className="text-rose-600 hover:text-rose-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Rombels */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Rombongan Belajar ({(db.academicMaster?.rombels || []).length})
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Kode & Nama (misal: 7C)"
                value={rombelForm.name}
                onChange={(e) =>
                  setRombelForm({
                    ...rombelForm,
                    code: e.target.value,
                    name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                placeholder="Wali Kelas"
                value={rombelForm.waliKelas}
                onChange={(e) =>
                  setRombelForm({ ...rombelForm, waliKelas: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                disabled={busy}
                onClick={() =>
                  runAction("ADD_ROMBEL", rombelForm, "Rombel ditambahkan.")
                }
                className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                + Tambah Rombel
              </button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {(db.academicMaster?.rombels || []).map((r) => (
                <div
                  key={r.code}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-xs"
                >
                  <span className="font-bold">
                    {r.name} ({r.waliKelas || "-"})
                  </span>
                  <button
                    onClick={() =>
                      runAction(
                        "DELETE_ROMBEL",
                        { code: r.code },
                        "Rombel dihapus."
                      )
                    }
                    className="text-rose-600 hover:text-rose-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Mata Pelajaran ({(db.academicMaster?.subjects || []).length})
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Kode (misal: MTK)"
                value={subjectForm.code}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, code: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                placeholder="Nama Mapel"
                value={subjectForm.name}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                disabled={busy}
                onClick={() =>
                  runAction("ADD_SUBJECT", subjectForm, "Mapel ditambahkan.")
                }
                className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                + Tambah Mapel
              </button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {(db.academicMaster?.subjects || []).map((s) => (
                <div
                  key={s.code}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-xs"
                >
                  <span className="font-bold">
                    {s.code} — {s.name}
                  </span>
                  <button
                    onClick={() =>
                      runAction(
                        "DELETE_SUBJECT",
                        { code: s.code },
                        "Mapel dihapus."
                      )
                    }
                    className="text-rose-600 hover:text-rose-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ACADEMIC PERIOD */}
      {activeTab === "academic_period" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Transisi Periode Akademik (Auto-Snapshot Arsip)
            </h3>
            <p className="text-xs text-slate-500">
              Saat berpindah semester atau tahun pelajaran, jadwal, presensi, dan
              catatan periode sebelumnya akan diarsipkan secara otomatis.
            </p>
            <input
              type="text"
              value={nextYear}
              onChange={(e) => setNextYear(e.target.value)}
              placeholder="2026/2027"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <select
              value={nextSemester}
              onChange={(e) => setNextSemester(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
            <button
              disabled={busy}
              onClick={() =>
                runAction(
                  "TRANSITION_ACADEMIC_PERIOD",
                  { academicYear: nextYear, semester: nextSemester },
                  "Transisi periode & pengarsipan berhasil dijalankan!"
                )
              }
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
            >
              Arsipkan & Aktifkan Periode Baru
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-600" />
              Arsip Periode Sebelumnya ({(db.academicArchives || []).length})
            </h3>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {(db.academicArchives || []).length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada arsip periode.</p>
              ) : (
                (db.academicArchives || []).map((arc: any, i: number) => (
                  <div
                    key={arc.id || i}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <p className="font-bold text-slate-900">
                      TA {arc.academicYear} — Semester {arc.semester}
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Diarsipkan: {arc.archivedAt || "-"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* PIKET MANAGEMENT */}
      {activeTab === "piket_management" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Atur Jadwal Guru Piket Harian
            </h3>
            <select
              value={dutyDay}
              onChange={(e) => setDutyDay(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Nama Guru Piket (pisahkan dengan koma)"
              value={dutyTeachers}
              onChange={(e) => setDutyTeachers(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <button
              disabled={busy}
              onClick={() =>
                runAction(
                  "SAVE_DAILY_DUTY_SCHEDULE",
                  {
                    day: dutyDay,
                    teachers: dutyTeachers
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                  `Jadwal piket hari ${dutyDay} disimpan.`
                )
              }
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Simpan Jadwal Piket
            </button>

            <hr className="border-slate-100" />
            <h4 className="text-xs font-extrabold text-slate-900">
              Catat Insiden Piket
            </h4>
            <input
              type="text"
              placeholder="Judul Kejadian"
              value={incidentTitle}
              onChange={(e) => setIncidentTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <textarea
              rows={2}
              placeholder="Deskripsi kejadian..."
              value={incidentDesc}
              onChange={(e) => setIncidentDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <button
              disabled={busy}
              onClick={() =>
                runAction(
                  "CREATE_PIKET_INCIDENT",
                  {
                    title: incidentTitle,
                    category: "KETERTIBAN",
                    description: incidentDesc,
                  },
                  "Insiden piket dicatat."
                )
              }
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              Catat Kejadian
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Daftar Jadwal Piket & Insiden Terbaru
            </h3>
            <div className="space-y-2">
              {(db.dutySchedules || []).map((d: any, i: number) => (
                <div
                  key={d.id || i}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between"
                >
                  <span className="font-bold">{d.day}</span>
                  <span>
                    {Array.isArray(d.teachers) ? d.teachers.join(", ") : d.teachers}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE CONFLICT */}
      {activeTab === "schedule_conflict" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h3 className="text-sm font-extrabold text-slate-900">
            Buat Jadwal Pelajaran (Anti-Bentrok Server)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              value={schedForm.day}
              onChange={(e) =>
                setSchedForm({ ...schedForm, day: e.target.value })
              }
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <input
              type="text"
              value={schedForm.timeSlot}
              onChange={(e) =>
                setSchedForm({ ...schedForm, timeSlot: e.target.value })
              }
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <select
              value={schedForm.rombel}
              onChange={(e) =>
                setSchedForm({ ...schedForm, rombel: e.target.value })
              }
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              {(db.academicMaster?.rombels || []).map((r) => (
                <option key={r.code} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              value={schedForm.subject}
              onChange={(e) =>
                setSchedForm({ ...schedForm, subject: e.target.value })
              }
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              {(db.academicMaster?.subjects || []).map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              disabled={busy}
              onClick={() =>
                runAction(
                  "CREATE_CLASS_SCHEDULE",
                  schedForm,
                  "Jadwal pelajaran berhasil ditambahkan."
                )
              }
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Tambah Jadwal
            </button>
          </div>
        </div>
      )}

      {/* BK COUNSELING */}
      {activeTab === "bk_counseling" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-2xl">
          <h3 className="text-sm font-extrabold text-slate-900">
            Catat Konseling Siswa
          </h3>
          <select
            value={bkForm.studentId}
            onChange={(e) => setBkForm({ ...bkForm, studentId: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          >
            <option value="">-- Pilih Siswa --</option>
            {(db.students || []).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.rombel})
              </option>
            ))}
          </select>
          <textarea
            rows={3}
            placeholder="Catatan konseling..."
            value={bkForm.note}
            onChange={(e) => setBkForm({ ...bkForm, note: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <button
            disabled={busy}
            onClick={() =>
              runAction(
                "CREATE_COUNSELING_NOTE",
                bkForm,
                "Catatan konseling BK tersimpan."
              )
            }
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            Simpan Catatan BK
          </button>
        </div>
      )}

      {/* BATCH PROMOTION */}
      {activeTab === "batch_promotion" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-xl">
          <h3 className="text-sm font-extrabold text-slate-900">
            Kenaikan Kelas / Kelulusan Massal
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={promoFrom}
              onChange={(e) => setPromoFrom(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              {(db.academicMaster?.rombels || []).map((r) => (
                <option key={r.code} value={r.name}>
                  Dari: {r.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={promoTo}
              onChange={(e) => setPromoTo(e.target.value)}
              placeholder="Ke Rombel / LULUS"
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <button
            disabled={busy}
            onClick={() =>
              runAction(
                "BATCH_PROMOTE_STUDENTS",
                { fromRombel: promoFrom, toRombel: promoTo },
                `Siswa dari ${promoFrom} berhasil dipindahkan ke ${promoTo}.`
              )
            }
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            Jalankan Kenaikan Massal
          </button>
        </div>
      )}

      {/* GO-LIVE SETTINGS */}
      {activeTab === "golive_settings" && mode === "admin" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-3xl">
          <h3 className="text-sm font-extrabold text-slate-900">
            Identitas Madrasah, GPS & Rekening Komite
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) =>
                setProfileForm({ ...profileForm, name: e.target.value })
              }
              placeholder="Nama Madrasah"
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              value={profileForm.nsm}
              onChange={(e) =>
                setProfileForm({ ...profileForm, nsm: e.target.value })
              }
              placeholder="NSM"
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              value={profileForm.gpsLat}
              onChange={(e) =>
                setProfileForm({ ...profileForm, gpsLat: e.target.value })
              }
              placeholder="Latitude GPS"
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              value={profileForm.gpsLng}
              onChange={(e) =>
                setProfileForm({ ...profileForm, gpsLng: e.target.value })
              }
              placeholder="Longitude GPS"
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="number"
              value={profileForm.gpsRadiusMeters}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  gpsRadiusMeters: Number(e.target.value),
                })
              }
              placeholder="Radius Meter"
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              value={profileForm.komiteBankInfo}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  komiteBankInfo: e.target.value,
                })
              }
              placeholder="Rekening Komite"
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <input
            type="password"
            value={profileForm.adminPassword}
            onChange={(e) =>
              setProfileForm({ ...profileForm, adminPassword: e.target.value })
            }
            placeholder="Password Super Admin (wajib jika mengubah Rekening Komite)"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy}
              onClick={() =>
                runAction(
                  "SAVE_MADRASAH_PROFILE",
                  profileForm,
                  "Profil madrasah berhasil diperbarui!"
                )
              }
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Simpan Pengaturan Madrasah
            </button>
            <button
              disabled={busy}
              onClick={() =>
                runAction(
                  "RESET_DUMMY_DATA",
                  {},
                  "Data simulasi berhasil direset ke standar awal."
                )
              }
              className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold"
            >
              Reset Data Simulasi
            </button>
          </div>
        </div>
      )}

      {/* R2 UPLOADER */}
      {activeTab === "r2_uploader" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-xl">
          <h3 className="text-sm font-extrabold text-slate-900">
            Unggah Dokumen ke Cloudflare R2
          </h3>
          <input
            type="text"
            value={r2Folder}
            onChange={(e) => setR2Folder(e.target.value)}
            placeholder="Nama Folder R2"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <input
            type="file"
            onChange={(e) => setR2File(e.target.files?.[0] || null)}
            className="text-xs"
          />
          <button
            disabled={busy || !r2File}
            onClick={async () => {
              if (!r2File) return;
              setBusy(true);
              try {
                const res = await uploadToR2(r2File, r2Folder);
                if (!res?.ok) throw new Error(res?.error || "Upload R2 gagal.");
                setR2ResultUrl(res.url || "");
                onToast("File berhasil diunggah ke Cloudflare R2!", "success");
              } catch (e: any) {
                onToast(e.message, "error");
              } finally {
                setBusy(false);
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold disabled:opacity-50"
          >
            Upload ke R2
          </button>
          {r2ResultUrl && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs break-all">
              URL R2: <span className="font-mono font-bold">{r2ResultUrl}</span>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
