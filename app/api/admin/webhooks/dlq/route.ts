/** GET /api/admin/webhooks/dlq — dead-letter queue (retries exhausted). */
import { guardAdminApi } from '@/lib/auth/adminApiGuard';
import { json } from '@/lib/webhooks/http';
import { getSubscription, listDlq } from '@/lib/webhooks/store';

export const runtime = 'nodejs';

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const data = listDlq().map((d) => ({
    ...d,
    subscriptionUrl: getSubscription(d.subscriptionId)?.url ?? null,
  }));
  return json({ data, total: data.length });
}
