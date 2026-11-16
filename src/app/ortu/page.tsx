import SimmWorkspaceShell from "@/components/SimmWorkspaceShell";
import { loadPortalSsrProps } from "@/lib/portal-ssr";

export const dynamic = "force-dynamic";

export default async function OrtuDashboardPage() {
  const { initialSession, initialDb } = await loadPortalSsrProps();
  return (
    <SimmWorkspaceShell
      activePortal="ortu"
      initialSession={initialSession}
      initialDb={initialDb}
    />
  );
}
