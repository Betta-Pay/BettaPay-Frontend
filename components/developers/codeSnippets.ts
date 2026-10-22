import type { SdkCall } from '@/lib/docs/snippet-validation';
import type { HttpMethod } from '@/lib/docs/types';

export type Language = 'javascript' | 'python' | 'php' | 'go';
export type Operation =
  | 'create-payment-link'
  | 'list-transactions'
  | 'initiate-settlement'
  | 'get-fx-quote';

export interface OperationBinding {
  /** Endpoint id in `lib/docs/endpoints.ts`. */
  endpointId: string;
  /**
   * The route this operation is documented against, restated here on purpose.
   *
   * The generated samples in `lib/docs/snippets.ts` are derived from the
   * registry, so they cannot disagree with it. These hand-written snippets
   * can, and so can the registry itself — restating the verb and path means a
   * route rename in `endpoints.ts` fails the snippet suite until someone comes
   * back here and confirms the examples still describe reality.
   */
  method: HttpMethod;
  path: string;
  /** The SDK call the snippets are expected to demonstrate. */
  call: SdkCall;
}

/**
 * Which documented endpoint each operation exercises, and the SDK call that
 * fronts it. `lib/docs/__tests__/snippets.test.ts` uses this map to check that
 * every snippet below names the right resource and passes only fields the
 * endpoint documents — so these examples cannot quietly drift away from
 * `lib/docs/endpoints.ts` as the API evolves.
 */
export const OPERATION_ENDPOINTS: Record<Operation, OperationBinding> = {
  'create-payment-link': {
    endpointId: 'payments-create',
    method: 'POST',
    path: '/api/payments',
    call: { resource: 'payments', action: 'create' },
  },
  'list-transactions': {
    endpointId: 'payments-list',
    method: 'GET',
    path: '/api/payments',
    call: { resource: 'payments', action: 'list' },
  },
  'initiate-settlement': {
    endpointId: 'settlements-create',
    method: 'POST',
    path: '/api/settlements',
    call: { resource: 'settlements', action: 'create' },
  },
  'get-fx-quote': {
    endpointId: 'fx-quote',
    method: 'GET',
    path: '/api/quote',
    call: { resource: 'fx', action: 'quote' },
  },
};

