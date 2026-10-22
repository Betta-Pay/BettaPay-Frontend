import { adminProxy } from '@/lib/admin/proxy';
export async function GET(req: Request) { return adminProxy(req, '/api/admin/fx/health'); }
