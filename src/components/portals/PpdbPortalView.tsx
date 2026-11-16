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
import { MadrasahProfile, callSimmAction, uploadToR2 } from "@/types/simm";

interface PpdbPortalViewProps {
  profile: MadrasahProfile;
}

export default function PpdbPortalView({ profile }: PpdbPortalViewProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedReg, setSubmittedReg] = useState<{
    regNo: string;
    status: string;
    submittedAt: string;
  } | null>(null);

  const [form, setForm] = useState({
    track: "REGULER" as "REGULER" | "PRESTASI" | "AFIRMASI",
    fullName: "",
    nisn: "",
    nik: "",
    birthPlace: "",
    birthDate: "2014-01-01",
    gender: "LAKI-LAKI" as "LAKI-LAKI" | "PEREMPUAN",
    previousSchool: "",
    avgScore: "88.00",
    fatherName: "",
    motherName: "",
    parentPhone: "",
    parentOccupation: "",
    address: "",
    docKkUrl: "",
    docAktaUrl: "",
    docSklUrl: "",
    docFotoUrl: "",
    docExtraName: "",
    docExtraUrl: "",
  });

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const handleUploadDoc = async (
    field: "docKkUrl" | "docAktaUrl" | "docSklUrl" | "docFotoUrl" | "docExtraUrl",
    folderSuffix: string,
    file?: File
  ) => {
    if (!file) return;
    setUploadingKey(field);
    setErrorMsg("");
    try {
      const data = await uploadToR2(file, `ppdb-2027/${folderSuffix}`);
      if (data.ok && data.key) {
        setForm((prev) => ({ ...prev, [field]: data.key }));
      } else {
        setErrorMsg(data.error || "Gagal mengunggah dokumen ke R2.");
      }
    } catch {
      setErrorMsg("Gagal menghubungi endpoint unggah R2.");
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg("");
    if (!form.fullName.trim()) {
      setErrorMsg("Nama lengkap calon siswa wajib diisi.");
      setStep(1);
      return;
    }
    if (!/^\d{10}$/.test(form.nisn.trim())) {
      setErrorMsg("NISN harus terdiri dari tepat 10 digit angka.");
      setStep(1);
      return;
    }
    if (!/^\d{16}$/.test(form.nik.trim())) {
      setErrorMsg("NIK harus terdiri dari tepat 16 digit angka.");
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const res = await callSimmAction("SUBMIT_PPDB", { ...form });
      if (res.ok && res.data) {
        setSubmittedReg(res.data);
      } else {
        setErrorMsg(res.error || "Pendaftaran PPDB gagal diproses.");
      }
    } catch {
      setErrorMsg("Gagal terhubung ke server PPDB.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-base text-slate-900 truncate">
                PPDB Online {profile.name}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold truncate">
                Tahun Pelajaran {profile.academicYear} • Pemberkasan Digital R2
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Beranda Publik</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {submittedReg ? (
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-lg p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                PENDAFTARAN BERHASIL TERCATAT
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-3">
                {form.fullName}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Nomor Registrasi Resmi Anda:
              </p>
              <p className="text-2xl font-mono font-extrabold text-emerald-700 mt-1">
                {submittedReg.regNo}
              </p>
            </div>
            <div className="max-w-lg mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>
                NISN: <strong className="font-mono">{form.nisn}</strong> •
                Jalur: <strong>{form.track}</strong>
              </p>
              <p>
                Status: <strong>{submittedReg.status}</strong> • Waktu:{" "}
                {submittedReg.submittedAt}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Cetak Bukti Pendaftaran
              </button>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Step Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-950 to-teal-900 text-white">
              <div className="flex items-center gap-2 text-xs text-emerald-200 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Formulir Penerimaan Peserta Didik Baru</span>
              </div>
              <h1 className="text-xl font-bold mt-1">
                Pendaftaran Mandiri Calon Siswa {profile.name}
              </h1>

              <div className="grid grid-cols-4 gap-2 mt-5 text-[11px] font-bold">
                {[
                  { n: 1, label: "1. Jalur & Biodata" },
                  { n: 2, label: "2. Orang Tua & Alamat" },
                  { n: 3, label: "3. Unggah Berkas R2" },
                  { n: 4, label: "4. Konfirmasi" },
                ].map((s) => (
                  <button
                    key={s.n}
                    type="button"
                    onClick={() => setStep(s.n as 1 | 2 | 3 | 4)}
                    className={`py-2 px-3 rounded-xl text-left transition cursor-pointer ${
                      step === s.n
                        ? "bg-white text-emerald-950"
                        : step > s.n
                          ? "bg-emerald-700/70 text-emerald-100"
                          : "bg-white/10 text-emerald-200/80"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-5 text-sm">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
                  {errorMsg}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Pilih Jalur Pendaftaran
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          k: "REGULER",
                          title: "Jalur Reguler",
                          desc: "Seleksi nilai rapor & tes BTQ",
                        },
                        {
                          k: "PRESTASI",
                          title: "Jalur Prestasi",
                          desc: "Tahfidz Al-Qur'an, KSM, Akademik",
                        },
                        {
                          k: "AFIRMASI",
                          title: "Jalur Afirmasi / KIP",
                          desc: "Pemegang KIP / PKH / SKTM",
                        },
                      ].map((t) => (
                        <button
                          key={t.k}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              track: t.k as "REGULER" | "PRESTASI" | "AFIRMASI",
                            })
                          }
                          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                            form.track === t.k
                              ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <p className="font-bold text-slate-900">{t.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {t.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Lengkap Calon Siswa
                      </label>
                      <input
                        type="text"
                        required
                        value={form.fullName}
                        onChange={(e) =>
                          setForm({ ...form, fullName: e.target.value })
                        }
                        placeholder="Sesuai Ijazah / Akta Kelahiran"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jenis Kelamin
                      </label>
                      <select
                        value={form.gender}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            gender: e.target.value as "LAKI-LAKI" | "PEREMPUAN",
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                      >
                        <option value="LAKI-LAKI">Laki-laki</option>
                        <option value="PEREMPUAN">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NISN (Wajib 10 Digit Angka)
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={form.nisn}
                        onChange={(e) =>
                          setForm({ ...form, nisn: e.target.value })
                        }
                        placeholder="013xxxxxxx"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NIK Siswa (Wajib 16 Digit Angka)
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={form.nik}
                        onChange={(e) =>
                          setForm({ ...form, nik: e.target.value })
                        }
                        placeholder="1605xxxxxxxxxxxx"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tempat Lahir
                      </label>
                      <input
                        type="text"
                        value={form.birthPlace}
                        onChange={(e) =>
                          setForm({ ...form, birthPlace: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tanggal Lahir
                      </label>
                      <input
                        type="date"
                        value={form.birthDate}
                        onChange={(e) =>
                          setForm({ ...form, birthDate: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Asal SD / MI
                      </label>
                      <input
                        type="text"
                        value={form.previousSchool}
                        onChange={(e) =>
                          setForm({ ...form, previousSchool: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rata-rata Nilai Rapor (0–100)
                      </label>
                      <input
                        type="text"
                        value={form.avgScore}
                        onChange={(e) =>
                          setForm({ ...form, avgScore: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Ayah Kandung
                    </label>
                    <input
                      type="text"
                      value={form.fatherName}
                      onChange={(e) =>
                        setForm({ ...form, fatherName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Ibu Kandung
                    </label>
                    <input
                      type="text"
                      value={form.motherName}
                      onChange={(e) =>
                        setForm({ ...form, motherName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor WhatsApp Orang Tua / Wali
                    </label>
                    <input
                      type="text"
                      value={form.parentPhone}
                      onChange={(e) =>
                        setForm({ ...form, parentPhone: e.target.value })
                      }
                      placeholder="0812xxxxxxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pekerjaan Orang Tua
                    </label>
                    <input
                      type="text"
                      value={form.parentOccupation}
                      onChange={(e) =>
                        setForm({ ...form, parentOccupation: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alamat Domisili Lengkap
                    </label>
                    <textarea
                      rows={3}
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      field: "docKkUrl" as const,
                      folder: "kk",
                      label: "Scan Kartu Keluarga (KK)",
                    },
                    {
                      field: "docAktaUrl" as const,
                      folder: "akta",
                      label: "Scan Akta Kelahiran",
                    },
                    {
                      field: "docSklUrl" as const,
                      folder: "skl",
                      label: "Scan SKL / Rapor SD/MI",
                    },
                    {
                      field: "docFotoUrl" as const,
                      folder: "foto",
                      label: "Pas Foto Resmi (JPG/PNG)",
                    },
                  ].map((doc) => (
                    <label
                      key={doc.field}
                      className="p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900">
                          {doc.label}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {uploadingKey === doc.field
                            ? "Mengunggah ke Cloudflare R2..."
                            : form[doc.field]
                              ? `✓ Tersimpan: ${form[doc.field]}`
                              : "Klik pilih PDF / JPG / PNG (Maks 5 MB)"}
                        </p>
                      </div>
                      {form[doc.field] ? (
                        <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <CloudUpload className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) =>
                          handleUploadDoc(
                            doc.field,
                            doc.folder,
                            e.target.files?.[0]
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <p className="font-bold text-sm text-slate-900">
                    Ringkasan Data Pendaftar
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <p>
                      Nama: <strong>{form.fullName || "-"}</strong>
                    </p>
                    <p>
                      Jalur: <strong>{form.track}</strong>
                    </p>
                    <p>
                      NISN / NIK:{" "}
                      <strong className="font-mono">
                        {form.nisn} / {form.nik}
                      </strong>
                    </p>
                    <p>
                      Asal Sekolah: <strong>{form.previousSchool || "-"}</strong>
                    </p>
                    <p>
                      Orang Tua:{" "}
                      <strong>
                        {form.fatherName || "-"} / {form.motherName || "-"}
                      </strong>
                    </p>
                    <p>
                      No. WA: <strong className="font-mono">{form.parentPhone || "-"}</strong>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  ← Sebelumnya
                </button>
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Langkah Berikutnya →
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>
                      {submitting
                        ? "Mengirim Pendaftaran..."
                        : "Kirim Pendaftaran PPDB Sekarang"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
