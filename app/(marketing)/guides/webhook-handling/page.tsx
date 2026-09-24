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
} from "@/components/guides/prose";
import { getGuide } from "@/lib/guides";

const SLUG = "webhook-handling";
const guide = getGuide(SLUG)!;

export const metadata: Metadata = {
  title: `${guide.title} | BettaPay Guides`,
  description: guide.description,
};

export default function WebhookHandlingGuide() {
  return (
    <GuideLayout slug={SLUG}>
      <Prose>
        <p>
          Webhooks are how BettaPay tells your system that something
          happened — a payment succeeded, a settlement completed, a refund was
          issued. Getting them right means three things: proving the request
          really came from BettaPay (<strong>signature verification</strong>),
          never acting on the same event twice (<strong>deduplication</strong>),
          and gracefully surviving failures (<strong>retries and a
          dead-letter queue</strong>). This guide covers all three, in Node.js,
          Python, and PHP.
        </p>
      </Prose>

      <Callout variant="note" title="Prerequisite">
        You should already be creating payments — see{" "}
        <Link href="/guides/server-to-server">Server-to-Server Integration</Link>.
        This guide focuses entirely on the receiving side.
      </Callout>

      <H2>Set up your webhook endpoint</H2>
      <Prose>
        <p>
          In the dashboard under <strong>Settings → Webhooks</strong>, add the
          public URL BettaPay should POST to (for example{" "}
          <code>https://api.yoursite.com/webhooks/bettapay</code>) and select the
          events you care about. BettaPay generates a{" "}
          <strong>signing secret</strong> (prefixed <code>whsec_</code>) — copy
          it into your server&apos;s environment. Every request BettaPay sends
          carries these headers:
        </p>
      </Prose>
      <DataTable
        headers={["Header", "Meaning"]}
        rows={[
          [
            <code key="s">X-BettaPay-Signature</code>,
            "Hex HMAC-SHA256 of the raw request body, keyed by your signing secret.",
          ],
          [
            <code key="t">X-BettaPay-Timestamp</code>,
            "Unix seconds when the event was sent. Reject if it's too old.",
          ],
          [
            <code key="i">X-BettaPay-Event-Id</code>,
            "Stable id for this event — the key you dedupe on.",
          ],
          [
            <code key="d">X-BettaPay-Delivery</code>,
            "Unique per delivery attempt; changes on each retry.",
          ],
        ]}
      />

      <H2>Develop locally with ngrok</H2>
      <Prose>
        <p>
          BettaPay needs a public URL, but your dev server runs on{" "}
          <code>localhost</code>. <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer">ngrok</a>{" "}
          tunnels a public URL to your machine:
        </p>
      </Prose>
      <CodeBlock
        language="bash"
        filename="terminal"
        code={`# 1. Start your local server (example: port 3000)
node server.js

# 2. In another terminal, expose it
ngrok http 3000

# ngrok prints a public URL, e.g.:
#   Forwarding  https://a1b2-41-58-0-1.ngrok-free.app -> http://localhost:3000

# 3. Paste that URL + your path into Settings -> Webhooks:
#   https://a1b2-41-58-0-1.ngrok-free.app/webhooks/bettapay`}
      />
      <Callout variant="tip">
        The free ngrok URL changes each restart. Update the webhook URL in the
        dashboard when it does, or use a reserved domain to keep it stable.
      </Callout>

      <H2>Verify the signature</H2>
      <Prose>
        <p>
          Compute the HMAC-SHA256 of the <strong>raw request body</strong> using
          your signing secret, and compare it to the{" "}
          <code>X-BettaPay-Signature</code> header with a{" "}
          <strong>constant-time</strong> comparison. Reject anything that
          doesn&apos;t match, and reject stale timestamps to prevent replay
          attacks.
        </p>
      </Prose>
      <Callout variant="danger" title="Use the raw body">
        You must HMAC the exact bytes BettaPay sent. If your framework parses the
        body to JSON and re-serializes it, the bytes change and verification will
        always fail. Capture the raw body <em>before</em> any JSON middleware.
      </Callout>

      <H3>Node.js (Express)</H3>
      <CodeBlock
        language="js"
        filename="webhook-node.js"
        code={`const express = require("express");
const crypto = require("crypto");

const app = express();
const SECRET = process.env.BETTAPAY_WEBHOOK_SECRET;
const MAX_SKEW_SECONDS = 300; // reject events older than 5 minutes

function isVerified(rawBody, signature, timestamp) {
  if (!signature || !timestamp) return false;

  // Replay protection.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > MAX_SKEW_SECONDS) return false;

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post(
  "/webhooks/bettapay",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const ok = isVerified(
      req.body, // Buffer of raw bytes
      req.header("X-BettaPay-Signature"),
      req.header("X-BettaPay-Timestamp")
    );
    if (!ok) return res.status(400).send("invalid signature");

    const event = JSON.parse(req.body.toString("utf8"));
    handleEvent(event); // dedupe + process (see below)
    res.status(200).send("ok");
  }
);

app.listen(3000);`}
      />

      <H3>Python (Flask)</H3>
      <CodeBlock
        language="python"
        filename="webhook.py"
        code={`import hashlib
import hmac
import os
import time

from flask import Flask, request, abort

app = Flask(__name__)
SECRET = os.environ["BETTAPAY_WEBHOOK_SECRET"].encode()
MAX_SKEW_SECONDS = 300


def is_verified(raw_body: bytes, signature: str, timestamp: str) -> bool:
    if not signature or not timestamp:
        return False
    if abs(time.time() - float(timestamp)) > MAX_SKEW_SECONDS:
        return False
    expected = hmac.new(SECRET, raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)  # constant-time


@app.post("/webhooks/bettapay")
def webhook():
    raw = request.get_data()  # raw bytes, before JSON parsing
    if not is_verified(
        raw,
        request.headers.get("X-BettaPay-Signature", ""),
        request.headers.get("X-BettaPay-Timestamp", ""),
    ):
        abort(400, "invalid signature")

    event = request.get_json()
    handle_event(event)  # dedupe + process
    return "ok", 200`}
      />

      <H3>PHP</H3>
      <CodeBlock
        language="php"
        filename="webhook.php"
        code={`<?php
$secret = getenv('BETTAPAY_WEBHOOK_SECRET');
$maxSkew = 300;

$raw = file_get_contents('php://input'); // raw body
$signature = $_SERVER['HTTP_X_BETTAPAY_SIGNATURE'] ?? '';
$timestamp = $_SERVER['HTTP_X_BETTAPAY_TIMESTAMP'] ?? '';

function isVerified($raw, $signature, $timestamp, $secret, $maxSkew) {
    if ($signature === '' || $timestamp === '') return false;
    if (abs(time() - (int)$timestamp) > $maxSkew) return false;
    $expected = hash_hmac('sha256', $raw, $secret);
    return hash_equals($expected, $signature); // constant-time
}

if (!isVerified($raw, $signature, $timestamp, $secret, $maxSkew)) {
    http_response_code(400);
    echo 'invalid signature';
    exit;
}

$event = json_decode($raw, true);
handleEvent($event); // dedupe + process
http_response_code(200);
echo 'ok';`}
      />

      <H2>Deduplicate with idempotency</H2>
      <Prose>
        <p>
          The same event can arrive more than once — because of retries, or
          because your <code>200</code> response was lost in transit. Record
          every processed event id and skip duplicates. Use a durable store
          (a unique DB column or Redis), not an in-memory set, so restarts
          don&apos;t reprocess events.
        </p>
      </Prose>
      <CodeBlock
        language="js"
        filename="handle-event.js"
        code={`// Durable dedupe using a unique constraint on event_id.
async function handleEvent(event) {
  try {
    // INSERT fails if the event id already exists — that's our dedupe lock.
    await db.query(
      "INSERT INTO webhook_events (event_id, type, received_at) VALUES ($1, $2, now())",
      [event.id, event.type]
    );
  } catch (err) {
    if (err.code === "23505") return; // unique_violation -> already processed
    throw err;
  }

  switch (event.type) {
    case "payment.succeeded":
      await fulfillOrder(event.data.reference, event.data.settledAmount);
      break;
    case "settlement.completed":
      await markSettled(event.data.settlementId);
      break;
    default:
      // Unknown types are fine — we still recorded and acknowledged them.
      break;
  }
}`}
      />

      <H2>The retry schedule</H2>
      <Prose>
        <p>
          If your endpoint doesn&apos;t return a <code>2xx</code> within the
          timeout, BettaPay retries with a fixed back-off. There are up to{" "}
          <strong>7 delivery attempts</strong> (the initial send plus 6 retries):
        </p>
      </Prose>
      <DataTable
        headers={["Attempt", "When", "Cumulative delay"]}
        rows={[
          ["1", "Immediate", "0"],
          ["2", "+5 minutes", "5 min"],
          ["3", "+30 minutes", "35 min"],
          ["4", "+2 hours", "~2.5 h"],
          ["5", "+8 hours", "~10.5 h"],
          ["6", "+24 hours", "~34.5 h"],
          ["7", "+24 hours", "~58.5 h (final)"],
        ]}
      />
      <Callout variant="warning" title="Return 2xx quickly">
        Any non-2xx (or a timeout) counts as a failed delivery and triggers a
        retry. A slow handler that eventually returns 200 can still time out —
        acknowledge first, then process asynchronously.
      </Callout>

      <H2>Dead-letter queue pattern</H2>
      <Prose>
        <p>
          After the final retry, BettaPay stops trying. To make sure nothing is
          silently lost, acknowledge every verified event immediately, push it
          onto a queue, and process it from a worker. Anything the worker
          can&apos;t process after its own retries goes to a{" "}
          <strong>dead-letter queue (DLQ)</strong> for manual inspection.
        </p>
      </Prose>
      <CodeBlock
        language="js"
        filename="dlq-worker.js"
        code={`// Producer: the webhook route just verifies, enqueues, and acks.
app.post(
  "/webhooks/bettapay",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!isVerified(req.body, req.header("X-BettaPay-Signature"), req.header("X-BettaPay-Timestamp"))) {
      return res.status(400).send("invalid signature");
    }
    await queue.add("bettapay-event", req.body.toString("utf8"), {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
    });
    res.status(200).send("ok"); // ack fast; worker does the real work
  }
);

// Consumer: process with its own retries; failures land in the DLQ.
worker.process("bettapay-event", async (job) => {
  const event = JSON.parse(job.data);
  await handleEvent(event);
});

worker.on("failed", async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    await deadLetterQueue.add("bettapay-dlq", {
      payload: job.data,
      error: err.message,
      failedAt: new Date().toISOString(),
    });
    await alertOncall(\`Webhook moved to DLQ: \${err.message}\`);
  }
});`}
      />

      <H2>Test your endpoint</H2>
      <Prose>
        <ul>
          <li>
            <strong>webhook.site</strong> — paste a{" "}
            <a href="https://webhook.site" target="_blank" rel="noopener noreferrer">webhook.site</a>{" "}
            URL into your webhook settings to see raw deliveries, headers, and the
            signature without writing any code. Great for confirming BettaPay is
            sending what you expect.
          </li>
          <li>
            <strong>Resend from the dashboard</strong> — every event has a{" "}
            <em>Resend</em> button so you can replay it against your endpoint
            while debugging.
          </li>
          <li>
            <strong>Force a failure</strong> — return a <code>500</code> on
            purpose and watch the retry schedule kick in via the delivery log.
          </li>
        </ul>
      </Prose>

      <H2>Monitoring and alerts</H2>
      <Prose>
        <ul>
          <li>
            Alert when the <strong>DLQ depth</strong> is greater than zero — that
            means events are failing all retries.
          </li>
          <li>
            Track your <strong>webhook 2xx rate</strong>; a drop signals an
            outage or a bad deploy.
          </li>
          <li>
            Watch <strong>handler latency</strong> — creeping toward the timeout
            is an early warning that retries are coming.
          </li>
          <li>
            The dashboard&apos;s <strong>delivery log</strong> shows every attempt
            and response code; reconcile it against your own records periodically.
          </li>
        </ul>
      </Prose>

      <Callout variant="note" title="Feature status">
        Signed webhooks, the retry schedule, and the delivery log with resend are{" "}
        <strong>available now</strong>. Configurable per-endpoint retry policies
        are in development.
      </Callout>

      <H2>Next steps</H2>
      <Prose>
        <ul>
          <li>
            React to settlement events →{" "}
            <Link href="/guides/fiat-settlement">Fiat Settlement Configuration</Link>.
          </li>
          <li>
            Exercise the full flow safely →{" "}
            <Link href="/guides/testnet-testing">Testing with Stellar Testnet</Link>.
          </li>
          <li>
            Event payload schemas → <Link href="/docs">API reference</Link>.
          </li>
        </ul>
      </Prose>
    </GuideLayout>
  );
}
