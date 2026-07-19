import type { Metadata } from "next";
import Link from "next/link";
import GuideLayout from "@/components/guides/GuideLayout";
import {
  Callout,
  CodeBlock,
  H2,
  H3,
  Prose,
} from "@/components/guides/prose";
import { getGuide } from "@/lib/guides";

const SLUG = "server-to-server";
const guide = getGuide(SLUG)!;

export const metadata: Metadata = {
  title: `${guide.title} | BettaPay Guides`,
  description: guide.description,
};

export default function ServerToServerGuide() {
  return (
    <GuideLayout slug={SLUG}>
      <Prose>
        <p>
          This guide shows you how to drive BettaPay from your own backend:
          authenticate, create payments with <strong>idempotency keys</strong>,
          apply live <strong>FX conversion</strong>, and reconcile the result
          via polling or webhooks — all with production-grade error handling. We
          finish with a complete, runnable{" "}
          <strong>Express.js server</strong> you can copy into a project.
        </p>
        <p>
          The examples are Node.js (TypeScript-friendly plain JS), but the
          request shapes map directly to any language. For endpoint-level detail,
          keep the <Link href="/docs">API reference</Link> open alongside this
          guide.
        </p>
      </Prose>

      <Callout variant="note" title="What you'll need">
        A merchant account (see{" "}
        <Link href="/guides/first-payment">Accepting Your First Payment</Link>),
        an authenticated session, and Node.js 18+ (for the built-in{" "}
        <code>fetch</code> and <code>crypto</code> APIs).
      </Callout>

      <H2>Authentication</H2>
      <Prose>
        <p>
          Server calls authenticate with the merchant{" "}
          <strong>session cookie</strong> issued after Google OAuth sign-in
          (<code>bp_session</code>). Store it as a secret on your server and send
          it with every request. Never expose it to the browser or commit it to
          source control.
        </p>
      </Prose>
      <CodeBlock
        language="bash"
        filename=".env"
        code={`BETTAPAY_API_BASE=https://api.bettapay.com
BETTAPAY_SESSION=bp_session_value_from_dashboard
BETTAPAY_WEBHOOK_SECRET=whsec_your_signing_secret`}
      />
      <Callout variant="warning" title="Sessions expire">
        The session cookie is not a permanent API key. If requests start
        returning <code>401 Unauthorized</code>, refresh it from the dashboard.
        Long-lived machine credentials (API keys) are on the roadmap — see the
        feature-status note at the end.
      </Callout>

      <H2>A resilient API client</H2>
      <Prose>
        <p>
          Every network call can fail transiently. This small client wraps{" "}
          <code>fetch</code> with timeouts, <strong>exponential backoff</strong>{" "}
          (with jitter), and correct retry semantics: it retries{" "}
          <code>429</code> and <code>5xx</code> responses and network errors, but
          never retries <code>4xx</code> client errors (except <code>429</code>).
        </p>
      </Prose>
      <CodeBlock
        language="js"
        filename="bettapay-client.js"
        code={`// bettapay-client.js — a dependency-free client with retries + backoff.
const API_BASE = process.env.BETTAPAY_API_BASE || "https://api.bettapay.com";
const SESSION = process.env.BETTAPAY_SESSION;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Perform a BettaPay API request with retries and exponential backoff.
 * @param {string} path   e.g. "/v1/payments"
 * @param {object} [opts] { method, body, idempotencyKey, timeoutMs }
 */
async function apiRequest(path, opts = {}) {
  const {
    method = "GET",
    body,
    idempotencyKey,
    timeoutMs = 10_000,
  } = opts;

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(API_BASE + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Cookie: \`bp_session=\${SESSION}\`,
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (res.ok) return await res.json();

      // Non-retryable client error — surface it immediately.
      if (!RETRYABLE_STATUS.has(res.status)) {
        const detail = await res.text();
        throw new Error(\`BettaPay \${res.status}: \${detail}\`);
      }

      // Retryable: honor Retry-After if present, else back off.
      lastError = new Error(\`BettaPay \${res.status} (attempt \${attempt + 1})\`);
      const retryAfter = Number(res.headers.get("Retry-After")) || 0;
      const backoff = retryAfter
        ? retryAfter * 1000
        : Math.min(2 ** attempt * 250, 8000) + Math.random() * 250;
      if (attempt < MAX_RETRIES) await sleep(backoff);
    } catch (err) {
      // Network error or timeout — retry with backoff.
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(Math.min(2 ** attempt * 250, 8000) + Math.random() * 250);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error("BettaPay request failed");
}

module.exports = { apiRequest };`}
      />

      <H2>Handling FX conversion</H2>
      <Prose>
        <p>
          If you price in a local currency, fetch a quote first so you know the
          exact USDC amount before creating the payment. The FX quote endpoint is
          a thin proxy over live rates and returns a short-lived quote id you can
          attach to the payment to lock the rate.
        </p>
      </Prose>
      <CodeBlock
        language="js"
        filename="get-quote.js"
        code={`const { apiRequest } = require("./bettapay-client");

/** Get a locked FX quote converting a fiat amount to USDC. */
async function getQuote(amount, currency) {
  const params = new URLSearchParams({
    from: currency,
    to: "USDC",
    amount: String(amount),
  });
  const quote = await apiRequest(\`/v1/fx/quote?\${params}\`);
  // { quoteId, rate, from, to, amount, convertedAmount, expiresAt }
  return quote;
}

module.exports = { getQuote };`}
      />
      <Callout variant="tip">
        Quotes expire (typically within 60 seconds). Fetch the quote{" "}
        <em>immediately</em> before creating the payment, and be ready to
        re-quote if the customer hesitates.
      </Callout>

      <H2>Creating a payment with idempotency</H2>
      <Prose>
        <p>
          Payment creation is a <strong>mutation</strong>, so always send an{" "}
          <code>Idempotency-Key</code>. If a response is lost to a timeout and
          your client retries, BettaPay returns the <em>original</em> payment
          instead of creating a duplicate. Use a key that is stable for the
          logical operation — for example your own order id.
        </p>
      </Prose>
      <CodeBlock
        language="js"
        filename="create-payment.js"
        code={`const { apiRequest } = require("./bettapay-client");
const { getQuote } = require("./get-quote");

/**
 * Create a payment for an order. Idempotent on \`orderId\`, so retrying this
 * function will never double-charge.
 */
async function createPayment({ orderId, amount, currency, customerEmail }) {
  const quote = await getQuote(amount, currency);

  const payment = await apiRequest("/v1/payments", {
    method: "POST",
    idempotencyKey: \`order-\${orderId}\`,
    body: {
      amount: String(amount),
      currency,
      quoteId: quote.quoteId,           // lock the FX rate
      reference: orderId,               // your id, echoed back in webhooks
      customer: { email: customerEmail },
      metadata: { source: "checkout-v2" },
    },
  });

  // { id, status: "pending", checkoutUrl, amount, currency, ... }
  return payment;
}

module.exports = { createPayment };`}
      />
      <Callout variant="danger" title="Reuse the key on retry">
        A new random key on every attempt defeats the purpose. The whole point is
        that a retried create uses the <em>same</em> key so the server can
        deduplicate. Derive it from something stable (order id), not{" "}
        <code>Date.now()</code>.
      </Callout>

      <H2>Reconciling the result</H2>
      <Prose>
        <p>
          After creating a payment its status is <code>pending</code>. You learn
          the outcome one of two ways. <strong>Webhooks are preferred</strong> —
          they&apos;re push-based and instant. Polling is a fallback for
          environments where you can&apos;t receive inbound requests.
        </p>
      </Prose>

      <H3>Option A — Poll status (fallback)</H3>
      <CodeBlock
        language="js"
        filename="poll-status.js"
        code={`const { apiRequest } = require("./bettapay-client");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TERMINAL = new Set(["succeeded", "failed", "expired", "refunded"]);

/**
 * Poll a payment until it reaches a terminal state, backing off between checks.
 * Returns the final payment object, or throws on timeout.
 */
async function waitForPayment(paymentId, { timeoutMs = 120_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let delay = 2000;

  while (Date.now() < deadline) {
    const payment = await apiRequest(\`/v1/payments/\${paymentId}\`);
    if (TERMINAL.has(payment.status)) return payment;
    await sleep(delay);
    delay = Math.min(delay * 1.5, 15_000); // gentle backoff
  }
  throw new Error(\`Timed out waiting for payment \${paymentId}\`);
}

module.exports = { waitForPayment };`}
      />
      <Callout variant="warning">
        Polling costs requests and adds latency. Never poll in a tight loop —
        always back off, and prefer webhooks for anything user-facing.
      </Callout>

      <H3>Option B — Webhooks (recommended)</H3>
      <Prose>
        <p>
          The Express server below exposes a <code>/api/webhook</code> endpoint
          that verifies the signature and reacts to events. This is the
          production path. For the full retry schedule, deduplication, and
          dead-letter handling, read{" "}
          <Link href="/guides/webhook-handling">Webhook Handling &amp; Retry Logic</Link>.
        </p>
      </Prose>

      <H2>Security best practices</H2>
      <Prose>
        <ul>
          <li>
            <strong>Keep secrets server-side.</strong> The session cookie and
            webhook secret never belong in frontend code or a repo — load them
            from environment variables.
          </li>
          <li>
            <strong>Always verify webhook signatures</strong> before trusting a
            payload. An unverified endpoint will happily accept forged
            &quot;payment succeeded&quot; events.
          </li>
          <li>
            <strong>Treat amounts as strings</strong> and compare against your
            own records. Never fulfill an order based on a client-reported
            amount — use the server-confirmed <code>settledAmount</code>.
          </li>
          <li>
            <strong>Enforce HTTPS</strong> on your webhook URL and reject
            requests that fail signature verification with <code>400</code>.
          </li>
          <li>
            <strong>Make handlers idempotent.</strong> The same event may arrive
            more than once; dedupe on the event <code>id</code>.
          </li>
        </ul>
      </Prose>

      <H2>Complete Express.js server</H2>
      <Prose>
        <p>
          Putting it together: a minimal server that creates a payment and
          receives its webhook. Note the webhook route uses the{" "}
          <strong>raw request body</strong> for signature verification — parsing
          it to JSON first would change the bytes and break the HMAC.
        </p>
      </Prose>
      <CodeBlock
        language="js"
        filename="server.js"
        code={`// server.js — run with: node server.js
const express = require("express");
const crypto = require("crypto");
const { createPayment } = require("./create-payment");

const app = express();
const WEBHOOK_SECRET = process.env.BETTAPAY_WEBHOOK_SECRET;

// In-memory dedupe store. Use Redis or a DB column in production.
const processedEvents = new Set();

/**
 * Timing-safe HMAC-SHA256 verification.
 * @param {Buffer} rawBody  the exact bytes received
 * @param {string} signature value of the X-BettaPay-Signature header
 */
function verifySignature(rawBody, signature) {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// --- Create a payment (JSON body) ---
app.post("/api/checkout", express.json(), async (req, res) => {
  try {
    const { orderId, amount, currency, email } = req.body;
    const payment = await createPayment({
      orderId,
      amount,
      currency,
      customerEmail: email,
    });
    res.json({ checkoutUrl: payment.checkoutUrl, paymentId: payment.id });
  } catch (err) {
    console.error("checkout failed:", err.message);
    res.status(502).json({ error: "Could not create payment" });
  }
});

// --- Receive webhooks (RAW body — must come before any json parser) ---
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.header("X-BettaPay-Signature");
    if (!verifySignature(req.body, signature)) {
      return res.status(400).send("invalid signature");
    }

    const event = JSON.parse(req.body.toString("utf8"));

    // Idempotent: ignore events we've already handled.
    if (processedEvents.has(event.id)) return res.status(200).send("dup");
    processedEvents.add(event.id);

    switch (event.type) {
      case "payment.succeeded":
        // Fulfill the order using the SERVER-confirmed amount.
        console.log(
          \`Order \${event.data.reference} paid: \${event.data.settledAmount} USDC\`
        );
        break;
      case "payment.failed":
        console.warn(\`Payment failed for order \${event.data.reference}\`);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }

    // Acknowledge fast so BettaPay doesn't retry. Do slow work async.
    res.status(200).send("ok");
  }
);

app.listen(3000, () => console.log("Listening on http://localhost:3000"));`}
      />
      <Callout variant="tip" title="Acknowledge fast, work later">
        Return <code>200</code> as soon as you&apos;ve verified and recorded the
        event. If you do heavy work (emails, provisioning) inline and it&apos;s
        slow, BettaPay may time out and retry — enqueue that work instead.
      </Callout>

      <H2>Feature status</H2>
      <Prose>
        <p>
          Payment creation with idempotency keys, the FX quote proxy, status
          polling, and webhooks are <strong>available now</strong>. Session-cookie
          auth is the current mechanism; dedicated{" "}
          <strong>API keys are in development</strong>. Batch settlement is
          covered in{" "}
          <Link href="/guides/fiat-settlement">Fiat Settlement Configuration</Link>.
        </p>
      </Prose>

      <H2>Next steps</H2>
      <Prose>
        <ul>
          <li>
            Harden your webhook endpoint →{" "}
            <Link href="/guides/webhook-handling">Webhook Handling &amp; Retry Logic</Link>.
          </li>
          <li>
            Settle collected USDC to fiat →{" "}
            <Link href="/guides/fiat-settlement">Fiat Settlement Configuration</Link>.
          </li>
          <li>
            Full request/response schemas → <Link href="/docs">API reference</Link>.
          </li>
        </ul>
      </Prose>
    </GuideLayout>
  );
}
