/** POST /api/admin/webhooks/:id/replay — re-sends the latest delivery. */
import { guardAdminApi } from '@/lib/auth/adminApiGuard';
import { fail, json, ID_PATTERN } from '@/lib/webhooks/http';
import { replayLatest } from '@/lib/webhooks/store';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  if (!ID_PATTERN.test(params.id)) return fail(400, 'Invalid subscription id');

  const result = await replayLatest(params.id);
  if (result === null) return fail(404, 'Webhook subscription not found');
  if (result === 'no-deliveries') return fail(409, 'This subscription has no deliveries to replay');
  return json({ data: result });
}
