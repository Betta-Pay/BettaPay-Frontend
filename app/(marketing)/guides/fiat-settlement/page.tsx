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

const SLUG = "fiat-settlement";
const guide = getGuide(SLUG)!;

export const metadata: Metadata = {
  title: `${guide.title} | BettaPay Guides`,
  description: guide.description,
};

export default function FiatSettlementGuide() {
  return (
    <GuideLayout slug={SLUG}>
      <Prose>
        <p>
          Collecting USDC is only half the story — most merchants want the money
          in their bank account, in local currency. <strong>Settlement</strong>{" "}
          is the process of converting your on-chain USDC balance to fiat and
          paying it out through a <strong>Stellar anchor</strong> using the{" "}
          SEP-24 interactive flow. This guide covers configuring anchors,
          initiating settlements from the dashboard and API, tracking their
          lifecycle, handling settlement webhooks, and meeting KYC requirements.
        </p>
      </Prose>

      <Callout variant="note" title="Prerequisite">
        You should have collected at least one payment (see{" "}
        <Link href="/guides/first-payment">Accepting Your First Payment</Link>)
        so there&apos;s a USDC balance to settle.
      </Callout>

      <H2>How settlement works</H2>
      <Prose>
        <p>
          BettaPay batches your available USDC and hands it to an anchor. The
          anchor runs the off-ramp: it verifies your identity (KYC), converts
          USDC to fiat at its quoted rate, and deposits to your bank account. The
          SEP-24 standard defines this interactive handoff, and BettaPay tracks
          the transaction to completion on your behalf.
        </p>
      </Prose>

      <H2>Supported anchors</H2>
      <Prose>
        <p>
          Available anchors depend on your settlement country and currency. The
          table below shows current coverage. Availability changes as anchors
          complete integration.
        </p>
      </Prose>
      <DataTable
        headers={["Anchor", "Region", "Currency", "Rails", "Status"]}
        rows={[
          ["Cowrie", "Nigeria", "NGN", "Bank transfer (NIP)", "Available"],
          ["Fonbnk", "Kenya", "KES", "M-Pesa, bank", "Available"],
          ["Link Money", "Ghana", "GHS", "Mobile money, bank", "In development"],
          ["MoneyGram Access", "Global", "USD", "Cash pickup", "In development"],
        ]}
      />
      <Callout variant="warning" title="Availability varies">
        Anchors marked <em>In development</em> appear in the dashboard but
        can&apos;t process live settlements yet. On testnet you&apos;ll use the{" "}
        Stellar reference anchor (SEP-24) regardless of the production list above.
      </Callout>

      <H2>Configure settlement in merchant settings</H2>
      <Prose>
        <p>
          Under <strong>Settings → Settlement</strong>, configure:
        </p>
        <ul>
          <li>
            <strong>Settlement anchor</strong> — pick from the anchors available
            in your region.
          </li>
          <li>
            <strong>Payout destination</strong> — your bank account or mobile
            money number. The anchor collects and stores these details during KYC.
          </li>
          <li>
            <strong>Schedule</strong> — <em>manual</em> (you trigger each
            settlement) or <em>automatic</em> (settle whenever the balance crosses
            a threshold).
          </li>
          <li>
            <strong>Minimum amount</strong> — BettaPay enforces a per-merchant
            minimum and maximum per settlement; balances below the minimum roll
            over to the next run.
          </li>
        </ul>
      </Prose>

      <H2>Initiate a settlement</H2>
      <H3>From the dashboard</H3>
      <Prose>
        <p>
          Open <strong>Settlements → New settlement</strong>, review the
          available balance and the anchor&apos;s quoted rate and fee, then
          confirm. If the anchor needs interactive KYC or a one-time
          confirmation, a SEP-24 window opens to complete it.
        </p>
      </Prose>

      <H3>From the API</H3>
      <Prose>
        <p>
          Send an <code>Idempotency-Key</code> so a retried request never creates
          a duplicate payout. Amounts are strings to avoid floating-point errors.
        </p>
      </Prose>
      <CodeBlock
        language="js"
        filename="create-settlement.js"
        code={`const { apiRequest } = require("./bettapay-client"); // from the S2S guide

/**
 * Initiate a settlement of USDC to fiat via the configured anchor.
 * Idempotent on \`batchRef\` so retries are safe.
 */
async function createSettlement({ amount, anchorId, batchRef }) {
  try {
    const settlement = await apiRequest("/v1/settlements", {
      method: "POST",
      idempotencyKey: \`settle-\${batchRef}\`,
      body: {
        amount: String(amount), // USDC to settle
        asset: "USDC",
        anchorId,               // from Settings -> Settlement
        reference: batchRef,    // your own batch id
      },
    });
    // { id, status: "PENDING", amount, fee, quotedRate, anchorId, ... }
    return settlement;
  } catch (err) {
    // Per-merchant limits and insufficient balance surface as 4xx here.
    console.error("settlement failed:", err.message);
    throw err;
  }
}

module.exports = { createSettlement };`}
      />
      <Callout variant="tip">
        BettaPay enforces <strong>per-merchant limits</strong> and processes
        settlements in <strong>batches</strong>. If you request more than your
        limit, the API returns a <code>422</code> describing the allowed range —
        split the amount across runs.
      </Callout>

      <H2>Track settlement status</H2>
      <Prose>
        <p>Every settlement moves through a predictable lifecycle:</p>
      </Prose>
      <DataTable
        headers={["Status", "Meaning", "Terminal?"]}
        rows={[
          ["PENDING", "Accepted and queued for the next batch.", "No"],
          [
            "PROCESSING",
            "Handed to the anchor; KYC/conversion/payout in progress.",
            "No",
          ],
          [
            "COMPLETED",
            "Fiat delivered to your payout destination.",
            "Yes",
          ],
          [
            "FAILED",
            "Anchor rejected or payout failed; USDC returned to balance.",
            "Yes",
          ],
        ]}
      />
      <Prose>
        <p>Fetch the current status any time:</p>
      </Prose>
      <CodeBlock
        language="js"
        filename="get-settlement.js"
        code={`const { apiRequest } = require("./bettapay-client");

async function getSettlement(settlementId) {
  const s = await apiRequest(\`/v1/settlements/\${settlementId}\`);
  // { id, status, amount, fee, netFiatAmount, currency, anchorRef, completedAt }
  return s;
}

module.exports = { getSettlement };`}
      />
      <Callout variant="warning">
        Prefer webhooks over polling. Settlements can sit in{" "}
        <code>PROCESSING</code> for minutes to hours depending on the anchor and
        banking rails — polling that whole time is wasteful.
      </Callout>

      <H2>Handle settlement webhooks</H2>
      <Prose>
        <p>
          BettaPay fires an event on each state change. Verify the signature and
          dedupe exactly as in{" "}
          <Link href="/guides/webhook-handling">Webhook Handling &amp; Retry Logic</Link>
          , then react to the settlement types.
        </p>
      </Prose>
      <CodeBlock
        language="js"
        filename="settlement-events.js"
        code={`function onSettlementEvent(event) {
  switch (event.type) {
    case "settlement.processing":
      markInProgress(event.data.settlementId);
      break;
    case "settlement.completed":
      // Record the NET fiat amount actually delivered, not the gross USDC.
      recordPayout({
        id: event.data.settlementId,
        net: event.data.netFiatAmount,
        currency: event.data.currency,
        anchorRef: event.data.anchorRef,
      });
      break;
    case "settlement.failed":
      // USDC has been returned to your balance; surface the reason.
      alertFinanceTeam(event.data.settlementId, event.data.failureReason);
      break;
    default:
      break;
  }
}`}
      />
      <Prose>
        <p>A completed settlement webhook looks like this:</p>
      </Prose>
      <CodeBlock
        language="json"
        filename="settlement.completed.json"
        code={`{
  "id": "evt_8b21c0aa",
  "type": "settlement.completed",
  "createdAt": "2026-07-19T14:32:10Z",
  "data": {
    "settlementId": "stl_44f0c9",
    "status": "COMPLETED",
    "amount": "500.00",
    "asset": "USDC",
    "netFiatAmount": "747250.00",
    "currency": "NGN",
    "fee": "2.50",
    "quotedRate": "1502.51",
    "anchorId": "cowrie",
    "anchorRef": "CWR-9F31A",
    "reference": "batch-2026-07-19"
  }
}`}
      />

      <H2>Compliance and KYC</H2>
      <Prose>
        <p>
          Off-ramping to fiat is regulated. Before your first settlement
          completes, the anchor must verify your identity:
        </p>
        <ul>
          <li>
            <strong>Business or individual KYC</strong> — legal name, address,
            and government ID or business registration, collected through the
            anchor&apos;s SEP-24 interactive flow.
          </li>
          <li>
            <strong>Bank account verification</strong> — the payout destination
            is validated and, for some anchors, name-matched against your KYC.
          </li>
          <li>
            <strong>Limits tiers</strong> — higher settlement limits may require
            additional documentation. Until KYC is approved, settlements stay in{" "}
            <code>PROCESSING</code> or are rejected.
          </li>
        </ul>
      </Prose>
      <Callout variant="danger" title="KYC lives with the anchor">
        BettaPay does not custody funds or store your KYC documents — the anchor
        does, per its licensing. Complete each anchor&apos;s KYC once; afterward,
        settlements to that anchor process without re-verification.
      </Callout>

      <H2>Troubleshooting</H2>
      <H3>Settlement stuck in PROCESSING</H3>
      <Prose>
        <p>
          Usually pending KYC or a banking cut-off window. Check the anchor
          reference (<code>anchorRef</code>) in the settlement detail and, if the
          anchor requested more documents, complete them in the SEP-24 window.
        </p>
      </Prose>
      <H3>Settlement FAILED and balance returned</H3>
      <Prose>
        <p>
          The anchor rejected the payout — commonly a bank detail mismatch or a
          limit breach. Read <code>failureReason</code>, correct your payout
          destination in settings, and re-initiate.
        </p>
      </Prose>
      <H3>&quot;Amount exceeds settlement limit&quot;</H3>
      <Prose>
        <p>
          You requested more than your per-merchant maximum. Split the amount
          across multiple settlements, or contact support to raise your tier
          (which may require additional KYC).
        </p>
      </Prose>

      <Callout variant="note" title="Feature status">
        Manual settlement, status tracking, and settlement webhooks are{" "}
        <strong>available now</strong> for anchors marked <em>Available</em>{" "}
        above. Automatic scheduled settlement and additional anchors are{" "}
        <strong>in development</strong>. On testnet, use the Stellar reference
        anchor to exercise the full flow.
      </Callout>

      <H2>Next steps</H2>
      <Prose>
        <ul>
          <li>
            Make settlement webhooks reliable →{" "}
            <Link href="/guides/webhook-handling">Webhook Handling &amp; Retry Logic</Link>.
          </li>
          <li>
            Practice the flow safely →{" "}
            <Link href="/guides/testnet-testing">Testing with Stellar Testnet</Link>.
          </li>
          <li>
            Settlement endpoint details → <Link href="/docs">API reference</Link>.
          </li>
        </ul>
      </Prose>
    </GuideLayout>
  );
}
