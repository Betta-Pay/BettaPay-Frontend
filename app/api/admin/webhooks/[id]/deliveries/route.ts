/** GET /api/admin/webhooks/:id/deliveries?limit=25 — recent delivery attempts. */
import { guardAdminApi } from '@/lib/auth/adminApiGuard';
import { fail, json, ID_PATTERN } from '@/lib/webhooks/http';
import { getSubscription, listDeliveries } from '@/lib/webhooks/store';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  if (!ID_PATTERN.test(params.id)) return fail(400, 'Invalid subscription id');
  if (!getSubscription(params.id)) return fail(404, 'Webhook subscription not found');

  const limit = Number(new URL(req.url).searchParams.get('limit') ?? '25');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return fail(400, 'limit must be an integer between 1 and 100');
  }
  return json({ data: listDeliveries(params.id, limit) });
}
