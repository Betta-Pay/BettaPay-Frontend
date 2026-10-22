import { adminProxy } from '@/lib/admin/proxy';
export async function GET(req: Request, { params }: { params: { id: string } }) {
  return adminProxy(req, `/api/admin/merchants/${encodeURIComponent(params.id)}`);
}
