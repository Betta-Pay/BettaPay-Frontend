import type { Metadata } from 'next';
import GuideLayout from '@/components/guides/GuideLayout';

export const metadata: Metadata = {
  title: 'Fiat Settlement Configuration | BettaPay Guides',
  description: 'Configure BettaPay fiat settlement preferences, payout routing, and operational monitoring.',
};

const toc = [
  { id: 'prerequisites', title: 'Prerequisites' },
  { id: 'model', title: 'Understand the settlement model' },
  { id: 'profile', title: 'Configure a payout profile' },
  { id: 'sep24', title: 'SEP-24 style flow' },
  { id: 'monitoring', title: 'Monitor settlements' },
  { id: 'pitfalls', title: 'Common pitfalls' },
  { id: 'next-steps', title: 'Next steps' },
];

export default function FiatSettlementGuide() {
  return (
    <GuideLayout
      title="Fiat Settlement Configuration"
      subtitle="Set up payout preferences and operational checks for merchants that accept digital assets and settle into fiat rails."
      difficulty="Intermediate"
      time="14 min"
      updated="July 2026"
      toc={toc}
      previous={{ title: 'Webhook Handling', href: '/guides/webhook-handling' }}
      next={{ title: 'Testing with Stellar Testnet', href: '/guides/testnet-testing' }}
    >
      <h2 id="prerequisites">Prerequisites</h2>
      <ul>
        <li>A verified merchant profile for the settlement provider you plan to use.</li>
        <li>Bank account or payout account details approved by the provider.</li>
        <li>Clear accounting rules for fees, FX spread, and settlement timing.</li>
      </ul>

      <h2 id="model">Understand the settlement model</h2>
      <p>BettaPay tracks the payment separately from the payout. A checkout can be paid on Stellar while the fiat settlement remains pending until the provider completes off-ramp processing.</p>
      <ul>
        <li><strong>Payment:</strong> customer sends the requested asset.</li>
        <li><strong>Conversion:</strong> provider converts to the merchant settlement currency.</li>
        <li><strong>Payout:</strong> funds move to the configured bank or fiat account.</li>
      </ul>

      <h2 id="profile">Configure a payout profile</h2>
      <ol>
        <li>Open <strong>Settlement</strong> in the BettaPay dashboard.</li>
        <li>Select the settlement currency and destination country.</li>
        <li>Add payout account details and confirm the account owner matches the merchant profile.</li>
        <li>Choose automatic settlement or manual review, depending on operational risk tolerance.</li>
      </ol>

      <h2 id="sep24">SEP-24 style flow</h2>
      <p>For Stellar anchors, SEP-24 separates interactive KYC/payment consent from the on-chain transfer. Keep a durable record of the transaction ID returned by the anchor.</p>
      <pre><code>{`type SettlementPreference = {
  merchantId: string;
  asset: 'USDC';
  settlementCurrency: 'USD' | 'EUR' | 'NGN';
  payoutMethodId: string;
  mode: 'automatic' | 'manual_review';
};`}</code></pre>

      <h2 id="monitoring">Monitor settlements</h2>
      <ol>
        <li>Subscribe to settlement webhooks in addition to payment webhooks.</li>
        <li>Display <code>payment_status</code> and <code>settlement_status</code> separately in internal tools.</li>
        <li>Reconcile paid orders against payout batches at the end of each business day.</li>
      </ol>

      <h2 id="pitfalls">Common pitfalls</h2>
      <ul>
        <li><strong>Assuming instant payout:</strong> off-ramp providers may settle on business-day schedules.</li>
        <li><strong>Mixed ledgers:</strong> keep on-chain transaction hashes and bank payout IDs in separate fields.</li>
        <li><strong>Unsupported corridors:</strong> verify currency/country support before launching a new market.</li>
      </ul>

      <h2 id="next-steps">Next steps</h2>
      <p>Run testnet checkout flows first, then complete a small production pilot before enabling automatic settlement for high-volume merchants.</p>
    </GuideLayout>
  );
}
