import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { listIps } from "@/lib/security/store";
import { IP_SCORE_THRESHOLD, type IpListResponse } from "@/lib/security/types";
import { NO_STORE } from "@/lib/security/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 64);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "100", 10);
  const body: IpListResponse = {
    data: listIps(q, Number.isFinite(limit) ? limit : 100),
    threshold: IP_SCORE_THRESHOLD,
  };
  return NextResponse.json(body, { headers: NO_STORE });
}
