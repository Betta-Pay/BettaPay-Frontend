/** POST /api/admin/webhooks/:id/test — sends a real signed test event. */
import { guardAdminApi } from '@/lib/auth/adminApiGuard';
import { fail, json, ID_PATTERN } from '@/lib/webhooks/http';
import { sendTest, toPublicSubscription, getSubscription } from '@/lib/webhooks/store';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  if (!ID_PATTERN.test(params.id)) return fail(400, 'Invalid subscription id');

  const delivery = await sendTest(params.id);
  if (!delivery) return fail(404, 'Webhook subscription not found');
  const sub = getSubscription(params.id)!;
  return json({ data: delivery, subscription: toPublicSubscription(sub) });
}
