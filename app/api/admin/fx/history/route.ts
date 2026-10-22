import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminProxy } from '@/lib/admin/proxy';
export async function GET(req: Request) {
  const parsed = z.object({ from: z.string().regex(/^[A-Z0-9]{2,12}$/), to: z.string().regex(/^[A-Z0-9]{2,12}$/) }).safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid currency pair.' }, { status: 400 });
  return adminProxy(req, `/api/rates/history?${new URLSearchParams(parsed.data)}`);
}
