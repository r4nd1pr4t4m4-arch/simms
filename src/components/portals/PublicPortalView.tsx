"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LogIn,
  MapPin,
  Newspaper,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { ActiveSession, SimmDbSummary } from "@/types/simm";

interface PublicPortalViewProps {
  initialSession: ActiveSession | null;
  initialDb: SimmDbSummary;
}

export default function PublicPortalView({
  initialSession,
  initialDb,
}: PublicPortalViewProps) {
  const router = useRouter();
  const [session, setSession] = useState<ActiveSession | null>(initialSession);
  const profile = initialDb.profile;
  const stats = initialDb.stats;
  const teachers = initialDb.teachers || [];
  const cmsPosts = initialDb.cmsPosts || [];
  const dutySchedules = initialDb.dutySchedules || [];

  // Login modal state
  const [loginOpen, setLoginOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // NISN lookup state
  const [nisnInput, setNisnInput] = useState("");
  const [nisnLoading, setNisnLoading] = useState(false);
  const [nisnResult, setNisnResult] = useState<{
    checked: boolean;
    student: any | null;
  }>({ checked: false, student: null });

  // GTK directory filter
  const [gtkFilter, setGtkFilter] = useState("all");
  const [gtkQuery, setGtkQuery] = useState("");

  // News reader modal
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("login") === "required" && !session) {
        setLoginOpen(true);
      }
    }
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!identifier.trim() || !password) {
      setLoginError("Harap isi NIP / NISN / Email dan kata sandi Anda.");
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!data.ok || !data.session) {
        setLoginError(
          data.error || "Identitas akun atau kata sandi tidak sesuai."
        );
        setLoginLoading(false);
        return;
      }
      setSession(data.session);
      setLoginOpen(false);
      router.push(data.session.targetPath || "/gtk");
      router.refresh();
    } catch {
      setLoginError("Gagal menghubungi server autentikasi.");
      setLoginLoading(false);
    }
  };

  const handleLookupNisn = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nisnInput.trim();
    if (!clean) return;
    setNisnLoading(true);
    try {
      const res = await fetch(
        `/api/simm?resource=nisn&nisn=${encodeURIComponent(clean)}`
      );
      const data = await res.json();
      setNisnResult({ checked: true, student: data?.student || null });
    } catch {
      setNisnResult({ checked: true, student: null });
    } finally {
      setNisnLoading(false);
    }
  };

  const filteredTeachers = teachers.filter((t: any) => {
    const name = String(t.user?.name || t.nip || "").toLowerCase();
    const subj = String(t.subject || "").toLowerCase();
    const q = gtkQuery.trim().toLowerCase();
    const matchQuery = !q || name.includes(q) || subj.includes(q);
    if (!matchQuery) return false;
    if (gtkFilter === "all") return true;
    const rolesText = (t.roles || [])
      .map((r: any) => String(r.type || "").toLowerCase())
      .join(" ");
    if (gtkFilter === "pimpinan")
      return (
        rolesText.includes("kepala") ||
        rolesText.includes("waka") ||
        rolesText.includes("koordinator")
      );
    if (gtkFilter === "wali") return rolesText.includes("wali kelas");
    if (gtkFilter === "piket") return rolesText.includes("piket");
    if (gtkFilter === "keuangan")
      return rolesText.includes("komite") || rolesText.includes("tabungan");
    return true;
  });

  const piketTeachers = teachers
    .filter((t: any) =>
      (t.roles || []).some((r: any) =>
        String(r.type || "").toLowerCase().includes("piket")
      )
    )
    .slice(0, 3);

  const todayPiketList =
    dutySchedules.length > 0
      ? dutySchedules.slice(0, 3).map((d: any) => ({
          name: d.isOverridden ? d.overrideTeacherName : d.originalTeacherName,
          info: `${d.day} • ${d.shift}`,
        }))
      : (piketTeachers.length > 0 ? piketTeachers : teachers.slice(0, 2)).map(
          (t: any) => ({
            name: t.user?.name || t.nip,
            info: t.subject || "Guru Piket Madrasah",
          })
        );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-700 text-white flex items-center justify-center shadow-sm shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-base text-slate-900 truncate">
                {profile.name}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold truncate">
                NSM {profile.nsm} • NPSN {profile.npsn}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#cek-nisn" className="hover:text-emerald-700 transition">
              Cek NISN
            </a>
            <a href="#direktori-gtk" className="hover:text-emerald-700 transition">
              Direktori GTK
            </a>
            <a href="#berita" className="hover:text-emerald-700 transition">
              Berita &amp; Pengumuman
            </a>
            <Link href="/ppdb" className="hover:text-emerald-700 transition">
              PPDB Online
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/ppdb"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition"
            >
              PPDB Online
            </Link>
            {session ? (
              <Link
                href={session.targetPath || "/gtk"}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Saya</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk SIMS</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>
                Tahun Pelajaran {profile.academicYear} • Semester{" "}
                {profile.semester} ({profile.accreditation})
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Sistem Informasi Manajemen Madrasah Terpadu{" "}
              <span className="text-emerald-300">{profile.name}</span>
            </h1>

            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
              Portal layanan akademik digital, Buku Induk Siswa terpusat,
              pendaftaran PPDB Online, serta pemantauan kedisiplinan dan
              keuangan siswa berbasis {profile.curriculum}.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {session ? (
                <Link
                  href={session.targetPath || "/gtk"}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-emerald-950 font-bold text-sm shadow-lg hover:bg-emerald-50 transition"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Buka Dashboard ({session.name})</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-emerald-950 font-bold text-sm shadow-lg hover:bg-emerald-50 transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk Portal SIMS</span>
                </button>
              )}
              <Link
                href="/ppdb"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-700/70 hover:bg-emerald-700 text-white border border-emerald-400/40 font-bold text-sm transition"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Daftar PPDB Online</span>
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 pt-3 text-xs text-emerald-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-300" />
                <span>
                  <strong className="text-white font-bold">
                    {stats?.studentCount ?? 0}
                  </strong>{" "}
                  Siswa Aktif
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-300" />
                <span>
                  <strong className="text-white font-bold">
                    {stats?.teacherCount ?? teachers.length}
                  </strong>{" "}
                  Pendidik &amp; Tenaga Kependidikan
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-300" />
                <span className="truncate max-w-xs">{profile.address}</span>
              </div>
            </div>
          </div>

          {/* Live Piket & Kepala Madrasah Card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/15 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <CalendarCheck className="w-5 h-5 text-emerald-300" />
                  <div>
                    <h2 className="font-bold text-sm text-white">
                      Petugas Piket &amp; Layanan Hari Ini
                    </h2>
                    <p className="text-[11px] text-emerald-200">
                      Tersinkron langsung dari database SIMS
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-bold">
                  LIVE
                </span>
              </div>

              <div className="space-y-2.5">
                {todayPiketList.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-xs text-white">{p.name}</p>
                      <p className="text-[11px] text-emerald-200">{p.info}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/25 text-emerald-100 text-[10px] font-semibold">
                      Bertugas
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/30 border border-white/10 text-xs">
                <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold block">
                  Kepala Madrasah
                </span>
                <p className="font-bold text-white mt-0.5">
                  {profile.headmasterName}
                </p>
                <p className="text-[11px] text-emerald-200 font-mono">
                  NIP. {profile.headmasterNip}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cek NISN Buku Induk */}
      <section
        id="cek-nisn"
        className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-7 relative z-10"
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Layanan Publik Buku Induk
              </span>
              <h2 className="font-bold text-lg text-slate-900">
                Cek Status Keaktifan Siswa via NISN
              </h2>
            </div>
            <form
              onSubmit={handleLookupNisn}
              className="flex items-center gap-2 w-full md:w-auto"
            >
              <input
                type="text"
                value={nisnInput}
                onChange={(e) => setNisnInput(e.target.value)}
                placeholder="Masukkan 10 digit NISN..."
                className="flex-1 md:w-72 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={nisnLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>{nisnLoading ? "Mencari..." : "Periksa NISN"}</span>
              </button>
            </form>
          </div>

          {nisnResult.checked && (
            <div className="mt-4">
              {nisnResult.student ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-bold text-slate-900 text-base">
                      {nisnResult.student.name}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      NISN: <strong>{nisnResult.student.nisn}</strong> • NIS:{" "}
                      <strong>{nisnResult.student.nis}</strong> • Kelas:{" "}
                      <strong>{nisnResult.student.rombel}</strong> • Wali Kelas:{" "}
                      <strong>{nisnResult.student.waliKelas}</strong>
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
                    {nisnResult.student.status}
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Data peserta didik dengan NISN{" "}
                  <strong>&quot;{nisnInput}&quot;</strong> tidak ditemukan pada
                  Buku Induk {profile.name}.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Direktori GTK */}
      <section
        id="direktori-gtk"
        className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Pendidik &amp; Tenaga Kependidikan
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              Direktori GTK &amp; Tugas Tambahan
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={gtkQuery}
              onChange={(e) => setGtkQuery(e.target.value)}
              placeholder="Cari nama guru / mapel..."
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs"
            />
            {[
              { id: "all", label: "Semua" },
              { id: "pimpinan", label: "Pimpinan" },
              { id: "wali", label: "Wali Kelas" },
              { id: "piket", label: "Guru Piket" },
              { id: "keuangan", label: "Keuangan" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setGtkFilter(f.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  gtkFilter === f.id
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeachers.map((t: any) => (
            <div
              key={t.id || t.nip}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition space-y-3"
            >
              <div>
                <h3 className="font-bold text-slate-900">
                  {t.user?.name || t.nip}
                </h3>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                  {t.subject || "Pendidik Madrasah"}
                </p>
                <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                  NIP. {t.nip}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                {(t.roles && t.roles.length > 0
                  ? t.roles
                  : [{ type: "Pendidik Aktif", detail: "" }]
                ).map((r: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold"
                  >
                    {r.type}
                    {r.detail && r.detail !== "SK Tahun Ajaran Aktif"
                      ? ` (${r.detail})`
                      : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Berita & Pengumuman CMS */}
      <section
        id="berita"
        className="bg-white border-t border-slate-200/80 py-14"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Informasi Resmi Madrasah
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                Berita, Prestasi &amp; Pengumuman
              </h2>
            </div>
          </div>

          {cmsPosts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              Belum ada artikel berita yang dipublikasikan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cmsPosts.map((post: any) => (
                <article
                  key={post.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 flex flex-col justify-between space-y-4 hover:bg-white hover:shadow-md transition"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        {post.category}
                      </span>
                      <span className="text-slate-400">{post.dateLabel}</span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3">
                      {post.excerpt || post.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    <Newspaper className="w-3.5 h-3.5" />
                    <span>Baca Selengkapnya →</span>
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-950 text-slate-400 py-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-semibold text-slate-300">
            © {new Date().getFullYear()} {profile.name} (NSM {profile.nsm}) •
            SIMS Terpadu
          </p>
          <p>{profile.address}</p>
        </div>
      </footer>

      {/* Modal Baca Berita */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {selectedPost.category}
              </span>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <h2 className="text-xl font-bold text-slate-900">
                {selectedPost.title}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedPost.dateLabel} • Oleh {selectedPost.author}
              </p>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedPost.content || selectedPost.excerpt}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Login SIMS */}
      {loginOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-emerald-300" />
                <div>
                  <h2 className="text-base font-bold">Masuk Portal SIMS</h2>
                  <p className="text-[11px] text-emerald-200">
                    Admin • Tata Usaha • Guru/GTK • Siswa • Orang Tua
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLoginOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogin} className="p-6 space-y-4 text-sm">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP / NISN / Email Akun
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan NIP, NISN, atau Email..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                {loginLoading ? "Memverifikasi Akun..." : "Masuk ke Dashboard →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
