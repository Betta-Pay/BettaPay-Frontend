import type { Metadata } from 'next';
import GuideLayout from '@/components/guides/GuideLayout';

export const metadata: Metadata = {
  title: 'Accepting Your First Payment | BettaPay Guides',
  description: 'Create a BettaPay merchant account, connect Freighter on Stellar testnet, publish a payment link, and verify payment status.',
};

const toc = [
  { id: 'prerequisites', title: 'Prerequisites' },
  { id: 'create-account', title: 'Create a merchant account' },
  { id: 'configure-wallet', title: 'Configure Freighter and testnet' },
  { id: 'create-link', title: 'Create a payment link' },
  { id: 'verify-payment', title: 'Verify the payment' },
  { id: 'pitfalls', title: 'Common pitfalls' },
  { id: 'next-steps', title: 'Next steps' },
];

export default function FirstPaymentGuide() {
  return (
    <GuideLayout
      title="Accepting Your First Payment"
      subtitle="Use the BettaPay dashboard to create a payment link, collect a Stellar testnet payment, and confirm the transaction status without writing code."
      difficulty="Beginner"
      time="12 min"
      updated="July 2026"
      toc={toc}
      next={{ title: 'Server-to-Server API Integration', href: '/guides/server-to-server' }}
    >
      <h2 id="prerequisites">Prerequisites</h2>
      <ul>
        <li>A BettaPay merchant login configured through Google OAuth.</li>
        <li>The Freighter browser extension installed and switched to <strong>Testnet</strong>.</li>
        <li>Testnet XLM and test USDC in the paying wallet.</li>
        <li>Access to the BettaPay frontend and the <a href="/docs">API documentation</a> for field reference.</li>
      </ul>

      <h2 id="create-account">Create a merchant account</h2>
      <ol>
        <li>Open BettaPay and choose <strong>Sign in with Google</strong>.</li>
        <li>Complete the OAuth flow and land on the merchant dashboard.</li>
        <li>Open <strong>Settings</strong> and confirm the business display name, support email, and preferred settlement currency.</li>
      </ol>
      <p>Keep the display name clear because it appears on hosted payment pages and helps payers identify the merchant.</p>

      <h2 id="configure-wallet">Configure Freighter and testnet</h2>
      <ol>
        <li>Open Freighter, choose the network switcher, and select <strong>Testnet</strong>.</li>
        <li>Fund the wallet with Friendbot if it has no testnet XLM.</li>
        <li>Add the test USDC asset used by your BettaPay environment.</li>
      </ol>
      <pre><code>{`# Optional: verify the account exists on testnet Horizon
curl "https://horizon-testnet.stellar.org/accounts/<PUBLIC_KEY>"`}</code></pre>

      <h2 id="create-link">Create a payment link</h2>
      <ol>
        <li>Go to <strong>Payment Links</strong> and select <strong>Create link</strong>.</li>
        <li>Enter an amount, currency, short description, and optional customer reference.</li>
        <li>Set an expiration window that matches the checkout context.</li>
        <li>Copy the hosted URL and open it in a fresh browser tab.</li>
      </ol>

      <h2 id="verify-payment">Verify the payment</h2>
      <ol>
        <li>Connect Freighter on the hosted payment page.</li>
        <li>Review the recipient, asset, amount, and network before approving.</li>
        <li>Approve the transaction and wait for the payment page to show a success state.</li>
        <li>Return to the dashboard and confirm the transaction appears in <strong>Payments</strong>.</li>
      </ol>

      <h2 id="pitfalls">Common pitfalls</h2>
      <ul>
        <li><strong>Wrong network:</strong> Freighter mainnet accounts cannot pay testnet links.</li>
        <li><strong>Missing trustline:</strong> the payer must hold or trust the payment asset before sending it.</li>
        <li><strong>Expired link:</strong> regenerate the link rather than reusing stale checkout URLs.</li>
      </ul>

      <h2 id="next-steps">Next steps</h2>
      <p>After validating your first payment, automate link creation with the server-to-server API and subscribe to webhooks for fulfillment.</p>
    </GuideLayout>
  );
}
