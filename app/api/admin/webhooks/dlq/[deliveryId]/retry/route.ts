/**
 * POST /api/admin/webhooks/dlq/:deliveryId/retry — manual retry of a dead
 * letter. A 2xx removes it from the queue; otherwise it stays queued and the
 * failed attempt is recorded.
 */
import { guardAdminApi } from '@/lib/auth/adminApiGuard';
import { fail, json, ID_PATTERN } from '@/lib/webhooks/http';
import { retryDlq } from '@/lib/webhooks/store';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: { deliveryId: string } }) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  if (!ID_PATTERN.test(params.deliveryId)) return fail(400, 'Invalid delivery id');

  const result = await retryDlq(params.deliveryId);
  if (!result) return fail(404, 'Dead-letter entry not found');
  return json({ data: result.delivery, resolved: result.resolved });
}
