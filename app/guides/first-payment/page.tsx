import type { Metadata } from "next";
import Link from "next/link";
import GuideLayout from "@/components/guides/GuideLayout";
import {
  Callout,
  CodeBlock,
  DataTable,
  H2,
  H3,
  Prose,
  Step,
} from "@/components/guides/prose";
import { getGuide } from "@/lib/guides";

const SLUG = "first-payment";
const guide = getGuide(SLUG)!;

export const metadata: Metadata = {
  title: `${guide.title} | BettaPay Guides`,
  description: guide.description,
};

export default function FirstPaymentGuide() {
  return (
    <GuideLayout slug={SLUG}>
      <Prose>
        <p>
          This guide takes you from an empty dashboard to a real, on-chain
          payment — without writing a line of backend code. You&apos;ll create a
          merchant account, publish a payment link, and collect{" "}
          <strong>test USDC</strong> using the Freighter wallet on the Stellar
          testnet. By the end you&apos;ll see the payment settle in your
          dashboard and understand the webhook BettaPay fires when it does.
        </p>
        <p>
          Everything here runs on <strong>Stellar testnet</strong>, so no real
          money moves. When you&apos;re ready for production, the exact same
          steps apply — you just switch your merchant account to mainnet.
        </p>
      </Prose>

      <H2>Prerequisites</H2>
      <Prose>
        <p>Before you start, make sure you have:</p>
        <ul>
          <li>
            A <strong>Google account</strong> — BettaPay uses Google OAuth for
            merchant sign-in.
          </li>
          <li>
            The <strong>Freighter wallet</strong> browser extension installed.
            Grab it from{" "}
            <a href="https://www.freighter.app" target="_blank" rel="noopener noreferrer">
              freighter.app
            </a>{" "}
            and switch it to the <em>Test Network</em> (we cover this in the{" "}
            <Link href="/guides/testnet-testing">testnet guide</Link>).
          </li>
          <li>
            A funded testnet account with some <strong>test USDC</strong>. If you
            don&apos;t have this yet, follow{" "}
            <Link href="/guides/testnet-testing">
              Testing with Stellar Testnet
            </Link>{" "}
            first — it takes about two minutes.
          </li>
        </ul>
      </Prose>
      <Callout variant="note" title="No code required">
        This is the no-code path. If you&apos;d rather create payments
        programmatically from your backend, jump to{" "}
        <Link href="/guides/server-to-server">Server-to-Server Integration</Link>.
      </Callout>

      <H2>Step 1 — Create your merchant account</H2>
      <Step n={1} title="Sign in with Google">
        <p>
          Head to{" "}
          <a href="https://app.bettapay.com/auth/register" target="_blank" rel="noopener noreferrer">
            app.bettapay.com
          </a>{" "}
          and choose <strong>Continue with Google</strong>. BettaPay creates your
          merchant account from your Google profile — there&apos;s no separate
          password to manage.
        </p>
        <p>
          On success you&apos;re redirected back with an authenticated session
          cookie. That cookie is what authorizes every dashboard action and API
          call you make from the browser.
        </p>
      </Step>

      <H2>Step 2 — Complete onboarding</H2>
      <Step n={2} title="Tell BettaPay about your business">
        <p>
          The first time you sign in, you&apos;ll land on the onboarding flow.
          You&apos;ll provide:
        </p>
        <ul>
          <li>
            <strong>Business name</strong> — shown to customers on the checkout
            page.
          </li>
          <li>
            <strong>Settlement wallet</strong> — the Stellar address that
            receives funds. Paste your testnet public key (starts with{" "}
            <code>G…</code>). You can connect Freighter to fill this
            automatically.
          </li>
          <li>
            <strong>Default currency</strong> — the currency your prices are
            quoted in (e.g. <code>USD</code>, <code>NGN</code>). BettaPay
            converts to USDC at checkout using a live FX quote.
          </li>
        </ul>
      </Step>
      <Callout variant="tip">
        Use the <em>same</em> Stellar address you funded on testnet as your
        settlement wallet. That way the payment you collect in this guide lands
        somewhere you can inspect.
      </Callout>

      <H2>Step 3 — Create a payment link</H2>
      <Prose>
        <p>
          A payment link is a hosted checkout page you can share by URL, QR code,
          email, or WhatsApp. From the dashboard, open{" "}
          <strong>Payment Links → New link</strong>.
        </p>
      </Prose>

      <H3>Configure the link</H3>
      <Prose>
        <p>Fill in the fields below. Only amount and currency are required.</p>
      </Prose>
      <DataTable
        headers={["Field", "Example", "Notes"]}
        rows={[
          [<code key="a">amount</code>, "25.00", "The price the customer pays."],
          [
            <code key="c">currency</code>,
            "USD",
            "Quote currency. Converted to USDC at checkout.",
          ],
          [
            <code key="d">description</code>,
            "Pro plan — monthly",
            "Shown on the checkout page and the receipt.",
          ],
          [
            <code key="e">expiresAt</code>,
            "2026-08-01T00:00:00Z",
            "Optional. After this the link stops accepting payments.",
          ],
          [
            <code key="r">redirectUrl</code>,
            "https://yoursite.com/thanks",
            "Optional. Where the customer returns after paying.",
          ],
        ]}
      />
      <Prose>
        <p>
          Prefer the API? The same link can be created with a single request.
          The <code>Idempotency-Key</code> header makes the call safe to retry —
          see{" "}
          <Link href="/guides/server-to-server">Server-to-Server Integration</Link>{" "}
          for the full treatment.
        </p>
      </Prose>
      <CodeBlock
        language="bash"
        filename="create-payment-link.sh"
        code={`curl -X POST https://api.bettapay.com/v1/payment-links \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: link-$(date +%s)" \\
  --cookie "bp_session=<your-session-cookie>" \\
  -d '{
    "amount": "25.00",
    "currency": "USD",
    "description": "Pro plan — monthly",
    "expiresAt": "2026-08-01T00:00:00Z",
    "redirectUrl": "https://yoursite.com/thanks"
  }'`}
      />
      <Prose>
        <p>A successful response returns the shareable link and its id:</p>
      </Prose>
      <CodeBlock
        language="json"
        filename="response.json"
        code={`{
  "id": "plink_9c2f7a41",
  "url": "https://pay.bettapay.com/l/9c2f7a41",
  "amount": "25.00",
  "currency": "USD",
  "status": "active",
  "network": "testnet",
  "createdAt": "2026-07-19T10:04:22Z"
}`}
      />

      <H2>Step 4 — Pay with Freighter on testnet</H2>
      <Step n={4} title="Complete the checkout">
        <p>Open the payment link&apos;s <code>url</code> in a new tab. On the checkout page:</p>
        <ol>
          <li>Click <strong>Pay with wallet</strong> and approve the Freighter connection prompt.</li>
          <li>
            BettaPay fetches a live FX quote and shows the exact USDC amount
            (e.g. <code>25.00 USD ≈ 25.00 USDC</code> on testnet).
          </li>
          <li>
            Freighter opens with the pre-filled transaction. Confirm that the
            network says <strong>Test Network</strong>, then click{" "}
            <strong>Sign</strong>.
          </li>
        </ol>
        <p>
          The transaction is submitted to Stellar and usually confirms in
          3–5 seconds. The checkout page updates to <strong>Paid</strong> and, if
          you set a <code>redirectUrl</code>, sends the customer there.
        </p>
      </Step>
      <Callout variant="warning" title="Wrong network is the #1 mistake">
        If Freighter is pointed at the public network, the payment will fail or
        try to move real funds. Always confirm it reads <em>Test Network</em>{" "}
        before signing.
      </Callout>

      <H2>Step 5 — Verify the payment in your dashboard</H2>
      <Prose>
        <p>
          Back in the dashboard, open <strong>Payments</strong>. Your payment
          appears at the top with status <strong>Succeeded</strong>. Click it to
          see:
        </p>
        <ul>
          <li>The Stellar <strong>transaction hash</strong> (a link to the explorer).</li>
          <li>The USDC amount received and the FX rate applied.</li>
          <li>The customer&apos;s paying wallet address.</li>
        </ul>
        <p>
          You can open the transaction hash in{" "}
          <a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noopener noreferrer">
            stellar.expert (testnet)
          </a>{" "}
          to see the on-chain record independently of BettaPay.
        </p>
      </Prose>

      <H2>Step 6 — Check the webhook payload</H2>
      <Prose>
        <p>
          When a payment succeeds, BettaPay sends a{" "}
          <code>payment.succeeded</code> webhook to the endpoint configured under{" "}
          <strong>Settings → Webhooks</strong>. Here&apos;s a complete example
          payload:
        </p>
      </Prose>
      <CodeBlock
        language="json"
        filename="payment.succeeded.json"
        code={`{
  "id": "evt_5f1b9d3e",
  "type": "payment.succeeded",
  "createdAt": "2026-07-19T10:07:41Z",
  "data": {
    "paymentId": "pay_7a3c0e19",
    "paymentLinkId": "plink_9c2f7a41",
    "status": "succeeded",
    "amount": "25.00",
    "currency": "USD",
    "settledAmount": "25.00",
    "settledAsset": "USDC",
    "network": "testnet",
    "customerAddress": "GBXW...JKLM",
    "txHash": "3d9f...a17c",
    "fxRate": "1.000000"
  }
}`}
      />
      <Prose>
        <p>
          Don&apos;t have an endpoint yet? Paste a temporary URL from{" "}
          <a href="https://webhook.site" target="_blank" rel="noopener noreferrer">
            webhook.site
          </a>{" "}
          into your webhook settings to watch events arrive live. When
          you&apos;re ready to handle them for real — with signature
          verification and retries — read{" "}
          <Link href="/guides/webhook-handling">Webhook Handling &amp; Retry Logic</Link>.
        </p>
      </Prose>

      <H2>Troubleshooting</H2>
      <H3>The checkout says &quot;insufficient balance&quot;</H3>
      <Prose>
        <p>
          Your testnet wallet has XLM but no USDC, or not enough USDC to cover
          the amount. Fund it with test USDC (see the{" "}
          <Link href="/guides/testnet-testing">testnet guide</Link>) and make
          sure you&apos;ve added a <strong>trustline</strong> for the USDC asset
          — Freighter prompts you to add one automatically at checkout.
        </p>
      </Prose>
      <H3>Freighter never opens</H3>
      <Prose>
        <p>
          The extension may be locked or blocked by a pop-up blocker. Unlock
          Freighter, reload the checkout page, and allow pop-ups for{" "}
          <code>pay.bettapay.com</code>.
        </p>
      </Prose>
      <H3>Payment succeeded on-chain but the dashboard shows &quot;pending&quot;</H3>
      <Prose>
        <p>
          BettaPay confirms payments by watching the network; there can be a
          brief lag. If it hasn&apos;t updated after a minute, the transaction
          may have used the wrong memo or asset. Open the transaction hash in the
          explorer to confirm the asset was USDC and the destination matched your
          settlement wallet.
        </p>
      </Prose>
      <Callout variant="note" title="Feature status">
        Payment links, Google OAuth sign-in, and payment webhooks are{" "}
        <strong>available now</strong>. Automated fiat settlement to a bank
        account is covered separately in{" "}
        <Link href="/guides/fiat-settlement">Fiat Settlement Configuration</Link>{" "}
        — some anchors there are still in development.
      </Callout>

      <H2>Next steps</H2>
      <Prose>
        <ul>
          <li>
            Automate link creation and reconciliation from your backend →{" "}
            <Link href="/guides/server-to-server">Server-to-Server Integration</Link>.
          </li>
          <li>
            Handle events reliably in production →{" "}
            <Link href="/guides/webhook-handling">Webhook Handling &amp; Retry Logic</Link>.
          </li>
          <li>
            Turn on-chain USDC into local fiat →{" "}
            <Link href="/guides/fiat-settlement">Fiat Settlement Configuration</Link>.
          </li>
          <li>
            Browse every endpoint in the{" "}
            <Link href="/docs">API reference</Link>.
          </li>
        </ul>
      </Prose>
    </GuideLayout>
  );
}
