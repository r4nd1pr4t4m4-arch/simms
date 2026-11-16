"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Globe,
  UserPlus,
  ShieldCheck,
  FileSpreadsheet,
  GraduationCap,
  Users,
  HeartHandshake,
  Database,
  CloudUpload,
  CalendarClock,
  Award,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Layers,
  Send,
  LogOut,
  KeyRound,
  Lock,
  Building2,
  Download,
  Upload,
  Trash2,
} from "lucide-react";

export type PortalKey =
  | "publik"
  | "ppdb"
  | "admin"
  | "tu"
  | "gtk"
  | "siswa"
  | "ortu";

interface ActiveSession {
  userId: string;
  identifier: string;
  name: string;
  baseRole: "ADMIN" | "TU" | "GTK" | "SISWA" | "ORTU" | "PPDB";
  subProfileKey?: string;
  additionalRoles?: string[];
  targetPath: string;
}

interface PortalTab {
  key: PortalKey;
  label: string;
  sublabel: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PORTAL_TABS: PortalTab[] = [
  {
    key: "publik",
    label: "Halaman Publik",
    sublabel: "CMS & Live Piket",
    href: "/",
    icon: Globe,
  },
  {
    key: "ppdb",
    label: "Portal PPDB",
    sublabel: "End-to-End R2",
    href: "/ppdb",
    icon: UserPlus,
  },
  {
    key: "admin",
    label: "Super Admin",
    sublabel: "RBAC & Inval",
    href: "/admin",
    icon: ShieldCheck,
  },
  {
    key: "tu",
    label: "Tata Usaha (TU)",
    sublabel: "Buku Induk & EMIS",
    href: "/tu",
    icon: FileSpreadsheet,
  },
  {
    key: "gtk",
    label: "Guru & GTK",
    sublabel: "Dynamic RBAC",
    href: "/gtk",
    icon: GraduationCap,
  },
  {
    key: "siswa",
    label: "Portal Siswa",
    sublabel: "KBM & Tabungan",
    href: "/siswa",
    icon: Users,
  },
  {
    key: "ortu",
    label: "Orang Tua / Wali",
    sublabel: "Multi-Child Sync",
    href: "/ortu",
    icon: HeartHandshake,
  },
];

type ExtendedModalType =
  | null
  | "ppdb_scoring"
  | "schedule_conflict"
  | "bk_counseling"
  | "batch_promotion"
  | "r2_uploader"
  | "change_password"
  | "logout_confirm"
  | "golive_settings"
  | "academic_master"
  | "academic_period"
  | "tu_persuratan"
  | "tu_agenda"
  | "tu_emis"
  | "piket_management";

export default function SimmWorkspaceShell({
  activePortal,
}: {
  activePortal: PortalKey;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [barCollapsed, setBarCollapsed] = useState(false);
  const [activeModal, setActiveModal] = useState<ExtendedModalType>(null);
  const [iframeRefreshKey, setIframeRefreshKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ title: string; sub: string } | null>(
    null
  );

  // State Ubah Kata Sandi
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // State Go-Live Settings, Import CSV & Identitas Madrasah
  const [goLiveTab, setGoLiveTab] = useState<
    "identitas" | "import_csv" | "reset_data"
  >("identitas");
  const [madrasahProfile, setMadrasahProfile] = useState({
    name: "MTs Nurul Falah",
    nsm: "121216050060",
    npsn: "69963460",
    accreditation: "Terakreditasi C",
    academicYear: "2026/2027",
    semester: "Ganjil",
    curriculum: "Kurikulum Merdeka & KMA 450",
    headmasterName: "Syarip Husin, S.Sos., Gr.",
    headmasterNip: "10649207182001",
    tuHeadName: "-",
    tuHeadNip: "-",
    address:
      "Jl. Jambi Lama RT. 004 Kel. Terawas Kec. STL Ulu Terawas Kab. Musi Rawas 30771",
    phone: "-",
    email: "info@mtsnurulfalah.sch.id",
    gpsLat: "-3.0659978",
    gpsLng: "102.8196529",
    gpsRadiusMeters: 100,
    komiteBankInfo: "Bank Mandiri | 1130016126868 a.n. MTSS NURUL FALAH",
  });
  const [profileAdminPassword, setProfileAdminPassword] = useState("");
  const [importTarget, setImportTarget] = useState<"students" | "teachers">(
    "students"
  );
  const [csvPreviewRows, setCsvPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [importingCsv, setImportingCsv] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const [realTeacherNames, setRealTeacherNames] = useState<string[]>([
    "Ananda Roza, S.Pd.I.",
    "Della Hesaftra Lova, S.Pd.",
    "Endry Ovriyanty, S.Pd.",
    "Fauzia, S.Pd.",
    "Ida Royani, S.Pd.",
    "Neri Silfiana, S.Pd.",
    "Randi Pratama S.Pd.",
    "Sri Aryani, S.Pd.",
    "Syaifullah, S.Pd.",
    "Syarip Husin, S.Sos., Gr.",
  ]);
  const [realStudentLabels, setRealStudentLabels] = useState<string[]>([
    "Agung Saputra (7A)",
  ]);
  const [realRombels, setRealRombels] = useState<string[]>(["7A", "8A", "9A"]);
  const [realSubjects, setRealSubjects] = useState<string[]>([
    "Al-Qur'an Hadits",
    "Akidah Akhlak",
    "Fiqih",
    "Sejarah Kebudayaan Islam (SKI)",
    "Bahasa Arab",
    "Pendidikan Pancasila",
    "Bahasa Indonesia",
    "Matematika",
    "IPA Terpadu",
    "Ilmu Pengetahuan Sosial",
    "Bahasa Inggris",
    "PJOK",
    "Informatika",
    "Seni Budaya & Prakarya",
    "Tahfidzul Qur'an & BTQ",
    "Bimbingan & Konseling",
  ]);

  // State Master Akademik (Tingkat Kelas, Rombel, Mata Pelajaran)
  const [masterTab, setMasterTab] = useState<"grades" | "rombels" | "subjects">(
    "rombels"
  );
  const [gradeLevels, setGradeLevels] = useState<
    Array<{ code: string; label: string; phase: string; isFinalGrade: boolean }>
  >([
    {
      code: "VII",
      label: "Kelas VII (Tingkat 7)",
      phase: "Fase D — Kurikulum Merdeka & KMA 450",
      isFinalGrade: false,
    },
    {
      code: "VIII",
      label: "Kelas VIII (Tingkat 8)",
      phase: "Fase D — Kurikulum Merdeka & KMA 450",
      isFinalGrade: false,
    },
    {
      code: "IX",
      label: "Kelas IX (Tingkat 9 / Tingkat Akhir)",
      phase: "Fase D — Kurikulum Merdeka & KMA 450",
      isFinalGrade: true,
    },
  ]);
  const [masterRombels, setMasterRombels] = useState<
    Array<{
      code: string;
      name: string;
      gradeCode: string;
      waliKelas: string;
      room: string;
      quota: number;
    }>
  >([]);
  const [masterSubjects, setMasterSubjects] = useState<
    Array<{ code: string; name: string; group: string; jpPerWeek: number }>
  >([]);

  // Form tambah Tingkat Kelas
  const [newGradeCode, setNewGradeCode] = useState("");
  const [newGradeLabel, setNewGradeLabel] = useState("");
  const [newGradePhase, setNewGradePhase] = useState(
    "Fase D — Kurikulum Merdeka & KMA 450"
  );
  const [newGradeFinal, setNewGradeFinal] = useState(false);

  // Form tambah Rombel
  const [newRombelCode, setNewRombelCode] = useState("");
  const [newRombelName, setNewRombelName] = useState("");
  const [newRombelGrade, setNewRombelGrade] = useState("VII");
  const [newRombelWali, setNewRombelWali] = useState("");
  const [newRombelRoom, setNewRombelRoom] = useState("");
  const [newRombelQuota, setNewRombelQuota] = useState(32);

  // Form tambah Mata Pelajaran
  const [newSubjCode, setNewSubjCode] = useState("");
  const [newSubjName, setNewSubjName] = useState("");
  const [newSubjGroup, setNewSubjGroup] = useState(
    "PAI & Bahasa Arab (KMA 450)"
  );
  const [newSubjJp, setNewSubjJp] = useState(2);

  // State Pergantian Semester / Tahun Pelajaran & Arsip Akademik
  const [periodTab, setPeriodTab] = useState<"transition" | "archives">(
    "transition"
  );
  const [targetAcadYear, setTargetAcadYear] = useState("2026/2027");
  const [targetSemester, setTargetSemester] = useState<"Ganjil" | "Genap">(
    "Genap"
  );
  const [targetCurriculum, setTargetCurriculum] = useState(
    "Kurikulum Merdeka & KMA 450"
  );
  const [resetSemesterPoints, setResetSemesterPoints] = useState(true);
  const [autoPromoteAndGraduate, setAutoPromoteAndGraduate] = useState(true);
  const [transitionNotes, setTransitionNotes] = useState("");
  const [academicArchives, setAcademicArchives] = useState<Array<any>>([]);

  // State Modul TU Terpadu di Dashboard Admin (Persuratan, Agenda, Audit EMIS)
  const [tuStudentsList, setTuStudentsList] = useState<Array<any>>([]);
  const [tuServiceRequests, setTuServiceRequests] = useState<Array<any>>([]);
  const [tuMailAgenda, setTuMailAgenda] = useState<Array<any>>([]);
  const [newAgType, setNewAgType] = useState("Surat Masuk");
  const [newAgCat, setNewAgCat] = useState("Kemenag");
  const [newAgNo, setNewAgNo] = useState("B-155/MTs.NF/PP.00.5/11/2026");
  const [newAgDate, setNewAgDate] = useState("16 Nov 2026");
  const [newAgParty, setNewAgParty] = useState("");
  const [newAgSubject, setNewAgSubject] = useState("");
  const [newAgR2Key, setNewAgR2Key] = useState("");

  // State Halaman Manajemen Guru Piket
  const [piketTab, setPiketTab] = useState<"schedule" | "incidents" | "attendance">(
    "schedule"
  );
  const [dutySchedules, setDutySchedules] = useState<Array<any>>([]);
  const [piketIncidents, setPiketIncidents] = useState<Array<any>>([]);
  const [teacherAttendances, setTeacherAttendances] = useState<Array<any>>([]);
  const [studentLeaves, setStudentLeaves] = useState<Array<any>>([]);
  const [newDutyDay, setNewDutyDay] = useState("Senin");
  const [newDutyShift, setNewDutyShift] = useState("Piket Pagi (06.45 – 11.00)");
  const [newDutyTeacher, setNewDutyTeacher] = useState("");
  const [overrideTargetId, setOverrideTargetId] = useState("");
  const [overrideTeacher, setOverrideTeacher] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [incStudent, setIncStudent] = useState("");
  const [incClassroom, setIncClassroom] = useState("7A");
  const [incType, setIncType] = useState("Terlambat Masuk");
  const [incReason, setIncReason] = useState("");

  // State Modul 1: Panitia PPDB (Input Skor Seleksi & Ranking)
  const [ppdbApplicants, setPpdbApplicants] = useState<
    Array<{
      regNo: string;
      name: string;
      nisn: string;
      track: string;
      school: string;
      btq: number;
      academic: number;
      interview: number;
      status: string;
      rombel: string;
    }>
  >([]);

  // State Modul 2: Penyusunan Jadwal Pelajaran Anti-Bentrok
  const [schedules, setSchedules] = useState<
    Array<{
      id: string;
      day: string;
      slot: string;
      rombel: string;
      subject: string;
      teacher: string;
    }>
  >([]);
  const [newSchDay, setNewSchDay] = useState("Senin");
  const [newSchSlot, setNewSchSlot] = useState("Jam ke 1–2 (07.30 – 08.50)");
  const [newSchRombel, setNewSchRombel] = useState("7A");
  const [newSchSubject, setNewSchSubject] = useState("Matematika");
  const [newSchTeacher, setNewSchTeacher] = useState("Randi Pratama S.Pd.");

  // State Modul 3: Meja Kerja Guru Wali / BK
  const [bkRecords, setBkRecords] = useState<
    Array<{
      id: string;
      student: string;
      type: string;
      points: number;
      note: string;
      date: string;
    }>
  >([]);
  const [bkStudent, setBkStudent] = useState("Agung Saputra (7A)");
  const [bkCategory, setBkCategory] = useState("Prestasi & Apresiasi (+Poin)");
  const [bkPoints, setBkPoints] = useState(10);
  const [bkNote, setBkNote] = useState("");
  const [bkReplyText, setBkReplyText] = useState("");
  const [bkChatThread, setBkChatThread] = useState<
    Array<{ sender: string; role: string; text: string; time: string }>
  >([]);

  // State Modul 4: Kenaikan Kelas Massal
  const [fromRombel, setFromRombel] = useState("7A");
  const [toRombel, setToRombel] = useState("8A");
  const [batchHistory, setBatchHistory] = useState<string[]>([]);

  // State Modul 5: Direct Cloudflare R2 Uploader
  const [r2Uploading, setR2Uploading] = useState(false);
  const [r2UploadedFiles, setR2UploadedFiles] = useState<
    Array<{ key: string; url: string; size: number; time: string }>
  >([]);

  const triggerToast = (title: string, sub: string) => {
    setToastMsg({ title, sub });
    setTimeout(() => setToastMsg(null), 4500);
  };

  // Muat sesi aktif & data riil madrasah dari server
  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((authData) => {
        const currentSess = authData?.session || null;
        setSession(currentSess);
        const resource = currentSess ? "summary" : "profile";
        return fetch(`/api/simm?resource=${resource}`).then((r) => r.json());
      })
      .then((d) => {
        if (d?.profile) {
          setMadrasahProfile(d.profile);
          setTargetAcadYear(d.profile.academicYear || "2026/2027");
          setTargetSemester(
            d.profile.semester === "Ganjil" ? "Genap" : "Ganjil"
          );
          setTargetCurriculum(
            d.profile.curriculum || "Kurikulum Merdeka & KMA 450"
          );
        }
        if (d?.academicMaster) {
          if (Array.isArray(d.academicMaster.gradeLevels)) {
            setGradeLevels(d.academicMaster.gradeLevels);
          }
          if (Array.isArray(d.academicMaster.rombels)) {
            setMasterRombels(d.academicMaster.rombels);
          }
          if (Array.isArray(d.academicMaster.subjects)) {
            setMasterSubjects(d.academicMaster.subjects);
            const sNames = d.academicMaster.subjects
              .map((s: any) => String(s.name || "").trim())
              .filter(Boolean);
            if (sNames.length > 0) {
              setRealSubjects(sNames);
              setNewSchSubject(sNames[0]);
            }
          }
        }
        if (Array.isArray(d?.academicArchives)) {
          setAcademicArchives(d.academicArchives);
        }
        if (Array.isArray(d?.teachers) && d.teachers.length > 0) {
          const tNames = d.teachers.map(
            (t: any) => t.user?.name || t.nip
          );
          setRealTeacherNames(tNames);
          setNewSchTeacher(tNames[0]);
          setNewRombelWali(tNames[0]);
          setNewDutyTeacher(tNames[0]);
          setOverrideTeacher(tNames[0]);
        }
        if (Array.isArray(d?.dutySchedules)) setDutySchedules(d.dutySchedules);
        if (Array.isArray(d?.piketIncidents)) setPiketIncidents(d.piketIncidents);
        if (Array.isArray(d?.teacherAttendances)) {
          setTeacherAttendances(d.teacherAttendances);
        }
        if (Array.isArray(d?.studentLeaves)) setStudentLeaves(d.studentLeaves);
        if (Array.isArray(d?.students)) {
          setTuStudentsList(d.students);
        }
        if (Array.isArray(d?.serviceRequests)) {
          setTuServiceRequests(d.serviceRequests);
        }
        if (Array.isArray(d?.mailAgenda)) {
          setTuMailAgenda(d.mailAgenda);
        }
        const masterRombelCodes = Array.isArray(d?.academicMaster?.rombels)
          ? d.academicMaster.rombels
              .map((r: any) => String(r.code || "").trim())
              .filter(Boolean)
          : [];
        const stuRombelCodes = Array.isArray(d?.students)
          ? d.students
              .map((s: any) => String(s.rombel || "").trim())
              .filter(Boolean)
          : [];
        const combinedRombels = Array.from(
          new Set([...masterRombelCodes, ...stuRombelCodes])
        ).sort() as string[];
        if (combinedRombels.length > 0) {
          setRealRombels(combinedRombels);
          setNewSchRombel(combinedRombels[0]);
          setFromRombel(combinedRombels[0]);
          setToRombel(combinedRombels[1] || combinedRombels[0]);
          setIncClassroom(combinedRombels[0]);
        }
        if (Array.isArray(d?.students) && d.students.length > 0) {
          const sLabels = d.students.map(
            (s: any) => `${s.name} (${s.rombel})`
          );
          setRealStudentLabels(sLabels);
          setBkStudent(sLabels[0]);
        }
        if (Array.isArray(d?.ppdb)) {
          setPpdbApplicants(
            d.ppdb.map((p: any) => ({
              regNo: p.regNo,
              name: p.fullName,
              nisn: p.nisn,
              track: p.track,
              school: p.previousSchool,
              btq: p.scoreBtq || 0,
              academic: p.scoreAcademic || 0,
              interview: p.scoreInterview || 0,
              status: p.status,
              rombel: p.targetClassroom || "7A",
            }))
          );
        }
        if (Array.isArray(d?.schedules)) {
          setSchedules(
            d.schedules.map((s: any) => ({
              id: s.id,
              day: s.day,
              slot: s.timeSlot,
              rombel: s.classroom,
              subject: s.subject,
              teacher: s.teacherName,
            }))
          );
        }
        if (Array.isArray(d?.counselingNotes)) {
          setBkRecords(
            d.counselingNotes.map((n: any) => ({
              id: n.id,
              student: `${n.studentName} (${n.classroom})`,
              type: n.category,
              points: n.pointDelta || 0,
              note: n.note,
              date: n.dateLabel || "-",
            }))
          );
        }
      })
      .catch(() => {
        setSession(null);
      });
  }, [pathname]);

  // Dengarkan event postMessage dari iframe portal (wajib same-origin + path internal)
  useEffect(() => {
    const isSafeInternalPath = (p: unknown): p is string =>
      typeof p === "string" && /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(p);

    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== "SIMM_PORTAL") return;

      if (data.type === "NAVIGATE" && isSafeInternalPath(data.payload?.path)) {
        window.location.href = data.payload.path;
      } else if (data.type === "OPEN_MODAL" && data.payload?.modal) {
        setActiveModal(data.payload.modal as ExtendedModalType);
      } else if (data.type === "LOGOUT") {
        handleLogout();
      } else if (
        data.type === "AUTH_SUCCESS" &&
        isSafeInternalPath(data.payload?.targetPath)
      ) {
        setSession(data.payload);
        triggerToast(
          `Autentikasi Berhasil (${data.payload.baseRole})`,
          `Selamat datang, ${data.payload.name}`
        );
        window.location.replace(data.payload.targetPath);
      } else if (data.type === "R2_UPLOADED" && data.payload?.key) {
        setR2UploadedFiles((prev) => [
          {
            key: data.payload.key,
            url: data.payload.url || "#",
            size: data.payload.size || 0,
            time: new Date().toLocaleTimeString("id-ID"),
          },
          ...prev,
        ]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      // ignore
    }
    setSession(null);
    triggerToast("Sesi Berakhir", "Anda telah keluar dari portal SIMS.");
    router.push("/");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      triggerToast("Validasi Gagal", "Kata sandi saat ini wajib diisi.");
      return;
    }
    if (newPassword.length < 8) {
      triggerToast("Validasi Gagal", "Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      triggerToast(
        "Validasi Gagal",
        "Kata sandi baru wajib mengandung kombinasi huruf dan angka."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast("Validasi Gagal", "Konfirmasi kata sandi tidak cocok.");
      return;
    }
    try {
      const res = await fetch("/api/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setActiveModal(null);
        triggerToast("Kata Sandi Diperbarui", data.message);
      } else {
        triggerToast("Gagal", data.error || "Gagal memperbarui kata sandi");
      }
    } catch {
      triggerToast("Error", "Gagal menghubungi server autentikasi");
    }
  };

  // Simpan Identitas Resmi Madrasah
  const handleSaveMadrasahProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_MADRASAH_PROFILE",
          payload: {
            ...madrasahProfile,
            ...(profileAdminPassword
              ? { adminPassword: profileAdminPassword }
              : {}),
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setProfileAdminPassword("");
        setIframeRefreshKey((k) => k + 1);
        setActiveModal(null);
        triggerToast(
          "Identitas Madrasah Diperbarui!",
          `Profil resmi "${madrasahProfile.name}" telah diterapkan di seluruh portal & cetakan surat.`
        );
      } else {
        triggerToast(
          "Gagal Menyimpan Profil",
          data.error || "Periksa kembali input dan kata sandi konfirmasi Anda."
        );
      }
    } catch {
      triggerToast("Error", "Gagal menyimpan profil madrasah");
    }
  };

