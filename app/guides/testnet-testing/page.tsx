import type { Metadata } from "next";
import Link from "next/link";
import GuideLayout from "@/components/guides/GuideLayout";
import {
  Callout,
  CodeBlock,
  H2,
  H3,
  Prose,
  Step,
} from "@/components/guides/prose";
import { getGuide } from "@/lib/guides";

const SLUG = "testnet-testing";
const guide = getGuide(SLUG)!;

export const metadata: Metadata = {
  title: `${guide.title} | BettaPay Guides`,
  description: guide.description,
};

export default function TestnetTestingGuide() {
  return (
    <GuideLayout slug={SLUG}>
      <Prose>
        <p>
          The Stellar <strong>testnet</strong> is a full copy of the network that
          uses valueless tokens, so you can build and test payment flows without
          risking real money. This guide sets up a repeatable development loop:
          install Freighter, switch to testnet, fund an account with{" "}
          <strong>friendbot</strong>, get test USDC, run a full BettaPay payment,
          and inspect it in the Stellar Laboratory.
        </p>
      </Prose>

      <Callout variant="tip" title="Do this first">
        This is the foundation for every other guide. Complete it once and
        you&apos;ll have a funded testnet wallet ready for{" "}
        <Link href="/guides/first-payment">your first payment</Link>.
      </Callout>

      <H2>Step 1 — Install Freighter and switch to testnet</H2>
      <Step n={1} title="Install and select the Test Network">
        <ol>
          <li>
            Install the Freighter extension from{" "}
            <a href="https://www.freighter.app" target="_blank" rel="noopener noreferrer">
              freighter.app
            </a>{" "}
            and create (or import) a wallet. Save your recovery phrase.
          </li>
          <li>
            Open Freighter, click the <strong>network selector</strong> at the
            top, and choose <strong>Test Net</strong>. Everything you do now is
            on testnet.
          </li>
          <li>
            Copy your <strong>public key</strong> (starts with <code>G…</code>) —
            you&apos;ll fund it next.
          </li>
        </ol>
      </Step>
      <Callout variant="warning" title="Always confirm the network">
        Freighter shows the active network on every signing prompt. Before you
        sign anything in these guides, confirm it reads <em>Test Network</em>.
      </Callout>

      <H2>Step 2 — Fund your account with friendbot</H2>
      <Prose>
        <p>
          A brand-new Stellar account holds nothing and isn&apos;t yet on the
          ledger. <strong>Friendbot</strong> creates and funds testnet accounts
          with 10,000 test XLM. Replace the address with your Freighter public
          key:
        </p>
      </Prose>
      <CodeBlock
        language="bash"
        filename="fund-account.sh"
        code={`# Fund a testnet account with 10,000 test XLM.
curl "https://friendbot.stellar.org/?addr=GYOUR_PUBLIC_KEY_HERE"

# A successful response is the funding transaction as JSON.
# Re-run it any time your test XLM runs low.`}
      />
      <Prose>
        <p>
          Prefer a UI? The{" "}
          <a href="https://lab.stellar.org/account/fund" target="_blank" rel="noopener noreferrer">
            Stellar Laboratory
          </a>{" "}
          has a &quot;Fund account with friendbot&quot; button that does the same
          thing.
        </p>
      </Prose>

      <H2>Step 3 — Get test USDC</H2>
      <Prose>
        <p>
          XLM covers network fees, but BettaPay settles in <strong>USDC</strong>,
          so you need a test USDC balance. Two things are required: a{" "}
          <strong>trustline</strong> to the testnet USDC asset, and some tokens.
        </p>
      </Prose>
      <Step n={3} title="Add a trustline and receive test USDC">
        <ol>
          <li>
            In Freighter, choose <strong>Manage Assets → Add asset</strong> and
            add USDC using the testnet issuer published in the{" "}
            <Link href="/docs">API reference</Link> (asset code <code>USDC</code>).
            This creates the trustline.
          </li>
          <li>
            Use the BettaPay testnet <strong>USDC faucet</strong> (in the
            dashboard under <strong>Developers → Testnet tools</strong>) to send
            test USDC to your address.
          </li>
        </ol>
        <p>
          Confirm the balance appears in Freighter before continuing. Without a
          trustline, any USDC sent to you will bounce.
        </p>
      </Step>
      <Callout variant="note">
        Testnet USDC has no value and is periodically reset with the network. Top
        up from the faucet whenever you need more.
      </Callout>

      <H2>Step 4 — Create a test payment link</H2>
      <Prose>
        <p>
          With a funded wallet you can run a real payment. In a BettaPay merchant
          account set to <strong>testnet</strong>, create a payment link exactly
          as in{" "}
          <Link href="/guides/first-payment">Accepting Your First Payment</Link> —
          for example a <code>1.00 USD</code> link. Keep the amount small so your
          faucet balance lasts across many tests.
        </p>
      </Prose>

      <H2>Step 5 — Pay with Freighter</H2>
      <Step n={5} title="Complete the test checkout">
        <ol>
          <li>Open the payment link and click <strong>Pay with wallet</strong>.</li>
          <li>Approve the Freighter connection and review the USDC amount.</li>
          <li>
            Confirm the network says <strong>Test Network</strong>, then sign.
            The payment confirms in a few seconds and the dashboard shows{" "}
            <strong>Succeeded</strong>.
          </li>
        </ol>
      </Step>

      <H2>Step 6 — Inspect the transaction in Stellar Laboratory</H2>
      <Prose>
        <p>
          The{" "}
          <a href="https://lab.stellar.org" target="_blank" rel="noopener noreferrer">
            Stellar Laboratory
          </a>{" "}
          lets you look at the raw ledger. Take the transaction hash from the
          payment detail in your dashboard and:
        </p>
        <ul>
          <li>
            Paste it into <strong>Explore Endpoints → Transactions → Single
            Transaction</strong> (make sure the Lab is set to <em>Testnet</em>).
          </li>
          <li>
            Review the <strong>operations</strong> — you should see a payment
            operation moving USDC from the customer to your settlement wallet.
          </li>
          <li>
            Check the <strong>memo</strong> and <strong>asset</strong> match what
            BettaPay recorded.
          </li>
        </ul>
        <p>
          You can also inspect any address&apos;s balances and history in{" "}
          <a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noopener noreferrer">
            stellar.expert (testnet)
          </a>.
        </p>
      </Prose>

      <H2>Reset your test data</H2>
      <Prose>
        <ul>
          <li>
            <strong>Fresh wallet</strong> — create a new account in Freighter and
            re-fund it with friendbot to start from a clean slate.
          </li>
          <li>
            <strong>Clear BettaPay test data</strong> — under{" "}
            <strong>Developers → Testnet tools</strong> you can wipe test payments
            and links without touching production data.
          </li>
          <li>
            <strong>Network resets</strong> — the Stellar testnet is periodically
            reset. When that happens, existing testnet accounts and balances
            disappear; just re-fund with friendbot and re-add your trustline.
          </li>
        </ul>
      </Prose>
      <Callout variant="danger" title="Keep testnet and mainnet separate">
        Never reuse a testnet key as a production settlement wallet, and
        double-check your merchant account&apos;s network before going live.
        Testnet funds are not real; mainnet funds are.
      </Callout>

      <H2>Common issues</H2>
      <H3>Friendbot says &quot;account already funded&quot;</H3>
      <Prose>
        <p>
          The account already exists on testnet. That&apos;s fine — you can
          receive payments. Friendbot only creates an account once; use the faucet
          for more test USDC.
        </p>
      </Prose>
      <H3>USDC doesn&apos;t show up after sending</H3>
      <Prose>
        <p>
          You&apos;re almost certainly missing the <strong>trustline</strong>.
          Add the USDC asset in Freighter (Step 3) and resend from the faucet.
        </p>
      </Prose>
      <H3>&quot;op_underfunded&quot; when paying</H3>
      <Prose>
        <p>
          Not enough USDC (or XLM for fees). Re-fund XLM with friendbot and top up
          USDC from the faucet, then retry the checkout.
        </p>
      </Prose>
      <H3>Laboratory shows &quot;not found&quot; for my transaction</H3>
      <Prose>
        <p>
          The Lab is probably set to the wrong network. Switch it to{" "}
          <strong>Testnet</strong> and paste the hash again.
        </p>
      </Prose>

      <Callout variant="note" title="Feature status">
        Testnet payments, the friendbot funding flow, and Laboratory inspection
        are <strong>available now</strong>. The in-dashboard USDC faucet and
        test-data reset tools live under <strong>Developers → Testnet tools</strong>.
      </Callout>

      <H2>Next steps</H2>
      <Prose>
        <ul>
          <li>
            Run the full flow →{" "}
            <Link href="/guides/first-payment">Accepting Your First Payment</Link>.
          </li>
          <li>
            Automate it from your backend →{" "}
            <Link href="/guides/server-to-server">Server-to-Server Integration</Link>.
          </li>
          <li>
            Endpoints and testnet asset details → <Link href="/docs">API reference</Link>.
          </li>
        </ul>
      </Prose>
    </GuideLayout>
  );
}