export const codeSnippets: Record<Operation, Record<Language, string>> = {
  'create-payment-link': {
    javascript: `import { BettaPay } from '@bettapay/sdk';

const client = new BettaPay({
  apiKey: 'bp_live_YOUR_API_KEY',
  network: 'mainnet',
});

const payment = await client.payments.create({
  amountUsdc: 25.0,
  currency: 'USDC',
  source: 'checkout',
});

console.log(payment.url);
// Output: https://betta.pay/pay/9b2f`,

    python: `from bettapay import BettaPay

client = BettaPay(
    api_key='bp_live_YOUR_API_KEY',
    network='mainnet'
)

payment = client.payments.create(
    amountUsdc=25.0,
    currency='USDC',
    source='checkout'
)

print(payment.url)
# Output: https://betta.pay/pay/9b2f`,

    php: `<?php
require 'vendor/autoload.php';

use BettaPay\\Client;

$client = new Client([
    'api_key' => 'bp_live_YOUR_API_KEY',
    'network' => 'mainnet'
]);

$payment = $client->payments->create([
    'amountUsdc' => 25.0,
    'currency' => 'USDC',
    'source' => 'checkout'
]);

echo $payment->url;
// Output: https://betta.pay/pay/9b2f`,

    go: `package main

import (
	"context"
	"fmt"

	"github.com/bettapay/sdk-go"
)

func main() {
	ctx := context.Background()
	client := bettapay.NewClient(
		bettapay.WithAPIKey("bp_live_YOUR_API_KEY"),
		bettapay.WithNetwork("mainnet"),
	)

	payment, err := client.Payments.Create(ctx, &bettapay.CreatePaymentRequest{
		AmountUsdc: 25.0,
		Currency:   "USDC",
		Source:     "checkout",
	})

	if err != nil {
		panic(err)
	}

	fmt.Println(payment.URL)
	// Output: https://betta.pay/pay/9b2f
}`,
  },

  'list-transactions': {
    javascript: `import { BettaPay } from '@bettapay/sdk';

const client = new BettaPay({
  apiKey: 'bp_live_YOUR_API_KEY',
  network: 'mainnet',
});

const payments = await client.payments.list({
  status: 'completed',
  limit: 50,
});

console.log(payments.data);
// Output: [{ id: '9b2f...', amountUsdc: 25, ... }]`,

    python: `from bettapay import BettaPay

client = BettaPay(
    api_key='bp_live_YOUR_API_KEY',
    network='mainnet'
)

payments = client.payments.list(
    status='completed',
    limit=50
)

print(payments.data)
# Output: [{ 'id': '9b2f...', 'amountUsdc': 25, ... }]`,

    php: `<?php
require 'vendor/autoload.php';

use BettaPay\\Client;

$client = new Client([
    'api_key' => 'bp_live_YOUR_API_KEY',
    'network' => 'mainnet'
]);

$payments = $client->payments->list([
    'status' => 'completed',
    'limit' => 50
]);

print_r($payments->data);
// Output: Array { [0] => { 'id' => '9b2f...', ... } }`,

    go: `package main

import (
	"context"
	"fmt"

	"github.com/bettapay/sdk-go"
)

func main() {
	ctx := context.Background()
	client := bettapay.NewClient(
		bettapay.WithAPIKey("bp_live_YOUR_API_KEY"),
		bettapay.WithNetwork("mainnet"),
	)

	payments, err := client.Payments.List(ctx, &bettapay.ListPaymentsRequest{
		Status: "completed",
		Limit:  50,
	})

	if err != nil {
		panic(err)
	}

	fmt.Println(payments.Data)
	// Output: [{ ID: "9b2f...", AmountUsdc: 25, ... }]
}`,
  },

  'initiate-settlement': {
    javascript: `import { BettaPay } from '@bettapay/sdk';

const client = new BettaPay({
  apiKey: 'bp_live_YOUR_API_KEY',
  network: 'mainnet',
});

const settlement = await client.settlements.create({
  amountUsdc: 100.0,
  destination: 'bank_acct_123',
});

console.log(settlement.id);
// Output: 7d5a...`,

    python: `from bettapay import BettaPay

client = BettaPay(
    api_key='bp_live_YOUR_API_KEY',
    network='mainnet'
)

settlement = client.settlements.create(
    amountUsdc=100.0,
    destination='bank_acct_123'
)

print(settlement.id)
# Output: 7d5a...`,

    php: `<?php
require 'vendor/autoload.php';

use BettaPay\\Client;

$client = new Client([
    'api_key' => 'bp_live_YOUR_API_KEY',
    'network' => 'mainnet'
]);

$settlement = $client->settlements->create([
    'amountUsdc' => 100.0,
    'destination' => 'bank_acct_123'
]);

echo $settlement->id;
// Output: 7d5a...`,

    go: `package main

import (
	"context"
	"fmt"

	"github.com/bettapay/sdk-go"
)

func main() {
	ctx := context.Background()
	client := bettapay.NewClient(
		bettapay.WithAPIKey("bp_live_YOUR_API_KEY"),
		bettapay.WithNetwork("mainnet"),
	)

	settlement, err := client.Settlements.Create(ctx, &bettapay.CreateSettlementRequest{
		AmountUsdc:  100.0,
		Destination: "bank_acct_123",
	})

	if err != nil {
		panic(err)
	}

	fmt.Println(settlement.ID)
	// Output: 7d5a...
}`,
  },

  'get-fx-quote': {
    javascript: `import { BettaPay } from '@bettapay/sdk';

const client = new BettaPay({
  apiKey: 'bp_test_YOUR_DEV_KEY',
  network: 'testnet',
});

const quote = await client.fx.quote({
  from: 'USDC',
  to: 'NGN',
  amount: 50,
});

console.log(quote.converted);
// Output: 82521`,

    python: `from bettapay import BettaPay

client = BettaPay(
    api_key='bp_test_YOUR_DEV_KEY',
    network='testnet'
)

quote = client.fx.quote({
    'from': 'USDC',
    'to': 'NGN',
    'amount': 50
})

print(quote.converted)
# Output: 82521`,

    php: `<?php
require 'vendor/autoload.php';

use BettaPay\\Client;

$client = new Client([
    'api_key' => 'bp_test_YOUR_DEV_KEY',
    'network' => 'testnet'
]);

$quote = $client->fx->quote([
    'from' => 'USDC',
    'to' => 'NGN',
    'amount' => 50
]);

echo $quote->converted;
// Output: 82521`,

    go: `package main

import (
	"context"
	"fmt"

	"github.com/bettapay/sdk-go"
)

func main() {
	ctx := context.Background()
	client := bettapay.NewClient(
		bettapay.WithAPIKey("bp_test_YOUR_DEV_KEY"),
		bettapay.WithNetwork("testnet"),
	)

	quote, err := client.Fx.Quote(ctx, &bettapay.QuoteRequest{
		From:   "USDC",
		To:     "NGN",
		Amount: 50,
	})

	if err != nil {
		panic(err)
	}

	fmt.Println(quote.Converted)
	// Output: 82521
}`,
  },
};
