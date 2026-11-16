import { getAuthContext, buildSessionPayload } from "@/lib/guard";
import { getScopedSummary } from "@/lib/data-scope";
import { ActiveSession, SimmDbSummary } from "@/types/simm";

export async function loadPortalSsrProps(): Promise<{
  initialSession: ActiveSession | null;
  initialDb: SimmDbSummary;
}> {
  const ctx = await getAuthContext();
  const [sessionPayload, summary] = await Promise.all([
    ctx ? buildSessionPayload(ctx.user) : Promise.resolve(null),
    getScopedSummary(ctx),
  ]);

  return {
    initialSession: sessionPayload as ActiveSession | null,
    initialDb: summary as unknown as SimmDbSummary,
  };
}
