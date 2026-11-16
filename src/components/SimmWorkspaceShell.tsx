"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  ActiveSession,
  PortalKey,
  SimmDbSummary,
} from "@/types/simm";
import PublicPortalView from "./portals/PublicPortalView";
import PpdbPortalView from "./portals/PpdbPortalView";
import AdminTuPortalView from "./portals/AdminTuPortalView";
import GtkPortalView from "./portals/GtkPortalView";
import StudentParentPortalView from "./portals/StudentParentPortalView";

interface SimmWorkspaceShellProps {
  activePortal: PortalKey;
  initialSession?: ActiveSession | null;
  initialDb?: SimmDbSummary | null;
}

const DEFAULT_PROFILE = {
  name: "MTs Nurul Falah",
  nsm: "121232710000",
  npsn: "20200000",
  accreditation: "A",
  academicYear: "2025/2026",
  semester: "Genap",
  curriculum: "Kurikulum Merdeka & KMA 183",
  headmasterName: "Kepala Madrasah",
  headmasterNip: "-",
  tuHeadName: "Kepala TU",
  tuHeadNip: "-",
  address: "Jl. Raya Madrasah",
  phone: "-",
  email: "info@mtsnurulfalah.sch.id",
  gpsLat: "-6.5971",
  gpsLng: "106.8060",
  gpsRadiusMeters: 150,
  komiteBankInfo: "Bank Syariah Indonesia (BSI) - Hubungi TU",
};

export default function SimmWorkspaceShell({
  activePortal,
  initialSession = null,
  initialDb = null,
}: SimmWorkspaceShellProps) {
  const router = useRouter();
  const [session, setSession] = useState<ActiveSession | null>(initialSession);
  const [db, setDb] = useState<SimmDbSummary>(
    initialDb || { ok: true, profile: DEFAULT_PROFILE }
  );
  const [loading, setLoading] = useState(!initialDb);

  // Modals
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(
    Boolean(initialSession?.mustChangePassword)
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);

  const showToast = useCallback(
    (message: string, tone: "success" | "error" | "info" = "info") => {
      setToast({ message, tone });
      setTimeout(() => {
        setToast((prev) => (prev?.message === message ? null : prev));
      }, 4200);
    },
    []
  );

  const refreshData = useCallback(async () => {
    try {
      const [authRes, dbRes] = await Promise.all([
        fetch("/api/auth", { cache: "no-store" }),
        fetch("/api/simm?resource=summary", { cache: "no-store" }),
      ]);
      if (authRes.ok) {
        const authJson = await authRes.json();
        setSession(authJson.authenticated ? authJson.session : null);
      }
      if (dbRes.ok) {
        const dbJson = await dbRes.json();
        if (dbJson?.ok) setDb(dbJson);
      }
    } catch {
      // ignore transient network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialDb) {
      refreshData();
    }
  }, [initialDb, refreshData]);

  const handleConfirmLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      // ignore
    }
    setLogoutModalOpen(false);
    setSession(null);
    router.push("/");
    router.refresh();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast("Password baru minimal 6 karakter.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Konfirmasi password baru tidak cocok.", "error");
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Gagal mengganti password.");
      }
      showToast("Password berhasil diperbarui!", "success");
      setChangePwOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshData();
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui password.", "error");
    } finally {
      setPwBusy(false);
    }
  };

  // Public & PPDB portals don't require authenticated session
  if (activePortal === "publik") {
    return (
      <PublicPortalView
        initialSession={session}
        initialDb={db}
      />
    );
  }

  if (activePortal === "ppdb") {
    return <PpdbPortalView profile={db.profile || DEFAULT_PROFILE} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">
            Memuat portal {activePortal.toUpperCase()}...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-slate-900">
            Sesi Tidak Ditemukan
          </h1>
          <p className="text-sm text-slate-500">
            Anda harus masuk terlebih dahulu untuk mengakses portal{" "}
            <strong className="uppercase">{activePortal}</strong>.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
          >
            Kembali ke Portal & Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {(activePortal === "admin" || activePortal === "tu") && (
        <AdminTuPortalView
          mode={activePortal}
          session={session}
          db={db}
          onRefresh={refreshData}
          onToast={showToast}
          onOpenChangePassword={() => setChangePwOpen(true)}
          onRequestLogout={() => setLogoutModalOpen(true)}
        />
      )}

      {activePortal === "gtk" && (
        <GtkPortalView
          session={session}
          db={db}
          onRefresh={refreshData}
          onToast={showToast}
          onOpenChangePassword={() => setChangePwOpen(true)}
          onRequestLogout={() => setLogoutModalOpen(true)}
        />
      )}

      {(activePortal === "siswa" || activePortal === "ortu") && (
        <StudentParentPortalView
          mode={activePortal}
          session={session}
          db={db}
          onRefresh={refreshData}
          onToast={showToast}
          onOpenChangePassword={() => setChangePwOpen(true)}
          onRequestLogout={() => setLogoutModalOpen(true)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
              toast.tone === "success"
                ? "bg-emerald-900 text-white border-emerald-700"
                : toast.tone === "error"
                ? "bg-rose-900 text-white border-rose-700"
                : "bg-slate-900 text-white border-slate-700"
            }`}
          >
            {toast.tone === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white/60 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Logout */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Konfirmasi Keluar
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin mengakhiri sesi{" "}
                <strong>{session.name}</strong>? Anda harus masuk kembali untuk
                mengakses dashboard.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setLogoutModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ganti Password */}
      {changePwOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleChangePassword}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Ganti Password Akun
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {session.mustChangePassword
                      ? "Wajib ganti password default demi keamanan."
                      : "Perbarui kata sandi akun Anda."}
                  </p>
                </div>
              </div>
              {!session.mustChangePassword && (
                <button
                  type="button"
                  onClick={() => setChangePwOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Saat Ini
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru (Min. 6 karakter)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pwBusy}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
            >
              {pwBusy ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
