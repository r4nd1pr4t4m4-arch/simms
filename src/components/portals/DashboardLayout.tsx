"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  KeyRound,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { ActiveSession, MadrasahProfile } from "@/types/simm";

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeTone?: "emerald" | "amber" | "sky" | "teal" | "slate";
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

interface DashboardLayoutProps {
  portalBadge: string;
  portalSubtitle: string;
  profile: MadrasahProfile;
  session: ActiveSession | null;
  navGroups: NavGroup[];
  activeMenu: string;
  onSelectMenu: (key: string) => void;
  pageBreadcrumb: string;
  pageTitle: string;
  onOpenChangePassword: () => void;
  onRequestLogout: () => void;
  children: React.ReactNode;
}

const BADGE_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  sky: "bg-sky-100 text-sky-800",
  teal: "bg-teal-100 text-teal-800",
  slate: "bg-slate-100 text-slate-600",
};

function getInitials(name?: string) {
  if (!name) return "SM";
  const parts = String(name)
    .replace(/^(Ust\.|Usth\.|Dr\.|Drs\.|H\.|Hj\.|Bapak|Ibu)\s+/gi, "")
    .split(",")[0]
    .trim()
    .split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function DashboardLayout({
  portalBadge,
  portalSubtitle,
  profile,
  session,
  navGroups,
  activeMenu,
  onSelectMenu,
  pageBreadcrumb,
  pageTitle,
  onOpenChangePassword,
  onRequestLogout,
  children,
}: DashboardLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNavClick = (key: string) => {
    onSelectMenu(key);
    setDrawerOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80">
      {/* Brand Header */}
      <div className="h-20 px-5 flex items-center justify-between border-b border-slate-200/75 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-700 text-white flex items-center justify-center shadow-sm shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900 truncate">
                {profile.name}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-emerald-700 truncate">
              {portalBadge} • {portalSubtitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          aria-label="Tutup Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavClick(item.key)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-600/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium"
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-white" : "text-slate-500"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white"
                          : BADGE_CLASSES[item.badgeTone || "slate"]
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Akun & Navigasi */}
        <div className="pt-3 border-t border-slate-200/80 space-y-1">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Akun &amp; Navigasi
          </p>
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all"
          >
            <Globe className="w-4 h-4 shrink-0 text-slate-500" />
            <span className="truncate">Beranda Publik</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setDrawerOpen(false);
              onOpenChangePassword();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4 shrink-0 text-slate-500" />
            <span className="truncate">Ubah Kata Sandi</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDrawerOpen(false);
              onRequestLogout();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="truncate">Keluar Aplikasi</span>
          </button>
        </div>
      </nav>

      {/* Bottom Status */}
      <div className="p-4 border-t border-slate-200/75 bg-slate-50/70 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            TA {profile.academicYear} • {profile.semester}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 truncate">
          NSM: {profile.nsm} • NPSN: {profile.npsn}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-72">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-20 h-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka Navigasi"
              className="lg:hidden p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="truncate">{profile.name}</span>
                <span>/</span>
                <span className="text-emerald-700 font-semibold truncate">
                  {pageBreadcrumb}
                </span>
              </div>
              <h1 className="font-bold text-base sm:text-xl text-slate-900 truncate">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {session?.name || "Pengguna SIMS"}
              </p>
              <p className="text-[11px] text-emerald-700 font-medium leading-tight">
                {session?.baseRole || portalBadge}
                {session?.additionalRoles && session.additionalRoles.length > 0
                  ? ` • ${session.additionalRoles[0]}`
                  : ""}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {getInitials(session?.name)}
            </div>
          </div>
        </header>

        {/* Main Workspace Area */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
