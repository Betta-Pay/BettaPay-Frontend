"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { Code2, Copy } from 'lucide-react';

const codeExample = `// Install the BettaPay SDK
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

interface CodeExampleProps {
  onCopy: (code: string) => void;
}

export function CodeExample({ onCopy }: CodeExampleProps) {
  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" /> Quickstart
        </CardTitle>
        <Button variant="outline" className="border-border rounded-xl h-8 px-3 text-xs" onClick={() => onCopy(codeExample)}>
          <Copy className="w-3 h-3 mr-1.5" /> Copy
        </Button>
      </CardHeader>
      <CardContent>
        <div className="bg-foreground rounded-xl p-5 overflow-x-auto">
          <pre className="text-sm text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap break-words">
            {codeExample}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
