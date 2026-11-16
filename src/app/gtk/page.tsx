import SimmWorkspaceShell from "@/components/SimmWorkspaceShell";
import { loadPortalSsrProps } from "@/lib/portal-ssr";

export const dynamic = "force-dynamic";

export default async function GtkDashboardPage() {
  const { initialSession, initialDb } = await loadPortalSsrProps();
  return (
    <SimmWorkspaceShell
      activePortal="gtk"
      initialSession={initialSession}
      initialDb={initialDb}
    />
  );
}
