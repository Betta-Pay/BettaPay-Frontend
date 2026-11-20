import { NextResponse } from "next/server";
import { isValidIp } from "./validateIp";

export const NO_STORE = { "Cache-Control": "no-store" };

/** Decode and validate the `[ip]` path segment (IPv6 arrives percent-encoded). */
export function parseIpParam(raw: string): string | null {
  let ip = raw;
  try {
    ip = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return isValidIp(ip) ? ip : null;
}

export const badIp = () =>
  NextResponse.json({ error: "Invalid IP address" }, { status: 400, headers: NO_STORE });

/** Best-effort caller IP for the audit trail. */
export function callerIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || req.headers.get("x-real-ip") || null;
}
