import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminProxy } from '@/lib/admin/proxy';

const filters = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().max(500).optional(), search: z.string().max(200).optional(),
  status: z.enum(['active', 'suspended', 'pending']).optional(),
  kycStatus: z.enum(['unverified', 'pending', 'approved', 'rejected']).optional(),
});
export async function GET(req: Request) {
  const parsed = filters.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid merchant filters.' }, { status: 400 });
  const query = new URLSearchParams();
  Object.entries(parsed.data).forEach(([key, value]) => { if (value !== undefined) query.set(key, String(value)); });
  return adminProxy(req, `/api/admin/merchants?${query}`);
}
const action = z.object({
  merchantIds: z.array(z.string().min(1).max(200)).min(1).max(100),
  action: z.enum(['suspend', 'activate', 'assign_reviewer']), reviewerId: z.string().trim().min(1).max(200).optional(),
}).refine(v => v.action !== 'assign_reviewer' || !!v.reviewerId, { message: 'Reviewer is required.' });
export async function POST(req: Request) {
  const parsed = action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid merchant action.' }, { status: 400 });
  return adminProxy(req, '/api/admin/merchants/actions', parsed.data);
}
