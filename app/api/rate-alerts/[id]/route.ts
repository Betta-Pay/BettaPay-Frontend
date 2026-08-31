import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrfRequest, CSRF_FAILURE_STATUS } from '@/lib/utils/csrf';
import { listFor, setFor, merchantKey } from '@/lib/server/rateAlerts';

export const runtime = 'nodejs';

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  target: z.number().positive().optional(),
  condition: z.enum(['above', 'below']).optional(),
  recurrence: z.enum(['once', 'recurring']).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'webhook'])).min(1).optional(),
  triggered: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const csrf = verifyCsrfRequest(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: 'CSRF validation failed.' }, { status: CSRF_FAILURE_STATUS });
  }

  const list = listFor(merchantKey(req));
  const alert = list.find((a) => a.id === params.id);
  if (!alert) return NextResponse.json({ error: 'Alert not found.' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid update.' }, { status: 400 });
  }

  Object.assign(alert, parsed.data);
  if (parsed.data.triggered === false) {
    alert.triggeredAt = undefined;
    alert.lastDeliveredAt = undefined;
  }
  return NextResponse.json({ alert });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const csrf = verifyCsrfRequest(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: 'CSRF validation failed.' }, { status: CSRF_FAILURE_STATUS });
  }

  const merchant = merchantKey(req);
  const list = listFor(merchant);
  const next = list.filter((a) => a.id !== params.id);
  if (next.length === list.length) {
    return NextResponse.json({ error: 'Alert not found.' }, { status: 404 });
  }
  setFor(merchant, next);
  return NextResponse.json({ ok: true });
}
