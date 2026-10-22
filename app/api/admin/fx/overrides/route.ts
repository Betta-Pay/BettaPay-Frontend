import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminProxy } from '@/lib/admin/proxy';
const schema = z.object({
  from: z.string().regex(/^[A-Z0-9]{2,12}$/), to: z.string().regex(/^[A-Z0-9]{2,12}$/),
  rate: z.number().finite().positive(), expiresAt: z.string().datetime(), reason: z.string().trim().min(1).max(1000),
}).refine(v => v.from !== v.to && Date.parse(v.expiresAt) > Date.now() && Date.parse(v.expiresAt) <= Date.now() + 86400000);
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Provide a positive rate, reason, and expiry within 24 hours.' }, { status: 400 });
  return adminProxy(req, '/api/admin/fx/overrides', parsed.data);
}
