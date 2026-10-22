import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminProxy } from '@/lib/admin/proxy';
const schema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100), cursor: z.string().max(500).optional(),
  batchId: z.string().max(200).optional(),
  status: z.string().max(50).optional(), asset: z.string().max(20).optional(), merchantId: z.string().max(200).optional(),
  from: z.string().datetime().optional(), to: z.string().datetime().optional(),
  sort: z.enum(['createdAt', 'amountUsdc', 'status', 'merchantId', 'asset']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).refine(v => !v.from || !v.to || v.from <= v.to);
export async function GET(req: Request) {
  const parsed = schema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid ledger filters or date range.' }, { status: 400 });
  const query = new URLSearchParams();
  Object.entries(parsed.data).forEach(([k, v]) => { if (v !== undefined) query.set(k, String(v)); });
  return adminProxy(req, `/api/admin/transactions?${query}`);
}
