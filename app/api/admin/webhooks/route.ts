/**
 * GET /api/admin/webhooks?page=1&limit=10
 * Paginated subscription list, newest first (id as tiebreaker, so pages never
 * overlap or skip). Signing secrets are masked.
 */
import { guardAdminApi } from '@/lib/auth/adminApiGuard';
import { json, fail } from '@/lib/webhooks/http';
import { listSubscriptions } from '@/lib/webhooks/store';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const params = new URL(req.url).searchParams;
  const page = Number(params.get('page') ?? '1');
  const limit = Number(params.get('limit') ?? '10');
  if (!Number.isInteger(page) || page < 1) return fail(400, 'page must be a positive integer');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return fail(400, 'limit must be an integer between 1 and 50');
  }
  return json(listSubscriptions(page, limit));
}
