"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  FileCheck2,
  GraduationCap,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { PortalDbSummary, callSimmAction } from "./types";

interface PpdbPortalProps {
  db: PortalDbSummary;
}

export default function PpdbPortal({ db }: PpdbPortalProps) {
  const { profile } = db;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [track, setTrack] = useState<"REGULER" | "PRESTASI" | "AFIRMASI">("REGULER");
  const [fullName, setFullName] = useState("");
  const [nisn, setNisn] = useState("");
  const [nik, setNik] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState("2014-01-01");
  const [gender, setGender] = useState<"LAKI-LAKI" | "PEREMPUAN">("LAKI-LAKI");
  const [previousSchool, setPreviousSchool] = useState("");
  const [avgScore, setAvgScore] = useState("88.00");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentOccupation, setParentOccupation] = useState("");
  const [address, setAddress] = useState("");

  const [docs, setDocs] = useState<{
    kk?: string;
    akta?: string;
    skl?: string;
    foto?: string;
  }>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedReceipt, setSubmittedReceipt] = useState<{
    regNo: string;
    status: string;
    submittedAt: string;
  } | null>(null);

  const handleUploadDoc = async (
    docKey: "kk" | "akta" | "skl" | "foto",
    file: File | null
  ) => {
    if (!file) return;
    setErrorMsg("");
    setUploadingKey(docKey);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `ppdb-2027/${docKey}`);
      fd.append("customName", file.name);
      const res = await fetch("/api/r2/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal mengunggah berkas ke R2");
      }
      setDocs((prev) => ({ ...prev, [docKey]: data.key }));
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal mengunggah dokumen");
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSubmitPpdb = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!/^\d{10}$/.test(nisn.trim())) {
      setErrorMsg("NISN wajib terdiri dari tepat 10 digit angka.");
      return;
    }
    if (!/^\d{16}$/.test(nik.trim())) {
      setErrorMsg("NIK wajib terdiri dari tepat 16 digit angka.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await callSimmAction("SUBMIT_PPDB", {
        track,
        fullName: fullName.trim(),
        nisn: nisn.trim(),
        nik: nik.trim(),
        birthPlace: birthPlace.trim() || "-",
        birthDate,
        gender,
        previousSchool: previousSchool.trim() || "-",
        avgScore,
        fatherName: fatherName.trim() || "-",
        motherName: motherName.trim() || "-",
        parentPhone: parentPhone.trim() || "-",
        parentOccupation: parentOccupation.trim() || "-",
        address: address.trim() || "-",
        docKkUrl: docs.kk || null,
        docAktaUrl: docs.akta || null,
        docSklUrl: docs.skl || null,
        docFotoUrl: docs.foto || null,
      });
      setSubmittedReceipt(res.data);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal mengirim pendaftaran PPDB");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-40 glass-surface border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-600 text-white flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-heading font-extrabold text-sm sm:text-base text-slate-900 truncate">
                Portal PPDB Online — {profile.name}
              </p>
              <p className="text-[11px] font-semibold text-emerald-700 truncate">
                Tahun Pelajaran {profile.academicYear} • Pemberkasan Digital R2
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Beranda Publik</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {submittedReceipt ? (
          <div className="glass-surface rounded-3xl p-8 shadow-soft border-2 border-emerald-200 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
                PENDAFTARAN BERHASIL DITERIMA
              </span>
              <h1 className="font-heading text-2xl font-extrabold text-slate-900 mt-3">
                Terima Kasih, {fullName}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Simpan nomor registrasi di bawah ini untuk memantau hasil seleksi oleh Panitia PPDB {profile.name}.
              </p>
            </div>

            <div className="max-w-md mx-auto p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-sm">
              <p className="text-xs text-emerald-800 uppercase font-bold">
                Nomor Registrasi Resmi
              </p>
              <p className="font-mono text-2xl font-extrabold text-emerald-900">
                {submittedReceipt.regNo}
              </p>
              <p className="text-xs text-slate-600">
                Status: <strong>{submittedReceipt.status}</strong> •{" "}
                {submittedReceipt.submittedAt}
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubmittedReceipt(null);
                  setStep(1);
                  setFullName("");
                  setNisn("");
                  setNik("");
                  setDocs({});
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Daftarkan Peserta Lain
              </button>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass-surface rounded-3xl p-6 sm:p-8 shadow-soft space-y-6">
            {/* Stepper */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { n: 1, label: "Jalur Seleksi" },
                { n: 2, label: "Biodata Siswa" },
                { n: 3, label: "Orang Tua & Alamat" },
                { n: 4, label: "Unggah Berkas R2" },
              ].map((s) => (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => setStep(s.n as 1 | 2 | 3 | 4)}
                  className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                    step === s.n
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : step > s.n
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-white text-slate-500 border-slate-200"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase block">
                    Langkah {s.n}
                  </span>
                  <span className="text-xs font-bold truncate block">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitPpdb} className="space-y-5 text-sm">
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-heading font-bold text-lg text-slate-900">
                    1. Pilih Jalur Pendaftaran PPDB
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        key: "REGULER",
                        title: "Jalur Reguler",
                        desc: "Seleksi umum nilai rapor SD/MI & tes BTQ.",
                      },
                      {
                        key: "PRESTASI",
                        title: "Jalur Prestasi",
                        desc: "Tahfidz Al-Qur'an, KSM, atau piagam akademik/non-akademik.",
                      },
                      {
                        key: "AFIRMASI",
                        title: "Jalur Afirmasi / KIP",
                        desc: "Khusus pemegang KIP / PKH / KKS.",
                      },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() =>
                          setTrack(t.key as "REGULER" | "PRESTASI" | "AFIRMASI")
                        }
                        className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer ${
                          track === t.key
                            ? "border-emerald-600 bg-emerald-50/70"
                            : "border-slate-200 bg-white hover:border-emerald-300"
                        }`}
                      >
                        <p className="font-bold text-slate-900">{t.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Lanjut ke Biodata →
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-heading font-bold text-lg text-slate-900">
                    2. Biodata Calon Peserta Didik
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Lengkap (Sesuai Ijazah/Akta)
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NISN (10 Digit Angka)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={nisn}
                        onChange={(e) => setNisn(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NIK (16 Digit Angka)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={16}
                        value={nik}
                        onChange={(e) => setNik(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tempat Lahir
                      </label>
                      <input
                        type="text"
                        value={birthPlace}
                        onChange={(e) => setBirthPlace(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tanggal Lahir
                      </label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jenis Kelamin
                      </label>
                      <select
                        value={gender}
                        onChange={(e) =>
                          setGender(e.target.value as "LAKI-LAKI" | "PEREMPUAN")
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                      >
                        <option value="LAKI-LAKI">Laki-laki</option>
                        <option value="PEREMPUAN">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Asal SD / MI
                      </label>
                      <input
                        type="text"
                        value={previousSchool}
                        onChange={(e) => setPreviousSchool(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      ← Kembali
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Lanjut ke Data Orang Tua →
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-heading font-bold text-lg text-slate-900">
                    3. Data Orang Tua / Wali &amp; Alamat
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Ayah Kandung
                      </label>
                      <input
                        type="text"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Ibu Kandung
                      </label>
                      <input
                        type="text"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        No. WhatsApp Orang Tua Aktif
                      </label>
                      <input
                        type="text"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nilai Rata-rata Rapor
                      </label>
                      <input
                        type="text"
                        value={avgScore}
                        onChange={(e) => setAvgScore(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alamat Domisili Lengkap
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      ← Kembali
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Lanjut ke Unggah Berkas →
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h2 className="font-heading font-bold text-lg text-slate-900">
                    4. Unggah Berkas Persyaratan (Cloudflare R2)
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: "kk", label: "Scan Kartu Keluarga (KK)" },
                      { key: "akta", label: "Scan Akta Kelahiran" },
                      { key: "skl", label: "Scan SKL / Rapor SD/MI" },
                      { key: "foto", label: "Pas Foto Terbaru (JPG/PNG)" },
                    ].map((d) => {
                      const k = d.key as "kk" | "akta" | "skl" | "foto";
                      const uploaded = docs[k];
                      return (
                        <label
                          key={k}
                          className={`p-4 rounded-2xl border-2 border-dashed flex flex-col gap-2 cursor-pointer transition ${
                            uploaded
                              ? "border-emerald-400 bg-emerald-50/60"
                              : "border-slate-300 bg-white hover:border-emerald-400"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-800">
                              {d.label}
                            </span>
                            {uploaded ? (
                              <FileCheck2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <CloudUpload className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 truncate">
                            {uploadingKey === k
                              ? "Mengunggah ke R2..."
                              : uploaded || "Klik untuk pilih PDF/JPG/PNG (Maks 5 MB)"}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            className="hidden"
                            onChange={(e) =>
                              handleUploadDoc(k, e.target.files?.[0] || null)
                            }
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex justify-between pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      ← Kembali
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer disabled:opacity-60"
                    >
                      {submitting
                        ? "Mengirim Pendaftaran..."
                        : "Kirim Pendaftaran PPDB Online →"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
