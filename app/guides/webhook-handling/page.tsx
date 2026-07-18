import type { Metadata } from 'next';
import GuideLayout from '@/components/guides/GuideLayout';

export const metadata: Metadata = {
  title: 'Webhook Handling | BettaPay Guides',
  description: 'Build a secure and idempotent BettaPay webhook receiver with signature checks and replay protection.',
};

const toc = [
  { id: 'prerequisites', title: 'Prerequisites' },
  { id: 'receiver', title: 'Create the receiver' },
  { id: 'verify', title: 'Verify signatures' },
  { id: 'idempotency', title: 'Handle idempotency' },
  { id: 'local-testing', title: 'Test locally' },
  { id: 'pitfalls', title: 'Common pitfalls' },
  { id: 'next-steps', title: 'Next steps' },
];

export default function WebhookHandlingGuide() {
  return (
    <GuideLayout
      title="Webhook Handling"
      subtitle="Receive BettaPay events safely, verify they are authentic, and process payment lifecycle changes exactly once."
      difficulty="Intermediate"
      time="16 min"
      updated="July 2026"
      toc={toc}
      previous={{ title: 'Server-to-Server API Integration', href: '/guides/server-to-server' }}
      next={{ title: 'Fiat Settlement Configuration', href: '/guides/fiat-settlement' }}
    >
      <h2 id="prerequisites">Prerequisites</h2>
      <ul>
        <li>A public HTTPS endpoint that BettaPay can call.</li>
        <li>The webhook signing secret from the BettaPay dashboard.</li>
        <li>A table that stores processed event IDs.</li>
      </ul>

      <h2 id="receiver">Create the receiver</h2>
      <p>Webhook handlers should acknowledge quickly and defer slow fulfillment to a queue when possible.</p>
      <pre><code>{`app.post('/webhooks/bettapay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.header('bettapay-signature') || '';
  const rawBody = req.body.toString('utf8');

  if (!verifyBettaPaySignature(rawBody, signature)) {
    return res.status(401).json({ error: 'invalid_signature' });
  }

  const event = JSON.parse(rawBody) as BettaPayEvent;
  await enqueueBettaPayEvent(event);
  return res.status(202).json({ received: true });
});`}</code></pre>

      <h2 id="verify">Verify signatures</h2>
      <p>Use an HMAC comparison and keep the raw request body unchanged until after verification.</p>
      <pre><code>{`import crypto from 'node:crypto';

function verifyBettaPaySignature(rawBody: string, signature: string) {
  const expected = crypto
    .createHmac('sha256', process.env.BETTAPAY_WEBHOOK_SECRET || '')
    .update(rawBody, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}`}</code></pre>

      <h2 id="idempotency">Handle idempotency</h2>
      <ol>
        <li>Insert the event ID into a <code>processed_webhook_events</code> table with a unique index.</li>
        <li>If the insert fails because the ID exists, return success without reprocessing.</li>
        <li>Map BettaPay states to local order states in one transaction.</li>
      </ol>

      <h2 id="local-testing">Test locally</h2>
      <pre><code>{`# Expose localhost to BettaPay during development
ngrok http 3000

# Example local smoke test with a fixture payload
curl -X POST http://localhost:3000/webhooks/bettapay \
  -H 'Content-Type: application/json' \
  -H 'bettapay-signature: <computed-hmac>' \
  --data @fixtures/payment-paid.json`}</code></pre>

      <h2 id="pitfalls">Common pitfalls</h2>
      <ul>
        <li><strong>Parsing too early:</strong> JSON middleware can change the bytes used for the signature.</li>
        <li><strong>Retry storms:</strong> return 2xx after enqueueing; retry failed jobs internally.</li>
        <li><strong>Out-of-order events:</strong> compare timestamps and do not move terminal orders backward.</li>
      </ul>

      <h2 id="next-steps">Next steps</h2>
      <p>Add observability: log event IDs, order IDs, state transitions, and processing latency so support can debug fulfillment issues.</p>
    </GuideLayout>
  );
}
