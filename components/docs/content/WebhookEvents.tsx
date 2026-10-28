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
  const timestamp = req.header('X-BettaPay-Timestamp') ?? '';           // unix seconds
  const signature = req.header('X-BettaPay-Signature') ?? '';           // "sha256=<hex>"

  // Canonical signed string: \`\${timestamp}.\${rawBody}\`.
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.BETTAPAY_WEBHOOK_SECRET)
    .update(\`\${timestamp}.\`)
    .update(req.body)                                                    // Buffer of raw bytes
    .digest('hex');

  // Constant-time compare to avoid leaking timing information.
  const ok =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  // Optionally reject stale deliveries (for example, older than 5 minutes).
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!ok || !Number.isFinite(ageSeconds) || ageSeconds > 300) {
    return res.status(400).send('invalid signature');
  }

  const event = JSON.parse(req.body.toString('utf8'));
  // ... handle event.type, dedupe on event.id ...
  res.sendStatus(200);
});`;

/** "Webhook Events" — event catalog, payload, signing and retries. */
export function WebhookEvents() {
  return (
    <SectionShell
      id="webhook-events"
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
          Every delivery carries a <Code>X-BettaPay-Timestamp</Code> header (unix seconds) and an{' '}
          <Code>X-BettaPay-Signature</Code> header of the form <Code>sha256=&lt;hex&gt;</Code>.
          The signature is an HMAC-SHA256 keyed with your webhook secret over the canonical string{' '}
          <Code>{'`${timestamp}.${rawBody}`'}</Code>:
        </P>
        <Snippet
          code={'canonical = `${X-BettaPay-Timestamp}.${raw request body bytes}`'}
          lang="bash"
          filename="Canonical signed string"
        />
        <P>
          Read the raw bytes before parsing, recompute the HMAC and compare it in constant time
          (for example with <Code>crypto.timingSafeEqual</Code> or a length-safe byte loop). Never use{' '}
          <Code>===</Code> on secrets, and never parse the JSON before the check passes.
        </P>
        <Snippet code={verifySignature} lang="javascript" filename="webhook-handler.js" />
        <Callout variant="warning" title="Verify against the raw body">
          Compute the HMAC over the exact received bytes — parsing and re-serializing the JSON first
          will change the bytes and break verification. Prefer including the timestamp in the signed
          string and rejecting stale timestamps so a captured delivery cannot be replayed later.
        </Callout>
        <P>
          You can paste a payload, timestamp and signature into the{' '}
          <a href="/developers" className="text-primary underline-offset-4 hover:underline">
            client-side signature verifier
          </a>{' '}
          on the Developers page to see a valid and a tampered signature side by side.
        </P>
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
