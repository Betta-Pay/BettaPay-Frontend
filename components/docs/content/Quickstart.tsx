import { SectionShell, SubSection, P, Code, Callout } from './primitives';
import { Snippet } from './Snippet';

const step1 = `# After signing in (Google or wallet), you hold a BettaPay JWT.
# Export it so the snippets below can use it:
export BETTAPAY_TOKEN="eyJhbGciOiJIUzI1NiJ9..."`;

const step2 = `# Read your own merchant profile. The merchantId is the
# "merchantId" claim inside your JWT payload.
curl "https://bettapay-backend.onrender.com/api/merchants/$MERCHANT_ID" \\
  -H "Authorization: Bearer $BETTAPAY_TOKEN"`;

const step3 = `# Create a payment link for 25 USDC. The Idempotency-Key makes
# retries safe — the same key returns the same payment for 24h.
curl -X POST "https://bettapay-backend.onrender.com/api/payments" \\
  -H "Authorization: Bearer $BETTAPAY_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{ "amountUsdc": 25.00, "currency": "USDC", "source": "checkout" }'
# → { "data": { "id": "9b2f...", "status": "pending", "url": "https://betta.pay/pay/9b2f" } }`;

const step4 = `# Poll the payment until it settles on-chain (status: completed).
curl "https://bettapay-backend.onrender.com/api/payments/9b2f..." \\
  -H "Authorization: Bearer $BETTAPAY_TOKEN"
# → { "data": { "id": "9b2f...", "status": "completed", "txHash": "a1b2..." } }`;

/** "Quickstart" — signup → first call → payment link → verify → webhook. */
export function Quickstart() {
  return (
    <SectionShell
      id="quickstart"
      title="Quickstart"
      lead="From zero to a settled payment in five steps. The snippets use cURL; every endpoint also ships Node.js, Python and React examples in the API Reference."
    >
      <SubSection id="quickstart-signup" title="1. Sign up and get a token">
        <P>
          Authenticate with{' '}
          <a href="#google-oauth" className="text-primary underline-offset-4 hover:underline">
            Google OAuth
          </a>{' '}
          or{' '}
          <a href="#wallet-auth" className="text-primary underline-offset-4 hover:underline">
            wallet auth
          </a>
          . Both return a JWT you attach as a Bearer token.
        </P>
        <Snippet code={step1} lang="bash" filename="Terminal" />
      </SubSection>

      <SubSection id="quickstart-first-call" title="2. Make your first API call">
        <P>
          Confirm the token works by reading your merchant profile. The{' '}
          <Code>merchantId</Code> comes from your JWT payload.
        </P>
        <Snippet code={step2} lang="bash" filename="Terminal" />
      </SubSection>

      <SubSection id="quickstart-create" title="3. Create a payment link">
        <P>
          Create a payment for 25 USDC. Send an{' '}
          <a href="#idempotency-keys" className="text-primary underline-offset-4 hover:underline">
            Idempotency-Key
          </a>{' '}
          so client retries never create duplicate charges.
        </P>
        <Snippet code={step3} lang="bash" filename="Terminal" />
      </SubSection>

      <SubSection id="quickstart-verify" title="4. Verify the payment">
        <P>
          A new payment starts <Code>pending</Code>. Once the payer sends USDC and the transaction
          confirms on Stellar, the status becomes <Code>completed</Code> and a{' '}
          <Code>txHash</Code> appears.
        </P>
        <Snippet code={step4} lang="bash" filename="Terminal" />
      </SubSection>

      <SubSection id="quickstart-webhook" title="5. Receive a webhook">
        <P>
          Rather than poll, register a webhook to be notified the moment a payment settles. See{' '}
          <a href="#webhook-integration" className="text-primary underline-offset-4 hover:underline">
            Webhook Integration
          </a>{' '}
          for the payload shape and{' '}
          <a href="#webhook-events" className="text-primary underline-offset-4 hover:underline">
            Webhook Events
          </a>{' '}
          for the event catalog.
        </P>
        <Callout variant="tip" title="Test on Testnet first">
          You can run this entire flow against Stellar Testnet with free test USDC before going
          live — see{' '}
          <a href="#testing-testnet" className="text-primary underline-offset-4 hover:underline">
            Testing with Testnet
          </a>
          .
        </Callout>
      </SubSection>
    </SectionShell>
  );
}
