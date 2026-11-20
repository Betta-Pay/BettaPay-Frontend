import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { appendAudit } from "@/lib/audit/store";
import { clearLiveIpScore } from "@/lib/security/backend";
import { clearLocal, summarize } from "@/lib/security/store";
import { badIp, callerIp, NO_STORE, parseIpParam } from "@/lib/security/http";
import type { ClearResponse } from "@/lib/security/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { ip: string } }) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const ip = parseIpParam(params.ip);
  if (!ip) return badIp();

  const before = summarize(ip);
  const backend = await clearLiveIpScore(ip);
  clearLocal(ip, "admin");
  const after = summarize(ip);

  const audit = appendAudit({
    action: "IP_SCORE_CLEARED",
    entityType: "IP",
    entityId: ip,
    actorId: "admin",
    actorType: "admin",
    ipAddress: callerIp(req),
    changes: {
      before: { score: before.cachedScore, lockedOut: before.lockedOut },
      after: { score: after.cachedScore, lockedOut: after.lockedOut, backendCleared: backend.cleared },
    },
  });

  const body: ClearResponse = {
    summary: after,
    backendCleared: backend.cleared,
    backendNote: backend.note,
    auditId: audit.id,
  };
  return NextResponse.json(body, { headers: NO_STORE });
}
