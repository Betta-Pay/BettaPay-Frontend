import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrfRequest, CSRF_FAILURE_STATUS } from '@/lib/utils/csrf';
import { createAlert, listFor, merchantKey } from '@/lib/server/rateAlerts';

export const runtime = 'nodejs';

/**
 * `/api/rate-alerts` (issue #469) — server-backed FX rate alerts per merchant.
 *
 * Store + evaluation live in `lib/server/rateAlerts`. State-changing verbs are
 * CSRF-protected (issue #486). Swap the in-memory store for a `rate_alerts`
 * table before production.
 */

export async function GET(req: NextRequest) {
  return NextResponse.json({ alerts: listFor(merchantKey(req)) });
}

const createSchema = z.object({
  pair: z.string().min(3),
  condition: z.enum(['above', 'below']),
  target: z.number().positive(),
  recurrence: z.enum(['once', 'recurring']).default('once'),
  channels: z.array(z.enum(['in_app', 'email', 'webhook'])).min(1).default(['in_app']),
  window: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid alert.' },
      { status: 400 },
    );
  }

  const alert = createAlert(parsed.data);
  listFor(merchantKey(req)).push(alert);
  return NextResponse.json({ alert }, { status: 201 });
}