  // Unduh Template Excel (.xlsx) Siswa / Guru dari endpoint /api/xlsx
  const handleDownloadXlsxTemplate = (type: "students" | "teachers") => {
    const a = document.createElement("a");
    a.href = `/api/xlsx?type=${type}`;
    a.download =
      type === "students"
        ? "Template_Import_Siswa_EMIS_SIMS.xlsx"
        : "Template_Import_Guru_GTK_SIMS.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerToast(
      "Mengunduh Template Excel (.xlsx)",
      `File ${a.download} sedang diunduh ke komputer Anda.`
    );
  };

  // Baca File Excel (.xlsx) melalui /api/xlsx
  const handleXlsxFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/xlsx", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.rows)) {
        setCsvPreviewRows(data.rows);
        triggerToast(
          "File Excel (.xlsx) Terbaca",
          `Ditemukan ${data.rows.length} baris data dari ${file.name} siap diimpor ke Supabase.`
        );
      } else {
        triggerToast(
          "Gagal Membaca File .xlsx",
          data.error || "Pastikan file berformat Excel (.xlsx) sesuai template."
        );
      }
    } catch {
      triggerToast(
        "Error Pembacaan File",
        "Gagal memproses file .xlsx yang dipilih."
      );
    } finally {
      e.target.value = "";
    }
  };

  const handleExecuteBulkImport = async () => {
    if (csvPreviewRows.length === 0) return;
    setImportingCsv(true);
    try {
      const action =
        importTarget === "students"
          ? "BULK_IMPORT_STUDENTS"
          : "BULK_IMPORT_TEACHERS";
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          payload: { rows: csvPreviewRows },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCsvPreviewRows([]);
        setIframeRefreshKey((k) => k + 1);
        triggerToast(
          "Import Massal Berhasil!",
          `${data.importedCount} data ${
            importTarget === "students" ? "Siswa & Akun" : "Guru/GTK & Akun"
          } telah disimpan ke database Supabase.`
        );
      } else {
        triggerToast("Gagal Import", data.error || "Periksa format CSV");
      }
    } catch {
      triggerToast("Error", "Gagal mengimpor data ke server");
    } finally {
      setImportingCsv(false);
    }
  };

  const handleResetDummyData = async () => {
    if (resetConfirmText !== "SIAP-GOLIVE") {
      triggerToast(
        "Konfirmasi Diperlukan",
        "Ketik SIAP-GOLIVE pada kolom konfirmasi terlebih dahulu."
      );
      return;
    }
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESET_DUMMY_DATA",
          payload: { confirm: resetConfirmText },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResetConfirmText("");
        setIframeRefreshKey((k) => k + 1);
        setActiveModal(null);
        triggerToast("Data Dummy Dibersihkan", data.message);
      }
    } catch {
      triggerToast("Error", "Gagal membersihkan data dummy");
    }
  };

  // Deteksi hak akses modul tambahan sesuai BaseRole + Dynamic Additional Roles
  const joinedRoles = (session?.additionalRoles || []).join(" ").toLowerCase();
  const isKepalaMadrasah =
    session?.baseRole === "GTK" && joinedRoles.includes("kepala madrasah");
  const isSuperAdmin = session?.baseRole === "ADMIN" || isKepalaMadrasah;
  const isTu = session?.baseRole === "TU";
  const isGtk = session?.baseRole === "GTK";

  const canAccessPpdbScoring =
    isSuperAdmin || isTu || (isGtk && joinedRoles.includes("ppdb"));
  const canAccessScheduleBuilder =
    isSuperAdmin ||
    (isGtk &&
      (joinedRoles.includes("kurikulum") || joinedRoles.includes("piket")));
  const canAccessBkDesk =
    isSuperAdmin ||
    (isGtk && (joinedRoles.includes("bk") || joinedRoles.includes("wali")));
  const canAccessBatchPromotion = isSuperAdmin || isTu;
  const canAccessR2Manager = isSuperAdmin || isTu || isGtk;
  const canAccessGoLiveSettings = isSuperAdmin || isTu;

  // Deteksi bentrok jadwal secara real-time
  const conflictingSchedule = schedules.find(
    (s) =>
      s.day === newSchDay &&
      s.slot === newSchSlot &&
      (s.teacher === newSchTeacher || s.rombel === newSchRombel)
  );

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictingSchedule) {
      triggerToast(
        "Jadwal Bentrok Terdeteksi!",
        `${conflictingSchedule.teacher} sudah terjadwal di kelas ${conflictingSchedule.rombel} pada ${conflictingSchedule.day} ${conflictingSchedule.slot}`
      );
      return;
    }
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_CLASS_SCHEDULE",
          payload: {
            day: newSchDay,
            timeSlot: newSchSlot,
            classroom: newSchRombel,
            subject: newSchSubject,
            teacherName: newSchTeacher,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        triggerToast(
          "Jadwal Ditolak Server",
          data.error || "Gagal menyimpan jadwal pelajaran"
        );
        return;
      }
      setSchedules((prev) => [
        {
          id: data.data?.id || "sch-" + Date.now(),
          day: newSchDay,
          slot: newSchSlot,
          rombel: newSchRombel,
          subject: newSchSubject,
          teacher: newSchTeacher,
        },
        ...prev,
      ]);
      triggerToast(
        "Jadwal Pelajaran Disimpan ke Database",
        `${newSchSubject} (${newSchRombel}) berhasil ditambahkan tanpa bentrok jam mengajar.`
      );
    } catch {
      triggerToast("Error", "Gagal menghubungi server saat menyimpan jadwal");
    }
  };

  const handleSavePpdbScore = async (regNo: string, idx: number) => {
    const item = ppdbApplicants[idx];
    try {
      await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_PPDB_SCORE_STATUS",
          payload: {
            regNo,
            scoreBtq: item.btq,
            scoreAcademic: item.academic,
            scoreInterview: item.interview,
            status: item.status,
            targetClassroom: item.rombel,
          },
        }),
      });
    } catch {
      // ignore
    }
    triggerToast(
      "Nilai Seleksi & Status PPDB Tersimpan",
      `Skor akhir ${item.name} (${regNo}) telah diperbarui di Supabase.`
    );
  };

  const handleOneClickMigrate = async (
    regNo: string,
    name: string,
    rombel: string
  ) => {
    try {
      await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MIGRATE_PPDB_TO_BUKU_INDUK",
          payload: { regNo, targetRombel: rombel },
        }),
      });
    } catch {
      // ignore
    }
    setPpdbApplicants((prev) =>
      prev.map((a) =>
        a.regNo === regNo ? { ...a, status: "SUDAH_MIGRASI" } : a
      )
    );
    triggerToast(
      "One-Click Migration Berhasil!",
      `${name} beserta dokumen R2 otomatis masuk ke Buku Induk Siswa (${rombel}).`
    );
  };

  const handleAddBkRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bkNote.trim()) return;
    const isNegative = bkCategory.includes("Pelanggaran");
    const delta = isNegative ? -Math.abs(bkPoints) : Math.abs(bkPoints);
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_COUNSELING_NOTE",
          payload: {
            student: bkStudent,
            category: bkCategory,
            points: delta,
            note: bkNote,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        triggerToast(
          "Gagal Menyimpan Catatan BK",
          data.error || "Periksa kembali data catatan BK"
        );
        return;
      }
      setBkRecords((prev) => [
        {
          id: data.data?.id || "bk-" + Date.now(),
          student: bkStudent,
          type: bkCategory,
          points: delta,
          note: bkNote,
          date: data.data?.dateLabel || "Hari Ini",
        },
        ...prev,
      ]);
      setBkNote("");
      setIframeRefreshKey((k) => k + 1);
      triggerToast(
        "Catatan BK & Poin Siswa Tersimpan di Supabase",
        `Catatan pembinaan untuk ${bkStudent} (${delta > 0 ? "+" + delta : delta} poin) berhasil disinkronkan ke portal Siswa & Orang Tua.`
      );
    } catch {
      triggerToast("Error", "Gagal menyimpan catatan BK ke server");
    }
  };

  // Sinkronkan state dari objek academicMaster terbaru
  const applyUpdatedMaster = (master: any) => {
    if (!master) return;
    if (Array.isArray(master.gradeLevels)) setGradeLevels(master.gradeLevels);
    if (Array.isArray(master.rombels)) {
      setMasterRombels(master.rombels);
      const codes = master.rombels
        .map((r: any) => String(r.code || "").trim())
        .filter(Boolean);
      if (codes.length > 0) {
        setRealRombels((prev) =>
          Array.from(new Set([...codes, ...prev])).sort()
        );
      }
    }
    if (Array.isArray(master.subjects)) {
      setMasterSubjects(master.subjects);
      const sNames = master.subjects
        .map((s: any) => String(s.name || "").trim())
        .filter(Boolean);
      if (sNames.length > 0) {
        setRealSubjects(sNames);
      }
    }
    setIframeRefreshKey((k) => k + 1);
  };

  const handleAddGradeLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeCode.trim() || !newGradeLabel.trim()) return;
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_GRADE_LEVEL",
          payload: {
            code: newGradeCode.trim().toUpperCase(),
            label: newGradeLabel.trim(),
            phase: newGradePhase.trim(),
            isFinalGrade: newGradeFinal,
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.academicMaster) {
        applyUpdatedMaster(data.academicMaster);
        setNewGradeCode("");
        setNewGradeLabel("");
        setNewGradeFinal(false);
        triggerToast(
          "Tingkat Kelas Disimpan",
          `Tingkat kelas ${newGradeCode.toUpperCase()} telah ditambahkan ke referensi utama.`
        );
      } else {
        triggerToast("Gagal", data.error || "Gagal menyimpan tingkat kelas");
      }
    } catch {
      triggerToast("Error", "Gagal menghubungi server");
    }
  };

  const handleDeleteGradeLevel = async (code: string) => {
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_GRADE_LEVEL",
          payload: { code },
        }),
      });
      const data = await res.json();
      if (data.ok && data.academicMaster) {
        applyUpdatedMaster(data.academicMaster);
        triggerToast("Tingkat Kelas Dihapus", `Tingkat ${code} telah dihapus.`);
      }
    } catch {
      // ignore
    }
  };

  const handleAddRombel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRombelCode.trim()) return;
    const code = newRombelCode.trim().toUpperCase();
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_ROMBEL",
          payload: {
            code,
            name: newRombelName.trim() || `Kelas ${code}`,
            gradeCode: newRombelGrade,
            waliKelas: newRombelWali || "-",
            room: newRombelRoom.trim() || `R. Kelas ${code}`,
            quota: newRombelQuota,
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.academicMaster) {
        applyUpdatedMaster(data.academicMaster);
        setNewRombelCode("");
        setNewRombelName("");
        setNewRombelRoom("");
        triggerToast(
          "Rombel Referensi Disimpan",
          `Rombel ${code} (Tingkat ${newRombelGrade}) kini aktif sebagai referensi di seluruh modul SIMS.`
        );
      } else {
        triggerToast("Gagal", data.error || "Gagal menyimpan rombel");
      }
    } catch {
      triggerToast("Error", "Gagal menghubungi server");
    }
  };

  const handleDeleteRombel = async (code: string) => {
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_ROMBEL",
          payload: { code },
        }),
      });
      const data = await res.json();
      if (data.ok && data.academicMaster) {
        applyUpdatedMaster(data.academicMaster);
        triggerToast("Rombel Dihapus", `Rombel ${code} telah dihapus dari daftar referensi.`);
      }
    } catch {
      // ignore
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_SUBJECT",
          payload: {
            code: newSubjCode.trim().toUpperCase(),
            name: newSubjName.trim(),
            group: newSubjGroup,
            jpPerWeek: newSubjJp,
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.academicMaster) {
        applyUpdatedMaster(data.academicMaster);
        setNewSubjCode("");
        setNewSubjName("");
        triggerToast(
          "Mata Pelajaran Disimpan",
          `"${newSubjName.trim()}" kini tersedia di seluruh pilihan jadwal & pengampu GTK.`
        );
      } else {
        triggerToast("Gagal", data.error || "Gagal menyimpan mata pelajaran");
      }
    } catch {
      triggerToast("Error", "Gagal menghubungi server");
    }
  };

  const handleDeleteSubject = async (code: string) => {
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_SUBJECT",
          payload: { code },
        }),
      });
      const data = await res.json();
      if (data.ok && data.academicMaster) {
        applyUpdatedMaster(data.academicMaster);
        triggerToast("Mata Pelajaran Dihapus", `Kode ${code} telah dihapus.`);
      }
    } catch {
      // ignore
    }
  };

  // Eksekusi Pergantian Semester / Tahun Pelajaran Aktif + Arsip Otomatis
  const handleTransitionAcademicPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TRANSITION_ACADEMIC_PERIOD",
          payload: {
            targetAcademicYear: targetAcadYear.trim(),
            targetSemester,
            targetCurriculum: targetCurriculum.trim(),
            resetSemesterPoints,
            autoPromoteAndGraduate,
            notes: transitionNotes.trim(),
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.profile) setMadrasahProfile(data.profile);
        if (Array.isArray(data.academicArchives)) {
          setAcademicArchives(data.academicArchives);
        }
        setTransitionNotes("");
        setIframeRefreshKey((k) => k + 1);
        setPeriodTab("archives");
        triggerToast(
          "Periode Akademik Diperbarui & Diarsipkan!",
          `Data periode sebelumnya resmi dibekukan ke Arsip Akademik. Sistem kini aktif di TA ${targetAcadYear} Semester ${targetSemester}.`
        );
      } else {
        triggerToast("Gagal Transisi", data.error || "Periksa format Tahun Pelajaran (YYYY/YYYY)");
      }
    } catch {
      triggerToast("Error", "Gagal memproses transisi periode akademik");
    }
  };

  // Handler Modul TU Terpadu di Dashboard Admin
  const handleProcessTuService = async (
    id: string,
    decision: "APPROVE_CORRECTION" | "REJECT" | "ISSUE_LETTER"
  ) => {
    const letterNo =
      decision === "ISSUE_LETTER"
        ? `B-${160 + tuMailAgenda.length}/MTs.NF/PP.00.5/11/2026`
        : undefined;
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PROCESS_SERVICE_REQUEST",
          payload: { id, decision, letterNumber: letterNo },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTuServiceRequests((prev) =>
          prev.map((r) =>
            r.id === id || r.ticketNo === id
              ? {
                  ...r,
                  status:
                    decision === "REJECT" ? "Ditolak" : "Disetujui",
                  ...(letterNo ? { letterNumber: letterNo } : {}),
                }
              : r
          )
        );
        setIframeRefreshKey((k) => k + 1);
        triggerToast(
          "Layanan Administrasi TU Diproses",
          decision === "APPROVE_CORRECTION"
            ? "Koreksi data disetujui dan langsung diperbarui di Buku Induk Supabase."
            : decision === "ISSUE_LETTER"
              ? `Surat resmi diterbitkan dengan nomor ${letterNo} & dicatat di Agenda Surat Keluar.`
              : "Permohonan telah ditandai ditolak."
        );
      }
    } catch {
      triggerToast("Error", "Gagal memproses layanan TU");
    }
  };

  const handleCreateTuMailAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgNo.trim() || !newAgParty.trim() || !newAgSubject.trim()) return;
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_MAIL_AGENDA",
          payload: {
            type: newAgType,
            category: newAgCat,
            letterNo: newAgNo.trim(),
            date: newAgDate.trim(),
            party: newAgParty.trim(),
            subject: newAgSubject.trim(),
            r2File: newAgR2Key || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setTuMailAgenda((prev) => [data.data, ...prev]);
        setNewAgParty("");
        setNewAgSubject("");
        setNewAgR2Key("");
        setIframeRefreshKey((k) => k + 1);
        triggerToast(
          "Agenda Surat Tersimpan",
          `${newAgType} (${newAgNo}) berhasil dicatat ke Buku Agenda & Cloudflare R2.`
        );
      } else {
        triggerToast("Gagal", data.error || "Gagal menyimpan agenda surat");
      }
    } catch {
      triggerToast("Error", "Gagal menghubungi server");
    }
  };

  const handleSendBkChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bkReplyText.trim()) return;
    setBkChatThread((prev) => [
      ...prev,
      {
        sender: "Dewi Sartika Putri, S.Psi. (Koordinator BK)",
        role: "bk",
        text: bkReplyText,
        time: "Baru saja",
      },
    ]);
    setBkReplyText("");
    triggerToast(
      "Pesan Terkirim ke Orang Tua",
      "Balasan konsultasi BK telah diteruskan ke portal Orang Tua."
    );
  };

  const handleBatchPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BATCH_PROMOTE_STUDENTS",
          payload: { fromRombel, toRombel },
        }),
      });
    } catch {
      // ignore
    }
    const label =
      toRombel === "LULUS_ALUMNI"
        ? `15 Nov 2026: Seluruh siswa aktif Rombel ${fromRombel} diluluskan menjadi Alumni`
        : `15 Nov 2026: Seluruh siswa aktif Rombel ${fromRombel} dinaikkan secara massal ke Rombel ${toRombel}`;
    setBatchHistory((prev) => [label, ...prev]);
    triggerToast("Kenaikan Kelas Massal Selesai", label);
  };

  const handleDirectR2FileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setR2Uploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "arsip-madrasah/2026");
      const res = await fetch("/api/r2/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        setR2UploadedFiles((prev) => [
          {
            key: data.key,
            url: data.url,
            size: file.size,
            time: new Date().toLocaleTimeString("id-ID"),
          },
          ...prev,
        ]);
        triggerToast(
          "Unggah Cloudflare R2 Berhasil!",
          `Berkas ${file.name} tersimpan di bucket simm-media (${data.key}).`
        );
      } else {
        triggerToast("Gagal Unggah R2", data.error || "Periksa kredensial R2");
      }
    } catch (err: any) {
      triggerToast("Error R2", err?.message || "Gagal menghubungi endpoint R2");
    } finally {
      setR2Uploading(false);
      e.target.value = "";
    }
  };

  // Handler Halaman Manajemen Guru Piket
  const handleAddDutySchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDutyTeacher) return;
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_DAILY_DUTY_SCHEDULE",
          payload: {
            day: newDutyDay,
            shift: newDutyShift,
            teacherName: newDutyTeacher,
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setDutySchedules((prev) => [...prev, data.data]);
        setIframeRefreshKey((k) => k + 1);
        triggerToast(
          "Jadwal Piket Disimpan",
          `${newDutyTeacher} dijadwalkan piket hari ${newDutyDay} (${newDutyShift}).`
        );
      } else {
        triggerToast("Gagal", data.error || "Gagal menyimpan jadwal piket");
      }
    } catch {
      triggerToast("Error", "Gagal menghubungi server");
    }
  };

  const handleOverrideDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTargetId || !overrideTeacher) return;
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "OVERRIDE_DAILY_DUTY",
          payload: {
            id: overrideTargetId,
            overrideTeacherName: overrideTeacher,
            overrideReason: overrideReason || "Penyesuaian Tugas Piket",
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setDutySchedules((prev) =>
          prev.map((d) => (d.id === overrideTargetId ? data.data : d))
        );
        setOverrideTargetId("");
        setOverrideReason("");
        setIframeRefreshKey((k) => k + 1);
        triggerToast(
          "Override Piket Berhasil",
          `Petugas piket digantikan sementara oleh ${overrideTeacher}.`
        );
      } else {
        triggerToast("Gagal", data.error || "Gagal melakukan override piket");
      }
    } catch {
      triggerToast("Error", "Gagal menghubungi server");
    }
  };

  const handleCreatePiketIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incStudent.trim() || !incReason.trim()) return;
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_PIKET_INCIDENT",
          payload: {
            studentName: incStudent.trim(),
            classroom: incClassroom,
            incidentType: incType,
            reason: incReason.trim(),
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setPiketIncidents((prev) => [data.data, ...prev]);
        setIncStudent("");
        setIncReason("");
        triggerToast(
          "Log Kejadian Piket Tercatat",
          `${data.data.studentName} (${data.data.classroom}) — ${data.data.incidentType}`
        );
      } else {
        triggerToast("Gagal", data.error || "Gagal mencatat kejadian piket");
      }
    } catch {
      triggerToast("Error", "Gagal menghubungi server");
    }
  };

  const isWorkspacePage =
    activeModal !== null &&
    activeModal !== "change_password" &&
    activeModal !== "logout_confirm";

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-50 select-none">
      {/* ===================================================================
          MAIN PORTAL VIEWPORT (TANPA DOUBLE-RELOAD + LOADING INDICATOR)
      =================================================================== */}
      <main
        className={`relative flex-1 w-full h-full bg-slate-50 overflow-hidden ${
          isWorkspacePage ? "hidden" : ""
        }`}
      >
        {iframeLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50/95 backdrop-blur-xs gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
            </div>
            <p className="text-xs font-semibold text-slate-600">
              Memuat Portal SIMS MTs Nurul Falah...
            </p>
          </div>
        )}
        <iframe
          key={`${activePortal}-${iframeRefreshKey}`}
          src={`/api/portal/${activePortal}`}
          title={`Portal SIMS - ${activePortal.toUpperCase()}`}
          onLoad={() => setIframeLoading(false)}
          className="w-full h-full border-0"
        />
      </main>

      {/* ===================================================================
          BAR NAVIGASI ATAS HALAMAN KERJA PROFESIONAL (SAAT MEMBUKA MODUL)
      =================================================================== */}
      {isWorkspacePage && (
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 shadow-2xs shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-bold transition cursor-pointer shrink-0"
            >
              <span>← Kembali ke Dashboard</span>
            </button>
            <div className="hidden sm:block h-5 w-px bg-slate-200" />
            <div className="truncate">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                SIMS {madrasahProfile.name} • TA {madrasahProfile.academicYear} ({madrasahProfile.semester})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {session && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                {session.name} ({session.baseRole})
              </span>
            )}
            <button
              type="button"
              onClick={() => setActiveModal("logout_confirm")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>
      )}

      {/* ===================================================================
          MODAL KONFIRMASI KELUAR / LOGOUT
      =================================================================== */}
      {activeModal === "logout_confirm" && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LogOut className="w-4 h-4 text-rose-300" />
                <h2 className="text-base font-bold">Konfirmasi Keluar Aplikasi</h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <p className="text-slate-700 leading-relaxed">
                Apakah Anda yakin ingin keluar dari sesi aplikasi SIMS?
              </p>
              {session && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-0.5">
                  <p className="font-bold text-slate-900">{session.name}</p>
                  <p className="text-slate-500">
                    Peran: {session.baseRole} • ID: {session.identifier}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Ya, Keluar Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          HALAMAN MANAJEMEN GURU PIKET (FULL PAGE)
      =================================================================== */}
      {activeModal === "piket_management" && (
        <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-teal-950 via-emerald-900 to-slate-900 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-200 font-semibold">
                  Operasional Ketertiban &amp; Harian Madrasah
                </span>
                <h1 className="text-xl sm:text-2xl font-bold mt-1.5">
                  Manajemen Guru Piket, Jadwal Mingguan &amp; Log Kejadian Harian
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Atur petugas piket Senin–Sabtu, lakukan override pengganti piket, catat keterlambatan/UKS siswa, serta pantau check-in GPS guru.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setPiketTab("schedule")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  piketTab === "schedule"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                1. Jadwal Guru Piket &amp; Override ({dutySchedules.length})
              </button>
              <button
                onClick={() => setPiketTab("incidents")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  piketTab === "incidents"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                2. Log Kejadian Piket &amp; UKS ({piketIncidents.length})
              </button>
              <button
                onClick={() => setPiketTab("attendance")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  piketTab === "attendance"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                3. Monitoring Check-In GPS Guru ({teacherAttendances.length}) &amp; Izin Siswa ({studentLeaves.length})
              </button>
            </div>

            {piketTab === "schedule" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <form
                    onSubmit={handleAddDutySchedule}
                    className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs"
                  >
                    <h3 className="font-bold text-sm text-slate-900">
                      + Tambah Jadwal Guru Piket Mingguan
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Hari Piket
                        </label>
                        <select
                          value={newDutyDay}
                          onChange={(e) => setNewDutyDay(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                        >
                          {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map(
                            (d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Shift Tugas
                        </label>
                        <select
                          value={newDutyShift}
                          onChange={(e) => setNewDutyShift(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                        >
                          <option value="Piket Pagi (06.45 – 11.00)">
                            Piket Pagi (06.45 – 11.00)
                          </option>
                          <option value="Piket Siang (11.00 – 15.00)">
                            Piket Siang (11.00 – 15.00)
                          </option>
                        </select>
                      </div>
                    </div>
                    <div className="text-xs">
                      <label className="block font-semibold text-slate-600 mb-1">
                        Pilih Guru Piket
                      </label>
                      <select
                        value={newDutyTeacher}
                        onChange={(e) => setNewDutyTeacher(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                      >
                        {realTeacherNames.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      Simpan Jadwal Guru Piket
                    </button>
                  </form>

                  <form
                    onSubmit={handleOverrideDuty}
                    className="bg-white rounded-2xl border border-amber-200 p-5 space-y-4 shadow-2xs"
                  >
                    <h3 className="font-bold text-sm text-amber-950">
                      Override / Penggantian Guru Piket Sementara
                    </h3>
                    <div className="text-xs space-y-3">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Pilih Jadwal Piket yang Digantikan
                        </label>
                        <select
                          value={overrideTargetId}
                          onChange={(e) => setOverrideTargetId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                        >
                          <option value="">— Pilih Slot Jadwal Piket —</option>
                          {dutySchedules.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.day} ({d.shift}) — {d.originalTeacherName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">
                            Guru Pengganti
                          </label>
                          <select
                            value={overrideTeacher}
                            onChange={(e) => setOverrideTeacher(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                          >
                            {realTeacherNames.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">
                            Alasan Penggantian
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Dinas Luar / Sakit"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                    >
                      Terapkan Override Guru Piket
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase">
                        <th className="py-3 px-4">Hari &amp; Shift</th>
                        <th className="py-3 px-4">Petugas Piket Tetap</th>
                        <th className="py-3 px-4">Status Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dutySchedules.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-500">
                            Belum ada jadwal piket tersimpan di database. Gunakan form di atas untuk menambahkan.
                          </td>
                        </tr>
                      ) : (
                        dutySchedules.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {d.day} •{" "}
                              <span className="font-normal text-slate-600">
                                {d.shift}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold">
                              {d.originalTeacherName}{" "}
                              <span className="font-mono text-slate-400">
                                ({d.originalTeacherNip})
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {d.isOverridden ? (
                                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold">
                                  Digantikan oleh {d.overrideTeacherName} (
                                  {d.overrideReason})
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                  Sesuai Jadwal Tetap
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {piketTab === "incidents" && (
              <div className="space-y-6">
                <form
                  onSubmit={handleCreatePiketIncident}
                  className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs"
                >
                  <h3 className="font-bold text-sm text-slate-900">
                    + Catat Kejadian Piket Harian (Keterlambatan / Izin Pulang / UKS)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Nama Siswa
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nama lengkap siswa..."
                        value={incStudent}
                        onChange={(e) => setIncStudent(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Rombel / Kelas
                      </label>
                      <select
                        value={incClassroom}
                        onChange={(e) => setIncClassroom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                      >
                        {realRombels.map((r) => (
                          <option key={r} value={r}>
                            Kelas {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Jenis Kejadian
                      </label>
                      <select
                        value={incType}
                        onChange={(e) => setIncType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                      >
                        <option value="Terlambat Masuk">Terlambat Masuk</option>
                        <option value="Izin Pulang Mendadak">
                          Izin Pulang Mendadak
                        </option>
                        <option value="Sakit di UKS">Sakit di UKS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Keterangan / Tindak Lanjut
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Alasan / penanganan..."
                        value={incReason}
                        onChange={(e) => setIncReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    Catat ke Log Piket Database
                  </button>
                </form>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase">
                        <th className="py-3 px-4">Waktu</th>
                        <th className="py-3 px-4">Siswa &amp; Kelas</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4">Keterangan</th>
                        <th className="py-3 px-4">Dicatat Oleh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {piketIncidents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Belum ada log kejadian piket hari ini.
                          </td>
                        </tr>
                      ) : (
                        piketIncidents.map((inc) => (
                          <tr key={inc.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold">
                              {inc.timeLabel}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {inc.studentName} ({inc.classroom})
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                                {inc.incidentType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {inc.reason}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {inc.recordedBy}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {piketTab === "attendance" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
                  <h3 className="font-bold text-sm text-slate-900">
                    Rekaman Check-In / Check-Out GPS Guru Terbaru
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto text-xs">
                    {teacherAttendances.length === 0 ? (
                      <p className="text-slate-500 py-6 text-center">
                        Belum ada data check-in GPS guru di database.
                      </p>
                    ) : (
                      teacherAttendances.map((a) => (
                        <div
                          key={a.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-bold text-slate-900">
                              {a.teacherName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {a.dateLabel} • Masuk: {a.checkInTime || "-"} •
                              Pulang: {a.checkOutTime || "Belum"}
                            </p>
                            <p className="font-mono text-[10px] text-emerald-700 mt-0.5">
                              {a.gpsDistance}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
                            {a.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
                  <h3 className="font-bold text-sm text-slate-900">
                    Daftar Pengajuan Izin / Sakit Siswa Terbaru
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto text-xs">
                    {studentLeaves.length === 0 ? (
                      <p className="text-slate-500 py-6 text-center">
                        Belum ada pengajuan izin siswa.
                      </p>
                    ) : (
                      studentLeaves.map((lv) => (
                        <div
                          key={lv.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-bold text-slate-900">
                              {lv.studentName} ({lv.classroom})
                            </p>
                            <p className="text-[11px] text-slate-600">
                              {lv.category} • {lv.startDate} s.d. {lv.endDate}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {lv.reason}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-bold shrink-0">
                            {lv.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL PENGATURAN IDENTITAS MADRASAH & IMPORT EXCEL (.XLSX)
      =================================================================== */}
      {activeModal === "golive_settings" && (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto bg-white rounded-2xl w-full flex flex-col shadow-sm border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-semibold">
                  Pengaturan Master Madrasah
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Identitas Resmi Madrasah & Import Massal Excel (.xlsx)
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="px-6 pt-3 bg-slate-100 border-b border-slate-200 flex gap-2 text-xs font-semibold">
              <button
                onClick={() => setGoLiveTab("identitas")}
                className={`px-4 py-2.5 rounded-t-xl border-t border-x transition ${
                  goLiveTab === "identitas"
                    ? "bg-white text-emerald-700 border-slate-200"
                    : "bg-transparent text-slate-600 border-transparent hover:text-slate-900"
                }`}
              >
                1. Identitas & Kop Madrasah
              </button>
              <button
                onClick={() => setGoLiveTab("import_csv")}
                className={`px-4 py-2.5 rounded-t-xl border-t border-x transition ${
                  goLiveTab === "import_csv"
                    ? "bg-white text-emerald-700 border-slate-200"
                    : "bg-transparent text-slate-600 border-transparent hover:text-slate-900"
                }`}
              >
                2. Import Massal Excel (.xlsx) — Siswa EMIS & Guru
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* TAB 1: IDENTITAS RESMI MADRASAH */}
              {goLiveTab === "identitas" && (
                <form onSubmit={handleSaveMadrasahProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Resmi Sekolah / Madrasah
                      </label>
                      <input
                        type="text"
                        required
                        value={madrasahProfile.name}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nomor Statistik Madrasah (NSM)
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.nsm}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            nsm: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NPSN Kemendikdasmen / Kemenag
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.npsn}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            npsn: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tahun Ajaran Aktif
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.academicYear}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            academicYear: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Semester Berjalan
                      </label>
                      <select
                        value={madrasahProfile.semester}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            semester: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Ganjil">Semester Ganjil</option>
                        <option value="Genap">Semester Genap</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Status Akreditasi
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.accreditation}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            accreditation: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Kepala Madrasah (Untuk TTE SKL & SK)
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.headmasterName}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            headmasterName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NIP Kepala Madrasah
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.headmasterNip}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            headmasterNip: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alamat Lengkap Madrasah (Kop Surat & Halaman Publik)
                    </label>
                    <input
                      type="text"
                      value={madrasahProfile.address}
                      onChange={(e) =>
                        setMadrasahProfile({
                          ...madrasahProfile,
                          address: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Koordinat GPS Latitude (Absensi Guru)
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.gpsLat}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            gpsLat: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Koordinat GPS Longitude
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.gpsLng}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            gpsLng: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Info Rekening Komite Madrasah
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.komiteBankInfo}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            komiteBankInfo: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <label className="block text-xs font-semibold text-amber-900">
                      Konfirmasi Kata Sandi Admin (Wajib diisi jika mengubah Nomor Rekening Komite)
                    </label>
                    <input
                      type="password"
                      value={profileAdminPassword}
                      onChange={(e) => setProfileAdminPassword(e.target.value)}
                      placeholder="Masukkan kata sandi akun Anda bila mengubah rekening bank..."
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md"
                  >
                    Simpan Identitas Madrasah & Terapkan ke Seluruh 7 Portal
                  </button>
                </form>
              )}

              {/* TAB 2: IMPORT MASSAL EXCEL (.XLSX) (SISWA EMIS & GURU) */}
              {goLiveTab === "import_csv" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setImportTarget("students");
                          setCsvPreviewRows([]);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                          importTarget === "students"
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-700 border border-slate-300"
                        }`}
                      >
                        Import Buku Induk Siswa (EMIS)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportTarget("teachers");
                          setCsvPreviewRows([]);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                          importTarget === "teachers"
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-700 border border-slate-300"
                        }`}
                      >
                        Import Data Guru / GTK
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadXlsxTemplate(importTarget)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        Unduh Template Excel (.xlsx){" "}
                        {importTarget === "students" ? "Siswa EMIS" : "Guru GTK"}
                      </span>
                    </button>
                  </div>

                  <label className="block p-6 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 text-center cursor-pointer transition">
                    <Upload className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
                    <p className="font-bold text-emerald-950">
                      Pilih File Excel (.xlsx) ({importTarget === "students" ? "Data Siswa EMIS" : "Data Guru GTK"}) dari Komputer Anda
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Kolom NIS, NISN, NIK, dan NIP otomatis terjaga sebagai Teks (angka nol di depan tidak hilang). Sistem otomatis membuat akun login (sandi awal: Simms2026!) di Supabase.
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={handleXlsxFileSelected}
                      className="hidden"
                    />
                  </label>

                  {csvPreviewRows.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Pratinjau Data Siap Impor ({csvPreviewRows.length} Baris)
                        </span>
                        <button
                          type="button"
                          disabled={importingCsv}
                          onClick={handleExecuteBulkImport}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                        >
                          {importingCsv
                            ? "Sedang Menyimpan ke Supabase..."
                            : `Proses Import ${csvPreviewRows.length} Data ke Supabase →`}
                        </button>
                      </div>
                      <div className="max-h-48 overflow-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              {Object.keys(csvPreviewRows[0]).map((h) => (
                                <th key={h} className="py-2 px-3 border-b">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {csvPreviewRows.slice(0, 10).map((r, i) => (
                              <tr key={i}>
                                {Object.values(r).map((v, j) => (
                                  <td key={j} className="py-1.5 px-3">
                                    {v}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BERSIHKAN DATA DUMMY (SIAP GO-LIVE) */}
              {goLiveTab === "reset_data" && (
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-rose-950 text-base">
                        Pembersihan Data Contoh (Dummy) Sebelum Go-Live
                      </h3>
                      <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                        Tindakan ini akan menghapus seluruh data siswa contoh, pendaftar PPDB contoh, mutasi tabungan contoh, dan tiket layanan contoh di dalam database Supabase Anda, namun <strong>tetap mempertahankan akun Super Admin dan konfigurasi Tahun Ajaran</strong>.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-rose-900 mb-1">
                      Ketik <code className="px-1.5 py-0.5 rounded bg-white border border-rose-300 font-mono">SIAP-GOLIVE</code> untuk mengonfirmasi:
                    </label>
                    <input
                      type="text"
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder="SIAP-GOLIVE"
                      className="w-full px-3.5 py-2 rounded-xl border border-rose-300 bg-white font-mono text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleResetDummyData}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
                  >
                    Bersihkan Seluruh Data Dummy di Database Supabase Sekarang
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL UBAH KATA SANDI MANDIRI (PRODUCTION SECURITY)
      =================================================================== */}
      {activeModal === "change_password" && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-bold">Ubah Kata Sandi Akun</h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Akun Aktif: <strong className="text-slate-900">{session?.name}</strong> ({session?.identifier})
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Saat Ini
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi saat ini..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Baru (Minimal 8 Karakter, Huruf &amp; Angka)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
              >
                Simpan Kata Sandi Baru ke Supabase
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 1: MEJA KERJA PANITIA PPDB
      =================================================================== */}
      {activeModal === "ppdb_scoring" && (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto bg-white rounded-2xl w-full flex flex-col shadow-sm border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 to-teal-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 font-semibold">
                  Tugas Tambahan: Panitia PPDB
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Dashboard Penilaian Tes Seleksi, Perankingan & One-Click Migration PPDB
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-emerald-950">
                    Formula Bobot Penilaian Seleksi PPDB Terpadu
                  </p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Skor Akhir dihitung otomatis: <strong>40% Tes BTQ & Tahfidz Al-Qur&apos;an</strong> +{" "}
                    <strong>35% Tes Potensi Akademik (TPA)</strong> + <strong>25% Wawancara Siswa/Wali</strong>.
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white text-emerald-800 border border-emerald-300 font-semibold">
                  Sinkron Tabel: PpdbApplicant (Supabase)
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs uppercase">
                      <th className="py-3 px-4">Peringkat & Pendaftar</th>
                      <th className="py-3 px-3">Jalur</th>
                      <th className="py-3 px-3 text-center">BTQ/Tahfidz (40%)</th>
                      <th className="py-3 px-3 text-center">TPA (35%)</th>
                      <th className="py-3 px-3 text-center">Wawancara (25%)</th>
                      <th className="py-3 px-3 text-center">Skor Akhir</th>
                      <th className="py-3 px-3">Status & Rombel</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[...ppdbApplicants]
                      .sort((a, b) => {
                        const scoreA = a.btq * 0.4 + a.academic * 0.35 + a.interview * 0.25;
                        const scoreB = b.btq * 0.4 + b.academic * 0.35 + b.interview * 0.25;
                        return scoreB - scoreA;
                      })
                      .map((app, rankIdx) => {
                        const origIdx = ppdbApplicants.findIndex(
                          (x) => x.regNo === app.regNo
                        );
                        const finalScore = (
                          app.btq * 0.4 +
                          app.academic * 0.35 +
                          app.interview * 0.25
                        ).toFixed(2);
                        return (
                          <tr key={app.regNo} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                                  #{rankIdx + 1}
                                </span>
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {app.name}
                                  </div>
                                  <div className="text-xs text-slate-500 font-mono">
                                    {app.regNo} • NISN: {app.nisn}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                                {app.track}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={app.btq}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setPpdbApplicants((prev) =>
                                    prev.map((item, i) =>
                                      i === origIdx ? { ...item, btq: val } : item
                                    )
                                  );
                                }}
                                className="w-16 px-2 py-1 text-center rounded-lg border border-slate-300 font-mono text-sm"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={app.academic}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setPpdbApplicants((prev) =>
                                    prev.map((item, i) =>
                                      i === origIdx
                                        ? { ...item, academic: val }
                                        : item
                                    )
                                  );
                                }}
                                className="w-16 px-2 py-1 text-center rounded-lg border border-slate-300 font-mono text-sm"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={app.interview}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setPpdbApplicants((prev) =>
                                    prev.map((item, i) =>
                                      i === origIdx
                                        ? { ...item, interview: val }
                                        : item
                                    )
                                  );
                                }}
                                className="w-16 px-2 py-1 text-center rounded-lg border border-slate-300 font-mono text-sm"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono font-bold text-emerald-700 text-base">
                                {finalScore}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1">
                                <select
                                  value={app.status}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPpdbApplicants((prev) =>
                                      prev.map((item, i) =>
                                        i === origIdx
                                          ? { ...item, status: val }
                                          : item
                                      )
                                    );
                                  }}
                                  className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-medium"
                                >
                                  <option value="MENUNGGU_VERIFIKASI">
                                    Menunggu Verifikasi
                                  </option>
                                  <option value="PERLU_REVISI">
                                    Perlu Revisi Berkas
                                  </option>
                                  <option value="DITERIMA">
                                    Diterima (Lulus)
                                  </option>
                                  <option value="CADANGAN">Cadangan</option>
                                  <option value="SUDAH_MIGRASI">
                                    Sudah Migrasi Buku Induk
                                  </option>
                                </select>
                                <select
                                  value={app.rombel}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPpdbApplicants((prev) =>
                                      prev.map((item, i) =>
                                        i === origIdx
                                          ? { ...item, rombel: val }
                                          : item
                                      )
                                    );
                                  }}
                                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-600"
                                >
                                  <option value="VII-A">Target: VII-A</option>
                                  <option value="VII-B">Target: VII-B</option>
                                </select>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right space-y-1">
                              <button
                                onClick={() =>
                                  handleSavePpdbScore(app.regNo, origIdx)
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                              >
                                Simpan Nilai
                              </button>
                              {app.status === "DITERIMA" && (
                                <button
                                  onClick={() =>
                                    handleOneClickMigrate(
                                      app.regNo,
                                      app.name,
                                      app.rombel
                                    )
                                  }
                                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1 transition"
                                >
                                  <span>Migrasi Buku Induk</span>
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 2: PENYUSUNAN JADWAL ANTI-BENTROK (CONFLICT DETECTION)
      =================================================================== */}
      {activeModal === "schedule_conflict" && (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto bg-white rounded-2xl w-full flex flex-col shadow-sm border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-700 to-emerald-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 font-semibold">
                  Waka Kurikulum & Super Admin
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Penyusunan Master Jadwal Pelajaran & Deteksi Bentrok Otomatis (Conflict Detection)
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <form
                onSubmit={handleAddSchedule}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Hari KBM
                    </label>
                    <select
                      value={newSchDay}
                      onChange={(e) => setNewSchDay(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map(
                        (d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Jam Pelajaran
                    </label>
                    <select
                      value={newSchSlot}
                      onChange={(e) => setNewSchSlot(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Jam ke 1–2 (07.30 – 08.50)">
                        Jam ke 1–2 (07.30 – 08.50)
                      </option>
                      <option value="Jam ke 3–4 (09.10 – 10.30)">
                        Jam ke 3–4 (09.10 – 10.30)
                      </option>
                      <option value="Jam ke 5–6 (10.45 – 12.05)">
                        Jam ke 5–6 (10.45 – 12.05)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Kelas / Rombel
                    </label>
                    <select
                      value={newSchRombel}
                      onChange={(e) => setNewSchRombel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {realRombels.map((r) => (
                        <option key={r} value={r}>
                          Kelas {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Mata Pelajaran (Referensi Master)
                    </label>
                    <select
                      value={newSchSubject}
                      onChange={(e) => setNewSchSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {realSubjects.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Guru Pengampu
                    </label>
                    <select
                      value={newSchTeacher}
                      onChange={(e) => setNewSchTeacher(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {realTeacherNames.map((tName) => (
                        <option key={tName} value={tName}>
                          {tName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {conflictingSchedule ? (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <div>
                        <p className="font-bold text-xs uppercase tracking-wide text-rose-700">
                          Peringatan Deteksi Bentrok (Conflict Detected)
                        </p>
                        <p className="text-xs mt-0.5">
                          Tidak dapat menjadwalkan: <strong>{conflictingSchedule.teacher}</strong> / Kelas{" "}
                          <strong>{conflictingSchedule.rombel}</strong> sudah memiliki jadwal{" "}
                          <strong>{conflictingSchedule.subject}</strong> pada hari{" "}
                          <strong>{conflictingSchedule.day}</strong> ({conflictingSchedule.slot}).
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-rose-200/80 text-rose-900 text-xs font-bold shrink-0">
                      Diblokir Sistem
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-medium">
                        Slot aman! <strong>{newSchTeacher}</strong> dan ruang kelas{" "}
                        <strong>{newSchRombel}</strong> tersedia pada {newSchDay} ({newSchSlot}).
                      </span>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shrink-0"
                    >
                      + Tambahkan ke Master Jadwal
                    </button>
                  </div>
                )}
              </form>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs uppercase">
                      <th className="py-2.5 px-4">Hari & Jam</th>
                      <th className="py-2.5 px-4">Rombel</th>
                      <th className="py-2.5 px-4">Mata Pelajaran</th>
                      <th className="py-2.5 px-4">Guru Pengampu</th>
                      <th className="py-2.5 px-4 text-right">Status Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {schedules.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-medium">
                          {s.day} • <span className="text-slate-500 text-xs">{s.slot}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-semibold text-xs">
                            {s.rombel}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold">{s.subject}</td>
                        <td className="py-2.5 px-4">{s.teacher}</td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                            ✓ Bebas Bentrok
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 3: MEJA KERJA GURU WALI / BK
      =================================================================== */}
      {activeModal === "bk_counseling" && (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto bg-white rounded-2xl w-full flex flex-col shadow-sm border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-900 to-emerald-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 font-semibold">
                  Tugas Tambahan: Guru Wali / Bimbingan Konseling (BK)
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Meja Kerja Pembinaan Karakter, Poin Prestasi/Kedisiplinan & Konsultasi Orang Tua
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 text-sm">
              <div className="lg:col-span-7 space-y-4">
                <form
                  onSubmit={handleAddBkRecord}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <h3 className="font-bold text-slate-900">
                    + Catat Bimbingan Konseling / Poin Siswa Asuh
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Pilih Siswa Asuh
                      </label>
                      <select
                        value={bkStudent}
                        onChange={(e) => setBkStudent(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                      >
                        {realStudentLabels.map((sLabel) => (
                          <option key={sLabel} value={sLabel}>
                            {sLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Kategori Pembinaan
                      </label>
                      <select
                        value={bkCategory}
                        onChange={(e) => setBkCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                      >
                        <option value="Prestasi & Apresiasi (+Poin)">
                          Prestasi & Apresiasi (+Poin)
                        </option>
                        <option value="Bimbingan Akademik & Karakter">
                          Bimbingan Akademik & Karakter
                        </option>
                        <option value="Pembinaan Kedisiplinan / Pelanggaran (-Poin)">
                          Pembinaan Kedisiplinan (-Poin)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Bobot Poin
                      </label>
                      <input
                        type="number"
                        value={bkPoints}
                        onChange={(e) => setBkPoints(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Rincian Catatan Bimbingan / Tindak Lanjut untuk Orang Tua
                    </label>
                    <textarea
                      rows={2}
                      value={bkNote}
                      onChange={(e) => setBkNote(e.target.value)}
                      placeholder="Tuliskan hasil observasi, apresiasi prestasi, atau catatan pembinaan siswa..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                  >
                    Simpan & Terbitkan ke Portal Siswa / Ortu
                  </button>
                </form>

                <div className="space-y-2.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Riwayat Catatan Pembinaan & Poin Terkini
                  </h4>
                  {bkRecords.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {r.student}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {r.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{r.note}</p>
                        <span className="text-[11px] text-slate-400">
                          {r.date}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold shrink-0 ${
                          r.points >= 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {r.points >= 0 ? `+${r.points}` : r.points} Poin
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <div className="p-3.5 bg-slate-900 text-white">
                  <p className="font-bold text-xs">
                    Kanal Konsultasi Langsung Orang Tua / Wali
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Terhubung ke Dashboard Orang Tua
                  </p>
                </div>
                <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-72">
                  {bkChatThread.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-xs ${
                        m.role === "bk"
                          ? "bg-emerald-600 text-white ml-6"
                          : "bg-white border border-slate-200 text-slate-800 mr-6"
                      }`}
                    >
                      <div className="font-bold text-[11px] opacity-85 mb-1">
                        {m.sender} • {m.time}
                      </div>
                      <p>{m.text}</p>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={handleSendBkChat}
                  className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={bkReplyText}
                    onChange={(e) => setBkReplyText(e.target.value)}
                    placeholder="Ketik balasan untuk Orang Tua/Wali..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 4: KENAIKAN KELAS MASSAL
      =================================================================== */}
      {activeModal === "batch_promotion" && (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto bg-white rounded-2xl w-full flex flex-col shadow-sm border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-sky-900 to-emerald-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 font-semibold">
                  Modul Buku Induk Siswa Digital
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Kenaikan Kelas Massal (Batch Promotion) & Kelulusan Akhir Tahun
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <form
                onSubmit={handleBatchPromotion}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Rombel Asal (Tahun Ajaran Berjalan)
                    </label>
                    <select
                      value={fromRombel}
                      onChange={(e) => setFromRombel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                    >
                      {realRombels.map((r) => (
                        <option key={r} value={r}>
                          Rombel {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Rombel Tujuan / Status Kelulusan
                    </label>
                    <select
                      value={toRombel}
                      onChange={(e) => setToRombel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                    >
                      {realRombels.map((r) => (
                        <option key={r} value={r}>
                          Naik ke Kelas {r}
                        </option>
                      ))}
                      <option value="LULUS_ALUMNI">
                        Luluskan Menjadi Alumni (Kelas IX → Alumni)
                      </option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                >
                  Proses Kenaikan Kelas Massal & Catat Riwayat Rombel di Supabase
                </button>
              </form>

              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Log Riwayat Batch Promotion Buku Induk
                </h4>
                {batchHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 font-medium"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 5: CLOUDFLARE R2 STORAGE MANAGER
      =================================================================== */}
      {activeModal === "r2_uploader" && (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto bg-white rounded-2xl w-full flex flex-col shadow-sm border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                  Cloudflare R2 Object Storage (@aws-sdk/client-s3)
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Manajemen Unggah Berkas Langsung ke Bucket R2 (simm-media)
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <label className="block p-6 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-center cursor-pointer transition">
                <CloudUpload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-emerald-950">
                  {r2Uploading
                    ? "Sedang Mengunggah ke Cloudflare R2..."
                    : "Klik untuk Memilih File dari Komputer & Unggah ke Cloudflare R2"}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Mendukung KK, Akta, Ijazah, SKL PPDB, Surat Izin Dokter, Bukti Komite (PDF/JPG/PNG)
                </p>
                <input
                  type="file"
                  onChange={handleDirectR2FileSelect}
                  disabled={r2Uploading}
                  className="hidden"
                />
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Berkas yang Baru Diunggah ke Bucket R2 (Sesi Ini)
                </h4>
                {r2UploadedFiles.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Belum ada file yang diunggah pada sesi ini.
                  </p>
                ) : (
                  r2UploadedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="truncate">
                        <p className="font-mono font-semibold text-slate-900 truncate">
                          {f.key}
                        </p>
                        <p className="text-slate-500">
                          {Math.round(f.size / 1024)} KB • Diunggah pukul {f.time}
                        </p>
                      </div>
                      {f.url && f.url !== "#" && (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold shrink-0"
                        >
                          Buka Presigned URL
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 6: MASTER TINGKAT KELAS, ROMBEL & MATA PELAJARAN (SINGLE SOURCE OF TRUTH)
      =================================================================== */}
      {activeModal === "academic_master" && (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto bg-white rounded-2xl w-full flex flex-col shadow-sm border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                  Master Referensi Akademik Terpusat
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Manajemen Tingkat Kelas, Rombongan Belajar (Rombel) &amp; Mata Pelajaran
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pt-3 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-2">
              <button
                onClick={() => setMasterTab("rombels")}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition ${
                  masterTab === "rombels"
                    ? "bg-white text-emerald-900 border-t border-x border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1. Rombongan Belajar / Kelas ({masterRombels.length || realRombels.length})
              </button>
              <button
                onClick={() => setMasterTab("grades")}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition ${
                  masterTab === "grades"
                    ? "bg-white text-emerald-900 border-t border-x border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2. Tingkat Kelas ({gradeLevels.length})
              </button>
              <button
                onClick={() => setMasterTab("subjects")}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition ${
                  masterTab === "subjects"
                    ? "bg-white text-emerald-900 border-t border-x border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                3. Mata Pelajaran Referensi ({masterSubjects.length || realSubjects.length})
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                <strong>Single Source of Truth:</strong> Setiap Tingkat Kelas, Rombel, dan Mata Pelajaran yang Anda kelola di sini otomatis menjadi daftar pilihan di Buku Induk Siswa, Penugasan Wali Kelas GTK, Penyusunan Jadwal Anti-Bentrok, Kenaikan Kelas Massal, dan PPDB.
              </div>

              {/* TAB ROMBEL */}
              {masterTab === "rombels" && (
                <div className="space-y-5">
                  <form
                    onSubmit={handleAddRombel}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      + Tambah / Perbarui Rombongan Belajar (Rombel)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Kode Rombel
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: 7B / VII-B"
                          value={newRombelCode}
                          onChange={(e) => setNewRombelCode(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Nama Rombel
                        </label>
                        <input
                          type="text"
                          placeholder="Kelas 7B"
                          value={newRombelName}
                          onChange={(e) => setNewRombelName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Tingkat Kelas
                        </label>
                        <select
                          value={newRombelGrade}
                          onChange={(e) => setNewRombelGrade(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                        >
                          {gradeLevels.map((g) => (
                            <option key={g.code} value={g.code}>
                              Tingkat {g.code}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Wali Kelas Binaan
                        </label>
                        <select
                          value={newRombelWali}
                          onChange={(e) => setNewRombelWali(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        >
                          <option value="-">— Pilih Guru Wali Kelas —</option>
                          {realTeacherNames.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Daya Tampung
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={newRombelQuota}
                          onChange={(e) =>
                            setNewRombelQuota(Number(e.target.value))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                    >
                      + Simpan Rombel ke Master Referensi
                    </button>
                  </form>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 uppercase">
                          <th className="py-2.5 px-4">Kode Rombel</th>
                          <th className="py-2.5 px-4">Nama Kelas</th>
                          <th className="py-2.5 px-4">Tingkat</th>
                          <th className="py-2.5 px-4">Wali Kelas</th>
                          <th className="py-2.5 px-4">Ruang &amp; Kuota</th>
                          <th className="py-2.5 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {masterRombels.map((r) => (
                          <tr key={r.code} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono font-bold text-emerald-800">
                              {r.code}
                            </td>
                            <td className="py-2.5 px-4 font-semibold">
                              {r.name}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                                Tingkat {r.gradeCode}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">{r.waliKelas}</td>
                            <td className="py-2.5 px-4 text-slate-500">
                              {r.room} • {r.quota} Siswa
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                onClick={() => handleDeleteRombel(r.code)}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB TINGKAT KELAS */}
              {masterTab === "grades" && (
                <div className="space-y-5">
                  <form
                    onSubmit={handleAddGradeLevel}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      + Tambah / Perbarui Tingkat Kelas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Kode Tingkat
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: VII / VIII / IX"
                          value={newGradeCode}
                          onChange={(e) => setNewGradeCode(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Label Tingkat Kelas
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Kelas VII (Tingkat 7)"
                          value={newGradeLabel}
                          onChange={(e) => setNewGradeLabel(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Fase / Kurikulum
                        </label>
                        <input
                          type="text"
                          value={newGradePhase}
                          onChange={(e) => setNewGradePhase(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 pb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newGradeFinal}
                          onChange={(e) => setNewGradeFinal(e.target.checked)}
                          className="w-4 h-4 accent-emerald-600 rounded"
                        />
                        <span>Tingkat Akhir (Lulus saat Ganti TA)</span>
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                    >
                      + Simpan Tingkat Kelas
                    </button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {gradeLevels.map((g) => (
                      <div
                        key={g.code}
                        className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-extrabold text-base text-emerald-800">
                              Tingkat {g.code}
                            </span>
                            {g.isFinalGrade && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                                Tingkat Akhir (Lulus/Alumni)
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-900 mt-1">
                            {g.label}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {g.phase}
                          </p>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleDeleteGradeLevel(g.code)}
                            className="text-xs text-rose-600 hover:underline font-semibold"
                          >
                            Hapus Tingkat
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB MATA PELAJARAN */}
              {masterTab === "subjects" && (
                <div className="space-y-5">
                  <form
                    onSubmit={handleAddSubject}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      + Tambah / Perbarui Mata Pelajaran Referensi
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Kode Mapel
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: PAI-QH / UM-MTK"
                          value={newSubjCode}
                          onChange={(e) => setNewSubjCode(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Nama Mata Pelajaran
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Bahasa Arab"
                          value={newSubjName}
                          onChange={(e) => setNewSubjName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Kelompok Kurikulum
                        </label>
                        <select
                          value={newSubjGroup}
                          onChange={(e) => setNewSubjGroup(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        >
                          <option value="PAI & Bahasa Arab (KMA 450)">
                            PAI &amp; Bahasa Arab (KMA 450)
                          </option>
                          <option value="Umum (Kurikulum Merdeka)">
                            Umum (Kurikulum Merdeka)
                          </option>
                          <option value="Muatan Lokal & Pembinaan">
                            Muatan Lokal &amp; Pembinaan
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Alokasi JP / Pekan
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={24}
                          value={newSubjJp}
                          onChange={(e) => setNewSubjJp(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                    >
                      + Simpan Mata Pelajaran ke Master Referensi
                    </button>
                  </form>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 uppercase">
                          <th className="py-2.5 px-4">Kode</th>
                          <th className="py-2.5 px-4">Nama Mata Pelajaran</th>
                          <th className="py-2.5 px-4">Kelompok Kurikulum</th>
                          <th className="py-2.5 px-4">Alokasi JP</th>
                          <th className="py-2.5 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {masterSubjects.map((s) => (
                          <tr key={s.code} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                              {s.code}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                              {s.name}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                                {s.group}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono">
                              {s.jpPerWeek} JP / Pekan
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                onClick={() => handleDeleteSubject(s.code)}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 7: PERGANTIAN SEMESTER / TAHUN PELAJARAN AKTIF & ARSIP AKADEMIK
      =================================================================== */}
      {activeModal === "academic_period" && (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto bg-white rounded-2xl w-full flex flex-col shadow-sm border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-900 via-slate-900 to-emerald-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold">
                  Manajemen Siklus &amp; Arsip Periode Akademik
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Pergantian Semester, Tahun Pelajaran Aktif &amp; Snapshot Arsip Terkunci
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pt-3 bg-slate-100 border-b border-slate-200 flex gap-2">
              <button
                onClick={() => setPeriodTab("transition")}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition ${
                  periodTab === "transition"
                    ? "bg-white text-emerald-900 border-t border-x border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1. Transisi Semester / Tahun Pelajaran Baru
              </button>
              <button
                onClick={() => setPeriodTab("archives")}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition ${
                  periodTab === "archives"
                    ? "bg-white text-emerald-900 border-t border-x border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2. Riwayat Arsip Periode Sebelumnya ({academicArchives.length})
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {periodTab === "transition" && (
                <form
                  onSubmit={handleTransitionAcademicPeriod}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-emerald-800">
                        Periode Akademik Aktif Saat Ini
                      </span>
                      <p className="text-base font-extrabold text-slate-900">
                        Tahun Pelajaran {madrasahProfile.academicYear} • Semester{" "}
                        {madrasahProfile.semester}
                      </p>
                      <p className="text-xs text-slate-600">
                        Kurikulum: {madrasahProfile.curriculum}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold self-start sm:self-auto">
                      AKTIF BERJALAN
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tahun Pelajaran Tujuan (Format YYYY/YYYY)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="2026/2027 atau 2027/2028"
                        value={targetAcadYear}
                        onChange={(e) => setTargetAcadYear(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Semester Tujuan
                      </label>
                      <select
                        value={targetSemester}
                        onChange={(e) =>
                          setTargetSemester(
                            e.target.value as "Ganjil" | "Genap"
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                      >
                        <option value="Ganjil">Semester Ganjil</option>
                        <option value="Genap">Semester Genap</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kurikulum Berlaku
                      </label>
                      <input
                        type="text"
                        value={targetCurriculum}
                        onChange={(e) => setTargetCurriculum(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Ketentuan otomatis sesuai jenis transisi */}
                  {targetAcadYear.trim() !== madrasahProfile.academicYear ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2.5 text-xs text-amber-950">
                      <p className="font-bold text-sm text-amber-900">
                        Ketentuan Pergantian Tahun Pelajaran Baru ({madrasahProfile.academicYear} → {targetAcadYear}):
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          <strong>Snapshot Arsip Tahun Pelajaran:</strong> Seluruh statistik siswa per rombel, lulusan, jadwal, catatan BK, dan saldo tabungan TA {madrasahProfile.academicYear} dibekukan ke Arsip Akademik.
                        </li>
                        <li>
                          <strong>Kenaikan Tingkat &amp; Kelulusan Otomatis:</strong> Siswa tingkat akhir (Kelas IX) otomatis berstatus <strong>Lulus / Alumni</strong>; siswa Kelas VII naik ke VIII dan Kelas VIII naik ke IX beserta pembaruan riwayat akademik Buku Induk.
                        </li>
                        <li>
                          <strong>Reset Siklus Tahunan:</strong> Tagihan iuran Komite 12 bulan &amp; penghitung presensi dimulai dari 0 untuk tahun ajaran baru (sementara <strong>Saldo Tabungan Siswa tetap utuh</strong>).
                        </li>
                      </ul>
                      <label className="flex items-center gap-2 pt-2 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoPromoteAndGraduate}
                          onChange={(e) =>
                            setAutoPromoteAndGraduate(e.target.checked)
                          }
                          className="w-4 h-4 accent-amber-700 rounded"
                        />
                        <span>
                          Jalankan Kenaikan Kelas Berjenjang (VII→VIII, VIII→IX) &amp; Kelulusan Kelas IX Otomatis
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-2.5 text-xs text-sky-950">
                      <p className="font-bold text-sm text-sky-900">
                        Ketentuan Pergantian Semester ({madrasahProfile.semester} → {targetSemester} pada TA {madrasahProfile.academicYear}):
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          <strong>Snapshot Arsip Semester:</strong> Rekap kehadiran, jurnal mengajar, dan catatan BK Semester {madrasahProfile.semester} disimpan ke Arsip Akademik.
                        </li>
                        <li>
                          <strong>Rombel &amp; Keuangan Berlanjut:</strong> Kelas/Rombel siswa, Wali Kelas, Saldo Tabungan, dan progres iuran Komite 12 bulan <strong>tetap dipertahankan</strong>.
                        </li>
                        <li>
                          <strong>Reset Presensi &amp; Jurnal Semester Baru:</strong> Penghitung kehadiran semester berjalan dan status pengisian jurnal harian dimulai dari 0.
                        </li>
                      </ul>
                      <label className="flex items-center gap-2 pt-2 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={resetSemesterPoints}
                          onChange={(e) =>
                            setResetSemesterPoints(e.target.checked)
                          }
                          className="w-4 h-4 accent-sky-700 rounded"
                        />
                        <span>
                          Reset Poin Sikap/Kedisiplinan Siswa ke Nilai Dasar Awal Semester (100 Poin • Sangat Baik)
                        </span>
                      </label>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Catatan Berita Acara Tutup Buku / Pengarsipan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={transitionNotes}
                      onChange={(e) => setTransitionNotes(e.target.value)}
                      placeholder="Contoh: Penetapan SK Semester Genap berdasarkan Rapat Dewan Guru..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md"
                  >
                    Arsipkan Periode Berjalan ({madrasahProfile.academicYear} {madrasahProfile.semester}) &amp; Aktifkan Periode Baru →
                  </button>
                </form>
              )}

              {periodTab === "archives" && (
                <div className="space-y-3">
                  {academicArchives.length === 0 ? (
                    <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      Belum ada arsip pergantian semester atau tahun pelajaran. Arsip akan otomatis terbentuk saat Anda melakukan transisi semester/tahun pelajaran.
                    </div>
                  ) : (
                    academicArchives.map((arc: any) => (
                      <div
                        key={arc.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                              {arc.transitionType === "NEW_ACADEMIC_YEAR"
                                ? "ARSIP TUTUP TAHUN PELAJARAN"
                                : "ARSIP TUTUP SEMESTER"}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 mt-1">
                              TA {arc.academicYear} • Semester {arc.semester} → TA{" "}
                              {arc.targetAcademicYear} ({arc.targetSemester})
                            </h4>
                          </div>
                          <div className="text-right text-[11px] text-slate-500">
                            <p>Diarsipkan: {arc.archivedAt}</p>
                            <p className="font-semibold text-slate-700">
                              Oleh: {arc.archivedBy}
                            </p>
                          </div>
                        </div>
                        <p className="text-slate-700">{arc.notes}</p>
                        {arc.summary && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                              <span className="text-[10px] text-slate-500 block">
                                Siswa Aktif Saat Arsip
                              </span>
                              <strong className="text-slate-900">
                                {arc.summary.activeStudents} Siswa
                              </strong>
                            </div>
                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                              <span className="text-[10px] text-slate-500 block">
                                Lulus / Naik Kelas
                              </span>
                              <strong className="text-emerald-700">
                                {arc.summary.graduatedStudents} Lulus •{" "}
                                {arc.summary.promotedStudents} Naik
                              </strong>
                            </div>
                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                              <span className="text-[10px] text-slate-500 block">
                                Pendidik &amp; Jadwal
                              </span>
                              <strong className="text-slate-900">
                                {arc.summary.activeTeachers} GTK •{" "}
                                {arc.summary.totalSchedules} Jadwal
                              </strong>
                            </div>
                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                              <span className="text-[10px] text-slate-500 block">
                                Total Tabungan Siswa
                              </span>
                              <strong className="font-mono text-slate-900">
                                Rp{" "}
                                {Number(
                                  arc.summary.totalSavingsBalance || 0
                                ).toLocaleString("id-ID")}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 8: LAYANAN TATA USAHA (TU) TERPADU DI DASHBOARD SUPER ADMIN
          (Persuratan, Koreksi Data Induk, Agenda Surat R2, Audit EMIS & Ekspor)
      =================================================================== */}
      {(activeModal === "tu_persuratan" ||
        activeModal === "tu_agenda" ||
        activeModal === "tu_emis") && (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto bg-white rounded-2xl w-full flex flex-col shadow-sm border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-teal-950 via-emerald-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-200 font-semibold">
                  Akses Penuh Super Admin — Modul Tata Usaha (TU) Terintegrasi
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Pusat Persuratan Resmi, Koreksi Buku Induk, Agenda Surat R2 &amp; Validasi EMIS
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pt-3 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveModal("tu_persuratan")}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition ${
                  activeModal === "tu_persuratan"
                    ? "bg-white text-emerald-900 border-t border-x border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1. Layanan Surat &amp; Koreksi Buku Induk ({tuServiceRequests.length})
              </button>
              <button
                onClick={() => setActiveModal("tu_agenda")}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition ${
                  activeModal === "tu_agenda"
                    ? "bg-white text-emerald-900 border-t border-x border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2. Agenda Surat Masuk &amp; Keluar R2 ({tuMailAgenda.length})
              </button>
              <button
                onClick={() => setActiveModal("tu_emis")}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition ${
                  activeModal === "tu_emis"
                    ? "bg-white text-emerald-900 border-t border-x border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                3. Validasi Residu EMIS &amp; Ekspor Laporan TU
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* SUB-MODUL 1: PERSURATAN & KOREKSI BUKU INDUK */}
              {activeModal === "tu_persuratan" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-950 flex items-center justify-between">
                    <span>
                      Kelola permohonan koreksi data Buku Induk dan penerbitan Surat Keterangan Siswa Aktif langsung dari Dashboard Super Admin.
                    </span>
                    <span className="font-mono font-bold">
                      Penomoran: MTs.NF/PP.00.5/{new Date().getFullYear()}
                    </span>
                  </div>

                  {tuServiceRequests.length === 0 ? (
                    <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      Belum ada antrean permohonan surat atau koreksi data dari Portal Siswa / Orang Tua.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tuServiceRequests.map((req: any) => {
                        const isPending =
                          String(req.status || "").startsWith("Menunggu");
                        const isKoreksi =
                          req.requestType === "KOREKSI_DATA" ||
                          Boolean(req.fieldToCorrect);
                        return (
                          <div
                            key={req.id}
                            className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                                  {req.ticketNo || req.id}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    isPending
                                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-900">
                                {req.title}
                              </h4>
                              <p className="text-xs text-slate-500">
                                Siswa: <strong>{req.studentName}</strong> (Kelas{" "}
                                {req.classroom})
                              </p>
                              {isKoreksi && (
                                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block uppercase">
                                      Data Lama ({req.fieldToCorrect})
                                    </span>
                                    <strong className="text-slate-700">
                                      {req.oldValue || "-"}
                                    </strong>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                                    <span className="text-[10px] text-emerald-700 block uppercase">
                                      Usulan Baru
                                    </span>
                                    <strong className="text-emerald-950">
                                      {req.newValue || "-"}
                                    </strong>
                                  </div>
                                </div>
                              )}
                              {req.letterNumber && (
                                <p className="text-xs font-mono font-bold text-emerald-700">
                                  No. Surat Resmi: {req.letterNumber}
                                </p>
                              )}
                            </div>

                            {isPending && (
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                  onClick={() =>
                                    handleProcessTuService(req.id, "REJECT")
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                                >
                                  Tolak
                                </button>
                                {isKoreksi ? (
                                  <button
                                    onClick={() =>
                                      handleProcessTuService(
                                        req.id,
                                        "APPROVE_CORRECTION"
                                      )
                                    }
                                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                                  >
                                    Setujui &amp; Update Buku Induk
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleProcessTuService(
                                        req.id,
                                        "ISSUE_LETTER"
                                      )
                                    }
                                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                                  >
                                    Terbitkan Nomor Surat Resmi (TTE)
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-MODUL 2: AGENDA SURAT MASUK & KELUAR R2 */}
              {activeModal === "tu_agenda" && (
                <div className="space-y-5">
                  <form
                    onSubmit={handleCreateTuMailAgenda}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      + Catat Agenda Surat Masuk / Surat Keluar Baru
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Jenis Surat
                        </label>
                        <select
                          value={newAgType}
                          onChange={(e) => setNewAgType(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                        >
                          <option value="Surat Masuk">Surat Masuk</option>
                          <option value="Surat Keluar">Surat Keluar</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Kategori Instansi
                        </label>
                        <select
                          value={newAgCat}
                          onChange={(e) => setNewAgCat(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        >
                          <option value="Kemenag">Kemenag</option>
                          <option value="Kesiswaan">Kesiswaan</option>
                          <option value="Kepegawaian">Kepegawaian</option>
                          <option value="Undangan">Undangan / Umum</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Nomor Surat Resmi
                        </label>
                        <input
                          type="text"
                          required
                          value={newAgNo}
                          onChange={(e) => setNewAgNo(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Tanggal Surat
                        </label>
                        <input
                          type="text"
                          required
                          value={newAgDate}
                          onChange={(e) => setNewAgDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Pengirim / Tujuan Surat
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Kantor Kemenag Kab. Musi Rawas"
                          value={newAgParty}
                          onChange={(e) => setNewAgParty(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Perihal / Ringkasan Surat
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Undangan Rapat Koordinasi EMIS"
                          value={newAgSubject}
                          onChange={(e) => setNewAgSubject(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                    >
                      + Simpan ke Buku Agenda Surat &amp; Supabase
                    </button>
                  </form>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 uppercase">
                          <th className="py-2.5 px-4">Nomor Surat</th>
                          <th className="py-2.5 px-4">Tanggal</th>
                          <th className="py-2.5 px-4">Jenis &amp; Kategori</th>
                          <th className="py-2.5 px-4">Perihal &amp; Pihak</th>
                          <th className="py-2.5 px-4 text-right">Arsip R2</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {tuMailAgenda.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-8 text-center text-slate-500"
                            >
                              Belum ada catatan agenda surat.
                            </td>
                          </tr>
                        ) : (
                          tuMailAgenda.map((m: any) => (
                            <tr key={m.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                                {m.mailNumber || m.letterNo}
                              </td>
                              <td className="py-2.5 px-4">{m.dateLabel || m.date}</td>
                              <td className="py-2.5 px-4">
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                                  {m.mailType || m.type} • {m.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-4">
                                <p className="font-bold text-slate-900">
                                  {m.subject}
                                </p>
                                <p className="text-slate-500">{m.party}</p>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-[11px] text-emerald-700">
                                {m.r2FileKey || m.r2File || "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-MODUL 3: VALIDASI RESIDU EMIS & PUSAT EKSPOR LAPORAN TU */}
              {activeModal === "tu_emis" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[11px] font-bold uppercase text-emerald-800">
                        Total Siswa Buku Induk
                      </span>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1">
                        {tuStudentsList.length} Siswa
                      </p>
                      <span className="text-[11px] text-emerald-700">
                        Siap Sinkron EMIS 4.0
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
                      <span className="text-[11px] font-bold uppercase text-sky-800">
                        Validitas NISN 10 Digit
                      </span>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1">
                        {
                          tuStudentsList.filter((s) =>
                            /^\d{10}$/.test(String(s.nisn || ""))
                          ).length
                        }
                        /{tuStudentsList.length}
                      </p>
                      <span className="text-[11px] text-sky-700">
                        Terverifikasi Pusdatin
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
                      <span className="text-[11px] font-bold uppercase text-teal-800">
                        Validitas NIK 16 Digit
                      </span>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1">
                        {
                          tuStudentsList.filter(
                            (s) =>
                              /^\d{16}$/.test(String(s.nik || "")) &&
                              s.nik !== "3204120000000000"
                          ).length
                        }
                        /{tuStudentsList.length}
                      </p>
                      <span className="text-[11px] text-teal-700">
                        Padan Dukcapil
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-[11px] font-bold uppercase text-amber-800">
                        Rombel &amp; Mapel Master
                      </span>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1">
                        {realRombels.length} Rombel
                      </p>
                      <span className="text-[11px] text-amber-800">
                        {realSubjects.length} Mata Pelajaran Aktif
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900">
                          Format Template &amp; Buku Induk Siswa EMIS (.XLSX)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Unduh file Excel standar EMIS Kemenag untuk pengarsipan &amp; sinkronisasi.
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadXlsxTemplate("students")}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0"
                      >
                        Unduh .XLSX Siswa
                      </button>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900">
                          Daftar Nominatif Guru / GTK &amp; Tugas Tambahan (.XLSX)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Unduh file Excel nominatif pendidik dan pembagian tugas mengajar.
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadXlsxTemplate("teachers")}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0"
                      >
                        Unduh .XLSX GTK
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/40 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-xs">{toastMsg.title}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">{toastMsg.sub}</p>
          </div>
        </div>
      )}
    </div>
  );
}
