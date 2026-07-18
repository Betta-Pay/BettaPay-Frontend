import type { Metadata } from 'next';
import GuideLayout from '@/components/guides/GuideLayout';

export const metadata: Metadata = {
  title: 'Server-to-Server API Integration | BettaPay Guides',
  description: 'Create BettaPay payment links from a backend service and reconcile payment state safely.',
};

const toc = [
  { id: 'prerequisites', title: 'Prerequisites' },
  { id: 'environment', title: 'Environment setup' },
  { id: 'client', title: 'Create an API client' },
  { id: 'payment-link', title: 'Create a payment link' },
  { id: 'reconcile', title: 'Reconcile state' },
  { id: 'pitfalls', title: 'Common pitfalls' },
  { id: 'next-steps', title: 'Next steps' },
];

export default function ServerToServerGuide() {
  return (
    <GuideLayout
      title="Server-to-Server API Integration"
      subtitle="Create payment links from your backend, store your own order references, and reconcile BettaPay payment state without exposing secrets to the browser."
      difficulty="Intermediate"
      time="18 min"
      updated="July 2026"
      toc={toc}
      previous={{ title: 'Accepting Your First Payment', href: '/guides/first-payment' }}
      next={{ title: 'Webhook Handling', href: '/guides/webhook-handling' }}
    >
      <h2 id="prerequisites">Prerequisites</h2>
      <ul>
        <li>A backend service that can make HTTPS requests.</li>
        <li>A BettaPay merchant account with API access enabled.</li>
        <li>A database table for local orders or invoices.</li>
        <li>Environment variables for the BettaPay API base URL and server-side API key.</li>
      </ul>

      <h2 id="environment">Environment setup</h2>
      <p>Keep credentials in server-only environment variables. Do not prefix secret values with <code>NEXT_PUBLIC_</code>.</p>
      <pre><code>{`BETTAPAY_API_URL=https://api.bettapay.com
BETTAPAY_API_KEY=bp_live_or_test_key
BETTAPAY_WEBHOOK_SECRET=whsec_...`}</code></pre>

      <h2 id="client">Create an API client</h2>
      <p>The client centralizes authorization, JSON parsing, and error handling.</p>
      <pre><code>{`type PaymentLinkRequest = {
  amount: string;
  currency: 'USDC' | 'XLM';
  reference: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
};

export async function createBettaPayLink(input: PaymentLinkRequest) {
  const response = await fetch(process.env.BETTAPAY_API_URL + '/v1/payment-links', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.BETTAPAY_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.reference,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error('BettaPay link creation failed: ' + response.status + ' ' + error);
  }

  return response.json() as Promise<{ id: string; url: string; status: 'pending' }>;
}`}</code></pre>

      <h2 id="payment-link">Create a payment link</h2>
      <pre><code>{`app.post('/checkout', async (req, res) => {
  const order = await db.orders.create({
    data: { status: 'payment_pending', amount: req.body.amount },
  });

  const link = await createBettaPayLink({
    amount: order.amount.toFixed(2),
    currency: 'USDC',
    reference: order.id,
    description: 'Order ' + order.id,
    successUrl: 'https://example.com/orders/' + order.id + '/success',
    cancelUrl: 'https://example.com/orders/' + order.id + '/cancel',
  });

  await db.orders.update({
    where: { id: order.id },
    data: { bettaPayLinkId: link.id, checkoutUrl: link.url },
  });

  res.json({ checkoutUrl: link.url });
});`}</code></pre>

      <h2 id="reconcile">Reconcile state</h2>
      <p>Use both webhooks and periodic reads. Webhooks give low latency; reconciliation catches missed deliveries.</p>
      <ol>
        <li>Store every BettaPay ID next to your local order ID.</li>
        <li>Treat terminal states like <code>paid</code>, <code>expired</code>, and <code>cancelled</code> as immutable.</li>
        <li>Run a scheduled job that checks pending payments older than five minutes.</li>
      </ol>

      <h2 id="pitfalls">Common pitfalls</h2>
      <ul>
        <li><strong>Duplicate clicks:</strong> use an idempotency key based on your order ID.</li>
        <li><strong>Client-side keys:</strong> never call merchant endpoints directly from browser code.</li>
        <li><strong>Amount drift:</strong> persist the amount before creating the checkout link.</li>
      </ul>

      <h2 id="next-steps">Next steps</h2>
      <p>Pair this flow with webhook handling so fulfillment can run automatically after BettaPay confirms settlement.</p>
    </GuideLayout>
  );
}
