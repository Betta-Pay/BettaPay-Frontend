/**
 * Type declaration for the SDK surface the docs snippets demonstrate. The
 * TypeScript snippets are extracted by `scripts/extract-sdk-snippets.mjs` and
 * compiled against this file (`npm run typecheck:snippets`), so a snippet that
 * calls a method or passes a field that is not declared here fails CI.
 *
 * Keep it in step with `lib/docs/endpoints.ts` and `lib/sdks/surface.ts`.
 */
export interface BettaPayOptions {
  apiKey: string;
  network?: 'mainnet' | 'testnet';
  baseUrl?: string;
}

export interface Payment {
  id: string;
  merchantId: string;
  amountUsdc: number;
  amountNgn: number | null;
  fxRate: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  txHash: string | null;
  payerAddress: string | null;
  source: string | null;
  url?: string;
  createdAt: string;
}

export interface CreatePaymentParams {
  amountUsdc: number;
  currency?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface ListPaymentsParams {
  status?: Payment['status'];
  limit?: number;
  page?: number;
}

export interface Settlement {
  id: string;
  merchantId: string;
  amountUsdc: number;
  amountNgn: number | null;
  status: string;
  txHash: string | null;
  bankName: string | null;
  accountNumber: string | null;
  createdAt: string;
}

export interface CreateSettlementParams {
  amountUsdc: number;
  destination?: string;
}

export interface QuoteParams {
  from: string;
  to: string;
  amount: number;
  slippageBps?: number;
}

export interface Quote {
  from: string;
  to: string;
  rate: number;
  amount: number;
  converted: number;
}

export interface Rate {
  from: string;
  to: string;
  rate: number;
  change: number;
  trend: 'up' | 'down';
}

export interface RatesResponse {
  usdcNgn?: number;
  rates: Rate[];
}

export class BettaPay {
  constructor(options: BettaPayOptions);

  payments: {
    create(params: CreatePaymentParams): Promise<Payment>;
    list(params?: ListPaymentsParams): Promise<{ data: Payment[] }>;
    get(id: string): Promise<Payment>;
    update(id: string, params: Partial<Pick<Payment, 'status' | 'txHash'>>): Promise<Payment>;
  };

  settlements: {
    create(params: CreateSettlementParams): Promise<Settlement>;
    list(params?: { limit?: number; page?: number }): Promise<{ data: Settlement[] }>;
    get(id: string): Promise<Settlement>;
  };

  fx: {
    quote(params: QuoteParams): Promise<Quote>;
    rates(): Promise<RatesResponse>;
  };
}
