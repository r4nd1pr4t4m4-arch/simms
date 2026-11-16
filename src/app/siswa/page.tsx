import SimmWorkspaceShell from "@/components/SimmWorkspaceShell";
import { loadPortalSsrProps } from "@/lib/portal-ssr";

export const dynamic = "force-dynamic";

export default async function SiswaDashboardPage() {
  const { initialSession, initialDb } = await loadPortalSsrProps();
  return (
    <SimmWorkspaceShell
      activePortal="siswa"
      initialSession={initialSession}
      initialDb={initialDb}
    />
  );
}
