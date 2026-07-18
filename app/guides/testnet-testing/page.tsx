import type { Metadata } from 'next';
import GuideLayout from '@/components/guides/GuideLayout';

export const metadata: Metadata = {
  title: 'Testing with Stellar Testnet | BettaPay Guides',
  description: 'Use Stellar testnet, Freighter, Friendbot, and Horizon to validate BettaPay integrations safely.',
};

const toc = [
  { id: 'prerequisites', title: 'Prerequisites' },
  { id: 'network', title: 'Separate environments' },
  { id: 'funding', title: 'Fund test accounts' },
  { id: 'checkout', title: 'Run a checkout test' },
  { id: 'horizon', title: 'Verify with Horizon' },
  { id: 'pitfalls', title: 'Common pitfalls' },
  { id: 'next-steps', title: 'Next steps' },
];

export default function TestnetTestingGuide() {
  return (
    <GuideLayout
      title="Testing with Stellar Testnet"
      subtitle="Create a repeatable QA loop for BettaPay integrations using Freighter testnet accounts, Friendbot funding, and Horizon transaction checks."
      difficulty="Beginner"
      time="15 min"
      updated="July 2026"
      toc={toc}
      previous={{ title: 'Fiat Settlement Configuration', href: '/guides/fiat-settlement' }}
    >
      <h2 id="prerequisites">Prerequisites</h2>
      <ul>
        <li>Freighter installed with at least one test wallet.</li>
        <li>A BettaPay development or staging merchant account.</li>
        <li><code>NEXT_PUBLIC_STELLAR_NETWORK=testnet</code> in local development.</li>
        <li>Access to Stellar testnet Horizon.</li>
      </ul>

      <h2 id="network">Separate environments</h2>
      <p>Never mix testnet and mainnet configuration. Keep explicit environment values in development, staging, and production.</p>
      <pre><code>{`NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_API_URL=http://localhost:3001`}</code></pre>

      <h2 id="funding">Fund test accounts</h2>
      <ol>
        <li>Copy the Freighter public key for the payer account.</li>
        <li>Open <code>https://friendbot.stellar.org</code> and request testnet XLM.</li>
        <li>Add a test USDC trustline if your checkout requires USDC.</li>
      </ol>
      <pre><code>{`curl "https://friendbot.stellar.org?addr=<PUBLIC_KEY>"`}</code></pre>

      <h2 id="checkout">Run a checkout test</h2>
      <ol>
        <li>Create a low-value payment link from the dashboard or API.</li>
        <li>Open the hosted checkout URL in a browser with Freighter enabled.</li>
        <li>Confirm Freighter shows <strong>Testnet</strong> before approving.</li>
        <li>Save the returned transaction hash with your test evidence.</li>
      </ol>

      <h2 id="horizon">Verify with Horizon</h2>
      <p>Horizon provides an independent view of submitted Stellar transactions.</p>
      <pre><code>{`# Confirm a transaction was accepted on testnet
curl "https://horizon-testnet.stellar.org/transactions/<TRANSACTION_HASH>"

# Inspect recent payments for an account
curl "https://horizon-testnet.stellar.org/accounts/<PUBLIC_KEY>/payments?order=desc&limit=5"`}</code></pre>

      <h2 id="pitfalls">Common pitfalls</h2>
      <ul>
        <li><strong>Freighter network mismatch:</strong> reload the checkout after switching networks.</li>
        <li><strong>Insufficient XLM:</strong> testnet accounts still need XLM for fees and reserves.</li>
        <li><strong>Cached environment:</strong> restart Next.js after changing <code>NEXT_PUBLIC_*</code> variables.</li>
      </ul>

      <h2 id="next-steps">Next steps</h2>
      <p>Automate this flow in Playwright smoke tests once API fixtures are stable, and keep screenshots or transaction hashes with release evidence.</p>
    </GuideLayout>
  );
}
