"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
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
import { ActiveSession, PortalDbSummary } from "./types";

interface PublikPortalProps {
  db: PortalDbSummary;
  session: ActiveSession | null;
  onLoginSuccess: (sess: ActiveSession) => void;
  initialLoginOpen?: boolean;
}

export default function PublikPortal({
  db,
  session,
  onLoginSuccess,
  initialLoginOpen = false,
}: PublikPortalProps) {
  const { profile, stats, teachers, cmsPosts } = db;

  // Direktori GTK filter
  const [gtkFilter, setGtkFilter] = useState("semua");
  const [gtkQuery, setGtkQuery] = useState("");

  // CMS Berita filter & modal baca
  const [newsCategory, setNewsCategory] = useState("Semua");
  const [activePost, setActivePost] = useState<any | null>(null);

  // Cek NISN
  const [nisnInput, setNisnInput] = useState("");
  const [nisnLoading, setNisnLoading] = useState(false);
  const [nisnResult, setNisnResult] = useState<{
    searched: string;
    student: any | null;
    error?: string;
  } | null>(null);

  // Login Modal
  const [loginOpen, setLoginOpen] = useState(initialLoginOpen);
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  const gtkCards = useMemo(() => {
    return (teachers || []).map((t: any, idx: number) => {
      const name = t.user?.name || t.nip;
      const roles = Array.isArray(t.roles) ? t.roles : [];
      const categories: string[] = [];
      const badges: Array<{ label: string; tone: string }> = [];

      roles.forEach((r: any) => {
        const rt = String(r.type || "");
        const rl = rt.toLowerCase();
        const label =
          r.detail && r.detail !== "SK Tahun Ajaran Aktif" && !rt.includes(r.detail)
            ? `${rt} (${r.detail})`
            : rt;
        if (
          rl.includes("kepala") ||
          rl.includes("waka") ||
          rl.includes("operator") ||
          rl.includes("koordinator")
        ) {
          categories.push("pimpinan");
          badges.push({ label, tone: "bg-emerald-50 text-emerald-800 border-emerald-200" });
        } else if (rl.includes("wali kelas")) {
          categories.push("wali_kelas");
          badges.push({ label, tone: "bg-sky-50 text-sky-800 border-sky-200" });
        } else if (rl.includes("piket")) {
          categories.push("guru_piket");
          badges.push({ label, tone: "bg-amber-50 text-amber-800 border-amber-200" });
        } else if (rl.includes("bendahara") || rl.includes("tabungan") || rl.includes("komite")) {
          categories.push("keuangan");
          badges.push({ label, tone: "bg-purple-50 text-purple-800 border-purple-200" });
        } else if (rt) {
          badges.push({ label, tone: "bg-teal-50 text-teal-800 border-teal-200" });
        }
      });

      if (badges.length === 0) {
        badges.push({
          label: "Pendidik Aktif",
          tone: "bg-slate-100 text-slate-700 border-slate-200",
        });
      }

      return {
        id: idx + 1,
        name,
        nip: t.nip,
        subject: t.subject || "Pendidik Madrasah",
        categories,
        badges,
      };
    });
  }, [teachers]);

  const piketTeachers = useMemo(
    () =>
      gtkCards.filter((g) => g.categories.includes("guru_piket")).slice(0, 3),
    [gtkCards]
  );

  const filteredGtk = useMemo(() => {
    const q = gtkQuery.trim().toLowerCase();
    return gtkCards.filter((g) => {
      const catOk = gtkFilter === "semua" || g.categories.includes(gtkFilter);
      const qOk =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.subject.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [gtkCards, gtkFilter, gtkQuery]);

  const filteredNews = useMemo(() => {
    const list = cmsPosts || [];
    if (newsCategory === "Semua") return list;
    return list.filter((p: any) => p.category === newsCategory);
  }, [cmsPosts, newsCategory]);

  const handleLookupNisn = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = nisnInput.trim();
    if (!val) return;
    setNisnLoading(true);
    try {
      const res = await fetch(
        `/api/simm?resource=nisn&nisn=${encodeURIComponent(val)}`
      );
      const data = await res.json();
      setNisnResult({ searched: val, student: data?.student || null });
    } catch {
      setNisnResult({
        searched: val,
        student: null,
        error: "Gagal menghubungi server Buku Induk.",
      });
    } finally {
      setNisnLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginId.trim() || !loginPw) {
      setLoginError("Harap isi NIP / NISN / Email dan kata sandi.");
      return;
    }
    setLoginBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginId.trim(), password: loginPw }),
      });
      const data = await res.json();
      if (!data.ok || !data.session) {
        setLoginError(
          data.error || "Identitas atau kata sandi tidak sesuai."
        );
        setLoginBusy(false);
        return;
      }
      setLoginOpen(false);
      onLoginSuccess(data.session);
      window.location.replace(data.session.targetPath || "/gtk");
    } catch {
      setLoginError("Gagal menghubungi server autentikasi.");
      setLoginBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* STICKY NAVBAR */}
      <header className="sticky top-0 z-40 glass-surface border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="font-heading font-extrabold text-base sm:text-lg text-slate-900 truncate">
                {profile.name}
              </p>
              <p className="text-[11px] font-semibold text-emerald-700 truncate">
                NSM {profile.nsm} • NPSN {profile.npsn}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#beranda" className="hover:text-emerald-700 transition">
              Beranda
            </a>
            <a href="#direktori-gtk" className="hover:text-emerald-700 transition">
              Direktori GTK
            </a>
            <a href="#berita" className="hover:text-emerald-700 transition">
              Berita
            </a>
            <a href="#cek-nisn" className="hover:text-emerald-700 transition">
              Cek NISN
            </a>
            <Link
              href="/ppdb"
              className="text-emerald-700 font-semibold hover:text-emerald-800"
            >
              PPDB Online
            </Link>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {session ? (
              <Link
                href={session.targetPath || "/gtk"}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Dashboard Saya</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk SIMS</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section
        id="beranda"
        className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 py-14 sm:py-20 border-b border-slate-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-xs font-bold">
              <Award className="w-4 h-4 text-emerald-700" />
              <span>
                {profile.accreditation} • {profile.curriculum}
              </span>
            </div>

            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
              Portal Resmi &amp; SIMS Terpadu{" "}
              <span className="text-emerald-700">{profile.name}</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              Tahun Pelajaran{" "}
              <strong className="text-slate-900">{profile.academicYear}</strong>{" "}
              Semester <strong className="text-slate-900">{profile.semester}</strong>.
              Terintegrasi dengan Buku Induk Digital, Penerimaan Peserta Didik Baru (PPDB Online),
              Presensi GPS Guru, serta Layanan Orang Tua &amp; Siswa.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>
                  <strong className="text-slate-900">{stats.studentCount}</strong> Siswa Aktif
                </span>
              </span>
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span>
                  <strong className="text-slate-900">{stats.teacherCount}</strong> Pendidik &amp; GTK
                </span>
              </span>
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <BookOpen className="w-4 h-4 text-sky-600" />
                <span>
                  <strong className="text-slate-900">{stats.rombels.length}</strong> Rombel Aktif
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/ppdb"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition"
              >
                <span>Daftar PPDB Online →</span>
              </Link>
              <a
                href="#cek-nisn"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-sm font-semibold transition"
              >
                <Search className="w-4 h-4 text-emerald-600" />
                <span>Cek Status NISN Siswa</span>
              </a>
            </div>
          </div>

          {/* LIVE PIKET & IDENTITAS CARD */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-surface rounded-3xl p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Layanan Harian Madrasah
                  </span>
                  <h2 className="font-heading font-bold text-base text-slate-900">
                    Guru Piket Bertugas Hari Ini
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  Aktif
                </span>
              </div>

              <div className="space-y-2.5">
                {piketTeachers.length > 0 ? (
                  piketTeachers.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-sm text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.subject}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                        Guru Piket
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">
                    Petugas piket terjadwal sesuai jadwal harian madrasah.
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
                <p className="font-bold">Kepala Madrasah: {profile.headmasterName}</p>
                <p className="flex items-start gap-1.5 text-emerald-800">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{profile.address}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIREKTORI GTK */}
      <section id="direktori-gtk" className="py-14 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Sumber Daya Pendidik
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Direktori GTK &amp; Tugas Tambahan
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "semua", label: "Semua" },
              { key: "pimpinan", label: "Pimpinan & Waka" },
              { key: "wali_kelas", label: "Wali Kelas" },
              { key: "guru_piket", label: "Guru Piket" },
              { key: "keuangan", label: "Keuangan" },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setGtkFilter(f.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  gtkFilter === f.key
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
            <input
              type="text"
              value={gtkQuery}
              onChange={(e) => setGtkQuery(e.target.value)}
              placeholder="Cari nama guru / mapel..."
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs w-48"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGtk.map((g) => (
            <div
              key={g.id}
              className="glass-surface rounded-2xl p-5 shadow-soft flex flex-col justify-between space-y-3"
            >
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900">
                  {g.name}
                </h3>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                  {g.subject}
                </p>
                <p className="font-mono text-[11px] text-slate-400 mt-1">
                  NIP. {g.nip}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                {g.badges.map((b, i) => (
                  <span
                    key={i}
                    className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${b.tone}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BERITA & PENGUMUMAN CMS */}
      <section id="berita" className="py-14 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Informasi Resmi Madrasah
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                Berita &amp; Pengumuman Terbaru
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Semua", "Pengumuman", "Prestasi", "Akademik", "Kegiatan"].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewsCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      newsCategory === cat
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          {filteredNews.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-300 text-center text-sm text-slate-500">
              Belum ada artikel berita pada kategori ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredNews.map((post: any) => (
                <article
                  key={post.id || post.slug}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 flex flex-col justify-between space-y-4 hover:border-emerald-300 transition"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        {post.category || "Pengumuman"}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {post.dateLabel}
                      </span>
                    </div>
                    <h3 className="font-heading font-bold text-base text-slate-900 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 text-xs">
                    <span className="text-slate-500">{post.author}</span>
                    <button
                      type="button"
                      onClick={() => setActivePost(post)}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Baca Selengkapnya →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CEK NISN BUKU INDUK */}
      <section id="cek-nisn" className="py-14 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-surface rounded-3xl p-6 sm:p-8 shadow-soft space-y-5">
          <div className="text-center space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Verifikasi Buku Induk Digital
            </span>
            <h2 className="font-heading text-2xl font-extrabold text-slate-900">
              Layanan Cek Status NISN Peserta Didik
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Masukkan 10 digit NISN untuk memverifikasi keaktifan peserta didik pada Buku Induk {profile.name}.
            </p>
          </div>

          <form
            onSubmit={handleLookupNisn}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={nisnInput}
              onChange={(e) => setNisnInput(e.target.value)}
              placeholder="Contoh: 0123456789"
              className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 font-mono text-sm"
            />
            <button
              type="submit"
              disabled={nisnLoading}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition cursor-pointer disabled:opacity-60"
            >
              {nisnLoading ? "Memeriksa..." : "Cek NISN Sekarang"}
            </button>
          </form>

          {nisnResult && (
            <div>
              {nisnResult.student ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-slate-900 text-base">
                      {nisnResult.student.name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-semibold">
                      {nisnResult.student.status || "Terdaftar Aktif"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    NIS / NISN:{" "}
                    <strong>
                      {nisnResult.student.nis} / {nisnResult.student.nisn}
                    </strong>
                  </p>
                  <p className="text-xs text-slate-600">
                    Rombongan Belajar: <strong>{nisnResult.student.rombel}</strong>
                  </p>
                  <p className="text-xs text-slate-600">
                    Wali Kelas: <strong>{nisnResult.student.waliKelas || "-"}</strong>
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  {nisnResult.error ||
                    `Data peserta didik dengan NISN "${nisnResult.searched}" tidak ditemukan pada Buku Induk Madrasah.`}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto bg-slate-900 text-slate-300 py-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-white text-sm">{profile.name}</p>
            <p className="text-slate-400 mt-0.5">{profile.address}</p>
          </div>
          <p className="text-slate-400">
            © {new Date().getFullYear()} SIMS {profile.name} • NSM {profile.nsm}
          </p>
        </div>
      </footer>

      {/* MODAL BACA BERITA */}
      {activePost && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  {activePost.category} • {activePost.dateLabel}
                </span>
                <h3 className="font-heading text-xl font-extrabold text-slate-900 mt-2">
                  {activePost.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Oleh: {activePost.author}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePost(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-4">
              {activePost.content || activePost.excerpt}
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOGIN MULTI-PERAN */}
      {loginOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-emerald-300" />
                <div>
                  <h2 className="font-heading font-bold text-base">
                    Masuk Portal SIMS
                  </h2>
                  <p className="text-[11px] text-emerald-200">
                    Super Admin • TU • Guru/GTK • Siswa • Orang Tua
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4 text-sm">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  NIP / NISN / Email Akun
                </label>
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Masukkan NIP, NISN, atau Email..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loginBusy}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition cursor-pointer disabled:opacity-60"
              >
                {loginBusy ? "Memverifikasi Akun..." : "Masuk ke Dashboard →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
