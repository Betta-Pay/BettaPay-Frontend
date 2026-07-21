import type { SchemaField } from '@/lib/docs/types';
import { SchemaTable } from '../SchemaTable';
import { SectionShell, SubSection, P, Code, Callout } from './primitives';
import { Snippet } from './Snippet';

const EVENT_TYPES: Array<{ type: string; when: string }> = [
  { type: 'payment.completed', when: 'A payment settled on-chain and funds are confirmed.' },
  { type: 'payment.failed', when: 'A payment could not be completed.' },
  { type: 'payment.expired', when: 'A pending payment passed its expiry window.' },
  { type: 'settlement.completed', when: 'A settlement batch cleared and the payout was sent.' },
  { type: 'settlement.failed', when: 'A settlement could not be processed.' },
];

const payloadFields: SchemaField[] = [
  { name: 'id', type: 'string', required: true, description: 'Unique event id — use it to deduplicate retries.', example: 'evt_9b2f...' },
  { name: 'type', type: 'string (enum)', required: true, description: 'The event type (see the table above).', example: 'payment.completed' },
  { name: 'createdAt', type: 'string (ISO 8601)', required: true, description: 'When the event was emitted.' },
  { name: 'data', type: 'object', required: true, description: 'The full resource (payment or settlement) at the time of the event.' },
];

const examplePayload = `{
  "id": "evt_9b2f1c...",
  "type": "payment.completed",
  "createdAt": "2026-07-18T10:05:12.000Z",
  "data": {
    "id": "9b2f...",
    "merchantId": "4c1e...",
    "amountUsdc": 25.00,
    "status": "completed",
    "txHash": "a1b2..."
  }
}`;

const verifySignature = `import crypto from 'node:crypto';

// Express example. Read the RAW body — HMAC is computed over the exact bytes.
app.post('/webhooks/bettapay', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.header('X-BettaPay-Signature') ?? '';           // "sha256=<hex>"
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.BETTAPAY_WEBHOOK_SECRET)
    .update(req.body)                                                    // Buffer of raw bytes
    .digest('hex');

  // Constant-time compare to avoid leaking timing information.
  const ok =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!ok) return res.status(400).send('invalid signature');

  const event = JSON.parse(req.body.toString('utf8'));
  // ... handle event.type, dedupe on event.id ...
  res.sendStatus(200);
});`;

/** "Webhook Events" — event catalog, payload, signing and retries. */
export function WebhookEvents() {
  return (
    <SectionShell
      id="webhook-events"
      title="Webhook Events"
      lead="Subscribe to webhooks to be notified the moment a payment or settlement changes state, instead of polling. Every delivery is signed so you can trust its origin."
    >
      <SubSection id="webhook-event-types" title="Event types">
        <P>The gateway emits the following events:</P>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr className="bg-muted/40">
                <th className="py-2.5 pl-4 pr-4 text-xs font-semibold text-muted-foreground">Event</th>
                <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Emitted when</th>
              </tr>
            </thead>
            <tbody>
              {EVENT_TYPES.map((event) => (
                <tr key={event.type} className="border-t border-border align-top">
                  <td className="py-2.5 pl-4 pr-4">
                    <code className="font-mono text-xs font-medium text-foreground">{event.type}</code>
                  </td>
                  <td className="py-2.5 pr-4 text-xs leading-relaxed text-muted-foreground">{event.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection id="webhook-payload" title="Payload structure">
        <P>
          Every event shares the same envelope: an <Code>id</Code>, a <Code>type</Code>, a{' '}
          <Code>createdAt</Code> timestamp and the resource in <Code>data</Code>.
        </P>
        <SchemaTable fields={payloadFields} />
        <Snippet code={examplePayload} lang="json" filename="payment.completed" />
      </SubSection>

      <SubSection id="webhook-signature" title="Signature verification">
        <P>
          Each request carries an <Code>X-BettaPay-Signature</Code> header of the form{' '}
          <Code>sha256=&lt;hex&gt;</Code> — an HMAC-SHA256 of the raw request body keyed with your
          webhook secret. Recompute it and compare in constant time before trusting the payload.
        </P>
        <Snippet code={verifySignature} lang="javascript" filename="webhook-handler.js" />
        <Callout variant="warning" title="Verify against the raw body">
          Compute the HMAC over the exact received bytes — parsing and re-serializing the JSON first
          will change the bytes and break verification.
        </Callout>
      </SubSection>

      <SubSection id="webhook-retries" title="Retry policy">
        <P>
          Respond with a <Code>2xx</Code> quickly (do heavy work asynchronously). Any non-2xx or a
          timeout is retried with exponential backoff for up to 24 hours. Because a delivery may
          arrive more than once, handlers must be idempotent — dedupe on <Code>event.id</Code>.
        </P>
      </SubSection>
    </SectionShell>
  );
}
