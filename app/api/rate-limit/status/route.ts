import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT = 60;
const WINDOW_SECONDS = 60;
interface RateLimitWindow { count: number; resetAt: number; }
const globalForRateLimits = globalThis as typeof globalThis & { rateLimitStatusWindows?: Map<string, RateLimitWindow>; };
const windows = globalForRateLimits.rateLimitStatusWindows ?? new Map<string, RateLimitWindow>();
globalForRateLimits.rateLimitStatusWindows = windows;

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const now = Math.floor(Date.now() / 1000);
  const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const current = windows.get(clientId);
  const rateWindow = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_SECONDS } : current;
  rateWindow.count = Math.min(RATE_LIMIT, rateWindow.count + 1);
  windows.set(clientId, rateWindow);
  const remaining = Math.max(0, RATE_LIMIT - rateWindow.count);
  const headers = { "Cache-Control": "no-store", "X-RateLimit-Limit": String(RATE_LIMIT), "X-RateLimit-Remaining": String(remaining), "X-RateLimit-Reset": String(rateWindow.resetAt) };
  return NextResponse.json({ limit: RATE_LIMIT, remaining, resetAt: rateWindow.resetAt }, { headers });
}
