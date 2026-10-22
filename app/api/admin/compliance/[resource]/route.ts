import { NextResponse } from 'next/server';
import { adminProxy } from '@/lib/admin/proxy';
const resources = ['failed-logins', 'suspensions', 'webhook-failures', 'risk-queue', 'incidents'] as const;
export async function GET(req: Request, { params }: { params: { resource: string } }) {
  if (!resources.some(r => r === params.resource)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return adminProxy(req, `/api/admin/compliance/${params.resource}`);
}
