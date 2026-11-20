import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { fetchLiveIpScore } from "@/lib/security/backend";
import { attemptsFor, summarize } from "@/lib/security/store";
import { badIp, NO_STORE, parseIpParam } from "@/lib/security/http";
import type { IpDetailResponse } from "@/lib/security/types";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { ip: string } }) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const ip = parseIpParam(params.ip);
  if (!ip) return badIp();

  const lookup = await fetchLiveIpScore(ip);
  const body: IpDetailResponse = {
    summary: summarize(ip),
    attempts: attemptsFor(ip),
    live: lookup.ok ? lookup.live : null,
    liveError: lookup.ok ? null : lookup.error,
  };
  return NextResponse.json(body, { headers: NO_STORE });
}
