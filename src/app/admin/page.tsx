import SimmWorkspaceShell from "@/components/SimmWorkspaceShell";
import { loadPortalSsrProps } from "@/lib/portal-ssr";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { initialSession, initialDb } = await loadPortalSsrProps();
  return (
    <SimmWorkspaceShell
      activePortal="admin"
      initialSession={initialSession}
      initialDb={initialDb}
    />
  );
}
