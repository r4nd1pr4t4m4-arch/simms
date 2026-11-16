import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIMS MTs Nurul Falah — Sistem Informasi Manajemen Sekolah & Madrasah",
  description:
    "Aplikasi Web Sistem Informasi Manajemen Sekolah/Madrasah (SIMS) berbasis Next.js, Supabase PostgreSQL, Prisma ORM, dan Cloudflare R2.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.svg"],
    apple: ["/favicon.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
