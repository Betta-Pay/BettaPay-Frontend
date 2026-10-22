import { NextResponse } from 'next/server';

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function fail(status: number, error: string): NextResponse {
  return json({ error }, status);
}

/** Subscription / delivery ids are opaque tokens; reject anything else early. */
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
