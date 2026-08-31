import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrfRequest, CSRF_FAILURE_STATUS } from '@/lib/utils/csrf';
import { evaluateAlerts, listFor, merchantKey } from '@/lib/server/rateAlerts';

export const runtime = 'nodejs';

/**
 * `POST /api/rate-alerts/evaluate` (issue #469) — feed the current rate for a
 * pair and let the server fire any matching alerts.
 *
 * The server owns delivery + dedupe: an alert re-delivers at most once per
 * `DELIVERY_DEDUPE_MS`, `once` alerts deactivate after firing, in-app
 * deliveries land in the notification store immediately, and email/webhook
 * deliveries are queued for the worker. The client just reconciles its list
 * from the response.
 */

const schema = z.object({
  pair: z.string().min(3),
  rate: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const csrf = verifyCsrfRequest(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: 'CSRF validation failed.' }, { status: CSRF_FAILURE_STATUS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'pair and positive rate are required.' }, { status: 400 });
  }

  const merchant = merchantKey(req);
  const { triggered } = evaluateAlerts(merchant, parsed.data.pair, parsed.data.rate);

  return NextResponse.json({
    triggered: triggered.map((a) => a.id),
    alerts: listFor(merchant),
  });
}
