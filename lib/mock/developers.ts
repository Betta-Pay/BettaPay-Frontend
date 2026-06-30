export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  suffix: string;
  created: string;
  lastUsed: string;
  type: 'live' | 'test';
}

export const mockKeys: ApiKey[] = [
  { id: 'key_01', name: 'Production Key', prefix: 'bp_live_', suffix: '...a4f9', created: '2024-01-01', lastUsed: '2 hours ago', type: 'live' },
  { id: 'key_02', name: 'Test Key', prefix: 'bp_test_', suffix: '...c2d8', created: '2024-01-05', lastUsed: '5 days ago', type: 'test' },
];

export const codeExample = `// Install the BettaPay SDK
npm install @bettapay/sdk

// Initialize the client
import { BettaPay } from '@bettapay/sdk';

const client = new BettaPay({
  apiKey: 'bp_live_YOUR_API_KEY',
  network: 'mainnet', // or 'testnet'
});

// Create a payment link
const link = await client.paymentLinks.create({
  label: 'My Product',
  currency: 'USDC',
  type: 'open', // or 'fixed'
});

console.log(link.url); // https://betta.pay/pay/link_xxx`;
