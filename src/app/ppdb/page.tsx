import SimmWorkspaceShell from "@/components/SimmWorkspaceShell";
import { loadPortalSsrProps } from "@/lib/portal-ssr";

export const dynamic = "force-dynamic";

export default async function PpdbPage() {
  const { initialSession, initialDb } = await loadPortalSsrProps();
  return (
    <SimmWorkspaceShell
      activePortal="ppdb"
      initialSession={initialSession}
      initialDb={initialDb}
    />
  );
}
