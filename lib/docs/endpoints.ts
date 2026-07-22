import type { Endpoint, HeaderRow } from './types';

// Typed metadata for every documented gateway endpoint. Response schemas mirror
// the shapes the frontend already consumes (`lib/api/hooks.ts`) and the auth
// flows exercised by `app/auth/login` + `lib/stellar/freighter.ts`, so the docs
// describe the real contract rather than invented fields. Code samples are
// generated from `requestExample` in `lib/docs/snippets.ts`.

// ─── Reusable header rows ────────────────────────────────────────────────────

const authHeader: HeaderRow = {
  name: 'Authorization',
  value: 'Bearer <jwt>',
  required: true,
  description: 'JWT issued by an auth endpoint. Required on every authenticated route.',
};

const jsonHeader: HeaderRow = {
  name: 'Content-Type',
  value: 'application/json',
  required: true,
  description: 'All request bodies are JSON and NFC-normalized server-side.',
};

const idempotencyHeader: HeaderRow = {
  name: 'Idempotency-Key',
  value: '<unique-string>',
  required: false,
  description:
    'Optional but recommended for POST /api/payments. Max 255 chars, cached for 24h so retries never double-charge.',
};

const RATE_GLOBAL = '1000 requests / minute per IP (global).';
const RATE_AUTH = '100 requests / minute per IP (auth endpoints).';
const RATE_MUTATION = '30 requests / minute per IP (state-changing routes).';

// Common error cases shared across authenticated routes.
const authErrors = [
  { status: 401, code: 'UNAUTHORIZED', description: 'Missing, malformed or expired JWT.' },
  { status: 429, code: 'RATE_LIMITED', description: 'Rate limit exceeded — retry after the Retry-After header.' },
];

const validationError = {
  status: 400,
  code: 'VALIDATION_ERROR',
  description: 'Request body failed Zod validation. `details` lists the offending fields.',
};

// ─── Authentication ──────────────────────────────────────────────────────────

export const authEndpoints: Endpoint[] = [
  {
    id: 'auth-google',
    title: 'Exchange Google ID token',
    description:
      'Verifies a Google ID token with google-auth-library and returns a BettaPay JWT. Called after the React GoogleLogin flow resolves.',
    method: 'POST',
    path: '/api/auth/google',
    auth: false,
    requestHeaders: [jsonHeader],
    requestBody: [
      {
        name: 'idToken',
        type: 'string',
        required: true,
        description: 'The Google ID token (credential) returned by the GoogleLogin component.',
        example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
      },
    ],
    requestExample: { idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...' },
    responseStatus: 200,
    responseSchema: [
      { name: 'token', type: 'string', required: true, description: 'Signed BettaPay JWT (base64url encoded).' },
    ],
    responseExample: { token: 'eyJhbGciOiJIUzI1NiJ9.eyJtZXJjaGFudElkIjoi...' },
    errors: [
      validationError,
      { status: 401, code: 'UNAUTHORIZED', description: 'The Google ID token could not be verified.' },
      { status: 429, code: 'RATE_LIMITED', description: 'Too many auth attempts.' },
    ],
    rateLimit: RATE_AUTH,
  },
  {
    id: 'auth-wallet-challenge',
    title: 'Request a wallet challenge',
    description:
      'Returns a one-time challenge string for the given Stellar address. The wallet signs this challenge to prove key ownership.',
    method: 'GET',
    path: '/api/auth/wallet/challenge',
    auth: false,
    queryParams: [
      {
        name: 'address',
        type: 'string',
        required: true,
        description: 'The Stellar public key (G...) requesting authentication.',
        example: 'GAXY...7QF',
      },
    ],
    requestExample: undefined,
    responseStatus: 200,
    responseSchema: [
      { name: 'challenge', type: 'string', required: true, description: 'Random nonce to sign with Freighter.' },
    ],
    responseExample: { challenge: 'bettapay-auth:GAXY...7QF:1721300000:9f3c2a...' },
    errors: [
      { status: 400, code: 'VALIDATION_ERROR', description: 'Missing or malformed `address` query param.' },
      { status: 429, code: 'RATE_LIMITED', description: 'Too many auth attempts.' },
    ],
    rateLimit: RATE_AUTH,
  },
  {
    id: 'auth-wallet-verify',
    title: 'Verify a signed challenge',
    description:
      'Verifies the Ed25519 signature over the challenge with @stellar/stellar-sdk and issues a BettaPay JWT on success.',
    method: 'POST',
    path: '/api/auth/wallet/verify',
    auth: false,
    requestHeaders: [jsonHeader],
    requestBody: [
      { name: 'address', type: 'string', required: true, description: 'Stellar public key that signed the challenge.', example: 'GAXY...7QF' },
      { name: 'challenge', type: 'string', required: true, description: 'The exact challenge returned by the challenge endpoint.' },
      { name: 'signature', type: 'string', required: true, description: 'Base64 signature produced by Freighter signMessage.' },
    ],
    requestExample: {
      address: 'GAXY...7QF',
      challenge: 'bettapay-auth:GAXY...7QF:1721300000:9f3c2a...',
      signature: 'MEUCIQ...==',
    },
    responseStatus: 200,
    responseSchema: [
      { name: 'token', type: 'string', required: true, description: 'Signed BettaPay JWT (base64url encoded).' },
    ],
    responseExample: { token: 'eyJhbGciOiJIUzI1NiJ9.eyJtZXJjaGFudElkIjoi...' },
    errors: [
      validationError,
      { status: 401, code: 'UNAUTHORIZED', description: 'Signature did not verify against the address, or the challenge expired.' },
      { status: 429, code: 'RATE_LIMITED', description: 'Too many auth attempts.' },
    ],
    rateLimit: RATE_AUTH,
  },
];

// ─── Merchants ───────────────────────────────────────────────────────────────

export const merchantEndpoints: Endpoint[] = [
  {
    id: 'merchants-create',
    title: 'Create a merchant',
    description: 'Registers a merchant profile owned by the authenticated principal.',
    method: 'POST',
    path: '/api/merchants',
    auth: true,
    requestHeaders: [authHeader, jsonHeader],
    requestBody: [
      { name: 'name', type: 'string', required: true, description: 'Business display name.', example: 'Acme Stores' },
      { name: 'email', type: 'string', required: true, description: 'Contact email for settlement notices.', example: 'ops@acme.com' },
      { name: 'country', type: 'string (ISO 3166-1 alpha-2)', required: false, description: 'Merchant country code.', example: 'NG' },
    ],
    requestExample: { name: 'Acme Stores', email: 'ops@acme.com', country: 'NG' },
    responseStatus: 201,
    responseSchema: [
      { name: 'data', type: 'object', required: true, description: 'The created merchant.', children: [
        { name: 'id', type: 'string (uuid)', required: true, description: 'Merchant id.' },
        { name: 'name', type: 'string', required: true, description: 'Business display name.' },
        { name: 'email', type: 'string', required: true, description: 'Contact email.' },
        { name: 'createdAt', type: 'string (ISO 8601)', required: true, description: 'Creation timestamp.' },
      ] },
    ],
    responseExample: {
      data: { id: '4c1e...', name: 'Acme Stores', email: 'ops@acme.com', createdAt: '2026-07-18T10:00:00.000Z' },
    },
    errors: [...authErrors, validationError],
    rateLimit: RATE_MUTATION,
  },
  {
    id: 'merchants-get',
    title: 'Get a merchant',
    description: 'Fetches a merchant profile by id. Callers may only read merchants they own.',
    method: 'GET',
    path: '/api/merchants/:id',
    auth: true,
    requestHeaders: [authHeader],
    pathParams: [
      { name: 'id', type: 'string (uuid)', required: true, description: 'Merchant id (matches `merchantId` in the JWT).', example: '4c1e...' },
    ],
    requestExample: undefined,
    responseStatus: 200,
    responseSchema: [
      { name: 'data', type: 'object', required: true, description: 'The merchant profile.', children: [
        { name: 'id', type: 'string (uuid)', required: true, description: 'Merchant id.' },
        { name: 'name', type: 'string', required: true, description: 'Business display name.' },
        { name: 'email', type: 'string', required: true, description: 'Contact email.' },
        { name: 'createdAt', type: 'string (ISO 8601)', required: true, description: 'Creation timestamp.' },
      ] },
    ],
    responseExample: {
      data: { id: '4c1e...', name: 'Acme Stores', email: 'ops@acme.com', createdAt: '2026-07-18T10:00:00.000Z' },
    },
    errors: [
      ...authErrors,
      { status: 403, code: 'FORBIDDEN', description: 'The JWT does not own this merchant.' },
      { status: 404, code: 'NOT_FOUND', description: 'No merchant with that id.' },
    ],
    rateLimit: RATE_GLOBAL,
  },
  {
    id: 'merchants-update',
    title: 'Update a merchant',
    description: 'Partially updates a merchant profile. Only provided fields are changed.',
    method: 'PATCH',
    path: '/api/merchants/:id',
    auth: true,
    requestHeaders: [authHeader, jsonHeader],
    pathParams: [
      { name: 'id', type: 'string (uuid)', required: true, description: 'Merchant id.', example: '4c1e...' },
    ],
    requestBody: [
      { name: 'name', type: 'string', required: false, description: 'New business display name.', example: 'Acme Global' },
      { name: 'email', type: 'string', required: false, description: 'New contact email.', example: 'billing@acme.com' },
    ],
    requestExample: { name: 'Acme Global' },
    responseStatus: 200,
    responseSchema: [
      { name: 'data', type: 'object', required: true, description: 'The updated merchant.' },
    ],
    responseExample: {
      data: { id: '4c1e...', name: 'Acme Global', email: 'ops@acme.com', createdAt: '2026-07-18T10:00:00.000Z' },
    },
    errors: [
      ...authErrors,
      validationError,
      { status: 403, code: 'FORBIDDEN', description: 'The JWT does not own this merchant.' },
      { status: 404, code: 'NOT_FOUND', description: 'No merchant with that id.' },
    ],
    rateLimit: RATE_MUTATION,
  },
];

// ─── Payments ────────────────────────────────────────────────────────────────

const paymentSchema = [
  { name: 'id', type: 'string (uuid)', required: true, description: 'Payment id.' },
  { name: 'merchantId', type: 'string (uuid)', required: true, description: 'Owning merchant.' },
  { name: 'amountUsdc', type: 'number', required: true, description: 'Amount charged in USDC.' },
  { name: 'amountNgn', type: 'number | null', required: false, description: 'Fiat equivalent at capture time.' },
  { name: 'fxRate', type: 'number | null', required: false, description: 'USDC→NGN rate applied.' },
  { name: 'status', type: 'string', required: true, description: 'One of pending, processing, completed, failed, expired.' },
  { name: 'txHash', type: 'string | null', required: false, description: 'Stellar transaction hash once settled on-chain.' },
  { name: 'payerAddress', type: 'string | null', required: false, description: 'Stellar address that paid.' },
  { name: 'source', type: 'string | null', required: false, description: 'Origin of the payment (e.g. link, api).' },
  { name: 'url', type: 'string', required: false, description: 'Hosted payment link URL, when applicable.' },
  { name: 'createdAt', type: 'string (ISO 8601)', required: true, description: 'Creation timestamp.' },
];

export const paymentEndpoints: Endpoint[] = [
  {
    id: 'payments-create',
    title: 'Create a payment',
    description:
      'Creates a payment (or hosted payment link). Send an Idempotency-Key so client retries never create duplicates — keys are cached for 24h.',
    method: 'POST',
    path: '/api/payments',
    auth: true,
    requestHeaders: [authHeader, jsonHeader, idempotencyHeader],
    requestBody: [
      { name: 'amountUsdc', type: 'number', required: true, description: 'Amount to charge in USDC. Must be positive.', example: '25.00' },
      { name: 'currency', type: 'string', required: false, description: 'Display currency for the link. Defaults to USDC.', example: 'USDC' },
      { name: 'source', type: 'string', required: false, description: 'Free-form origin label.', example: 'checkout' },
      { name: 'metadata', type: 'object', required: false, description: 'Arbitrary key/value pairs echoed back on webhooks.' },
    ],
    requestExample: { amountUsdc: 25.0, currency: 'USDC', source: 'checkout' },
    responseStatus: 201,
    responseSchema: [{ name: 'data', type: 'object', required: true, description: 'The created payment.', children: paymentSchema }],
    responseExample: {
      data: {
        id: '9b2f...',
        merchantId: '4c1e...',
        amountUsdc: 25.0,
        amountNgn: null,
        fxRate: null,
        status: 'pending',
        txHash: null,
        payerAddress: null,
        source: 'checkout',
        url: 'https://betta.pay/pay/9b2f',
        createdAt: '2026-07-18T10:05:00.000Z',
      },
    },
    errors: [
      ...authErrors,
      validationError,
      { status: 409, code: 'IDEMPOTENCY_CONFLICT', description: 'The Idempotency-Key was reused with a different body.' },
    ],
    rateLimit: RATE_MUTATION,
  },
  {
    id: 'payments-list',
    title: 'List payments',
    description: 'Returns payments belonging to the authenticated merchant, newest first.',
    method: 'GET',
    path: '/api/payments',
    auth: true,
    requestHeaders: [authHeader],
    queryParams: [
      { name: 'status', type: 'string', required: false, description: 'Filter by payment status.', example: 'completed' },
      { name: 'limit', type: 'number', required: false, description: 'Page size (default 50).', example: '50' },
    ],
    requestExample: undefined,
    responseStatus: 200,
    responseSchema: [{ name: 'data', type: 'Payment[]', required: true, description: 'Array of payments.', children: paymentSchema }],
    responseExample: {
      data: [
        { id: '9b2f...', merchantId: '4c1e...', amountUsdc: 25.0, amountNgn: 41250, fxRate: 1650, status: 'completed', txHash: 'a1b2...', payerAddress: 'GABC...', source: 'checkout', createdAt: '2026-07-18T10:05:00.000Z' },
      ],
    },
    errors: [...authErrors],
    rateLimit: RATE_GLOBAL,
  },
  {
    id: 'payments-get',
    title: 'Get a payment',
    description: 'Fetches a single payment by id.',
    method: 'GET',
    path: '/api/payments/:id',
    auth: true,
    requestHeaders: [authHeader],
    pathParams: [{ name: 'id', type: 'string (uuid)', required: true, description: 'Payment id.', example: '9b2f...' }],
    requestExample: undefined,
    responseStatus: 200,
    responseSchema: [{ name: 'data', type: 'object', required: true, description: 'The payment.', children: paymentSchema }],
    responseExample: {
      data: { id: '9b2f...', merchantId: '4c1e...', amountUsdc: 25.0, amountNgn: 41250, fxRate: 1650, status: 'completed', txHash: 'a1b2...', payerAddress: 'GABC...', source: 'checkout', createdAt: '2026-07-18T10:05:00.000Z' },
    },
    errors: [...authErrors, { status: 404, code: 'NOT_FOUND', description: 'No payment with that id.' }],
    rateLimit: RATE_GLOBAL,
  },
  {
    id: 'payments-update',
    title: 'Update payment status',
    description:
      'Transitions a payment between states. Only forward transitions are allowed (pending → processing → completed, or → failed/expired).',
    method: 'PATCH',
    path: '/api/payments/:id',
    auth: true,
    requestHeaders: [authHeader, jsonHeader],
    pathParams: [{ name: 'id', type: 'string (uuid)', required: true, description: 'Payment id.', example: '9b2f...' }],
    requestBody: [
      { name: 'status', type: 'string (enum)', required: true, description: 'Target status: processing | completed | failed | expired.', example: 'completed' },
    ],
    requestExample: { status: 'completed' },
    responseStatus: 200,
    responseSchema: [{ name: 'data', type: 'object', required: true, description: 'The updated payment.', children: paymentSchema }],
    responseExample: {
      data: { id: '9b2f...', merchantId: '4c1e...', amountUsdc: 25.0, status: 'completed', txHash: 'a1b2...', createdAt: '2026-07-18T10:05:00.000Z' },
    },
    errors: [
      ...authErrors,
      validationError,
      { status: 404, code: 'NOT_FOUND', description: 'No payment with that id.' },
      { status: 409, code: 'IDEMPOTENCY_CONFLICT', description: 'Illegal status transition (e.g. completed → pending).' },
    ],
    rateLimit: RATE_MUTATION,
  },
];

// ─── Settlements ─────────────────────────────────────────────────────────────

const settlementSchema = [
  { name: 'id', type: 'string (uuid)', required: true, description: 'Settlement id.' },
  { name: 'merchantId', type: 'string (uuid)', required: true, description: 'Owning merchant.' },
  { name: 'amountUsdc', type: 'number', required: true, description: 'Amount settled in USDC.' },
  { name: 'amountNgn', type: 'number | null', required: false, description: 'Fiat amount paid out.' },
  { name: 'status', type: 'string', required: true, description: 'One of pending, processing, completed, failed.' },
  { name: 'txHash', type: 'string | null', required: false, description: 'On-chain settlement transaction hash.' },
  { name: 'bankName', type: 'string | null', required: false, description: 'Destination bank for fiat payout.' },
  { name: 'accountNumber', type: 'string | null', required: false, description: 'Masked destination account number.' },
  { name: 'createdAt', type: 'string (ISO 8601)', required: true, description: 'Creation timestamp.' },
];

export const settlementEndpoints: Endpoint[] = [
  {
    id: 'settlements-create',
    title: 'Create a settlement',
    description:
      'Queues a settlement for the authenticated merchant. The settlement engine batches these and enforces per-merchant min/max and daily limits.',
    method: 'POST',
    path: '/api/settlements',
    auth: true,
    requestHeaders: [authHeader, jsonHeader],
    requestBody: [
      { name: 'amountUsdc', type: 'number', required: true, description: 'Amount to settle. Must respect the merchant min/max.', example: '100.00' },
      { name: 'destination', type: 'string', required: false, description: 'Payout destination (bank ref or Stellar address).', example: 'bank_acct_123' },
    ],
    requestExample: { amountUsdc: 100.0, destination: 'bank_acct_123' },
    responseStatus: 201,
    responseSchema: [{ name: 'data', type: 'object', required: true, description: 'The queued settlement.', children: settlementSchema }],
    responseExample: {
      data: { id: '7d5a...', merchantId: '4c1e...', amountUsdc: 100.0, amountNgn: null, status: 'pending', txHash: null, bankName: null, accountNumber: null, createdAt: '2026-07-18T11:00:00.000Z' },
    },
    errors: [
      ...authErrors,
      validationError,
      { status: 403, code: 'FORBIDDEN', description: 'Amount is below the min, above the max, or exceeds the daily limit.' },
    ],
    rateLimit: RATE_MUTATION,
  },
  {
    id: 'settlements-list',
    title: 'List settlements',
    description: 'Returns settlements belonging to the authenticated merchant, newest first.',
    method: 'GET',
    path: '/api/settlements',
    auth: true,
    requestHeaders: [authHeader],
    requestExample: undefined,
    responseStatus: 200,
    responseSchema: [{ name: 'data', type: 'Settlement[]', required: true, description: 'Array of settlements.', children: settlementSchema }],
    responseExample: {
      data: [
        { id: '7d5a...', merchantId: '4c1e...', amountUsdc: 100.0, amountNgn: 165000, status: 'completed', txHash: 'c3d4...', bankName: 'GTBank', accountNumber: '****4321', createdAt: '2026-07-18T11:00:00.000Z' },
      ],
    },
    errors: [...authErrors],
    rateLimit: RATE_GLOBAL,
  },
  {
    id: 'settlements-get',
    title: 'Get a settlement',
    description: 'Fetches a single settlement by id.',
    method: 'GET',
    path: '/api/settlements/:id',
    auth: true,
    requestHeaders: [authHeader],
    pathParams: [{ name: 'id', type: 'string (uuid)', required: true, description: 'Settlement id.', example: '7d5a...' }],
    requestExample: undefined,
    responseStatus: 200,
    responseSchema: [{ name: 'data', type: 'object', required: true, description: 'The settlement.', children: settlementSchema }],
    responseExample: {
      data: { id: '7d5a...', merchantId: '4c1e...', amountUsdc: 100.0, amountNgn: 165000, status: 'completed', txHash: 'c3d4...', bankName: 'GTBank', accountNumber: '****4321', createdAt: '2026-07-18T11:00:00.000Z' },
    },
    errors: [...authErrors, { status: 404, code: 'NOT_FOUND', description: 'No settlement with that id.' }],
    rateLimit: RATE_GLOBAL,
  },
];

// ─── FX & Rates ──────────────────────────────────────────────────────────────

export const fxEndpoints: Endpoint[] = [
  {
    id: 'fx-rates',
    title: 'Get exchange rates',
    description: 'Proxies the FX engine and returns current USDC/fiat rates. The primary USDC→NGN rate is surfaced as `usdcNgn`.',
    method: 'GET',
    path: '/api/rates',
    auth: false,
    requestExample: undefined,
    responseStatus: 200,
    responseSchema: [
      { name: 'usdcNgn', type: 'number', required: false, description: 'Convenience primary USDC→NGN rate.' },
      { name: 'rates', type: 'Rate[]', required: true, description: 'All available currency pairs.', children: [
        { name: 'from', type: 'string', required: true, description: 'Source asset code.' },
        { name: 'to', type: 'string', required: true, description: 'Target currency code.' },
        { name: 'rate', type: 'number', required: true, description: 'Units of `to` per 1 unit of `from`.' },
        { name: 'change', type: 'number', required: true, description: '24h percentage change.' },
        { name: 'trend', type: "'up' | 'down'", required: true, description: 'Direction of the 24h change.' },
      ] },
    ],
    responseExample: {
      usdcNgn: 1650.42,
      rates: [
        { from: 'USDC', to: 'NGN', rate: 1650.42, change: 0.35, trend: 'up' },
        { from: 'USDC', to: 'USD', rate: 1.0, change: 0.0, trend: 'up' },
      ],
    },
    errors: [
      { status: 429, code: 'RATE_LIMITED', description: 'Rate limit exceeded.' },
      { status: 504, code: 'GATEWAY_TIMEOUT', description: 'The upstream FX engine did not respond in time.' },
    ],
    rateLimit: RATE_GLOBAL,
  },
  {
    id: 'fx-quote',
    title: 'Get an FX quote',
    description: 'Returns a converted amount for a specific pair and size, proxied from the FX engine.',
    method: 'GET',
    path: '/api/fx/quote',
    auth: false,
    queryParams: [
      { name: 'from', type: 'string', required: true, description: 'Source asset code.', example: 'USDC' },
      { name: 'to', type: 'string', required: true, description: 'Target currency code.', example: 'NGN' },
      { name: 'amount', type: 'number', required: true, description: 'Amount of `from` to convert.', example: '50' },
    ],
    requestExample: undefined,
    responseStatus: 200,
    responseSchema: [
      { name: 'from', type: 'string', required: true, description: 'Source asset code.' },
      { name: 'to', type: 'string', required: true, description: 'Target currency code.' },
      { name: 'rate', type: 'number', required: true, description: 'Applied conversion rate.' },
      { name: 'amount', type: 'number', required: true, description: 'Input amount.' },
      { name: 'converted', type: 'number', required: true, description: 'Resulting amount in `to`.' },
    ],
    responseExample: { from: 'USDC', to: 'NGN', rate: 1650.42, amount: 50, converted: 82521 },
    errors: [
      { status: 400, code: 'VALIDATION_ERROR', description: 'Missing or invalid from/to/amount.' },
      { status: 504, code: 'GATEWAY_TIMEOUT', description: 'The upstream FX engine did not respond in time.' },
    ],
    rateLimit: RATE_GLOBAL,
  },
];

/** All endpoints keyed by the section id they render under. */
export const endpointsBySection: Record<string, Endpoint[]> = {
  merchants: merchantEndpoints,
  payments: paymentEndpoints,
  settlements: settlementEndpoints,
  'fx-rates': fxEndpoints,
};

export const allEndpoints: Endpoint[] = [
  ...authEndpoints,
  ...merchantEndpoints,
  ...paymentEndpoints,
  ...settlementEndpoints,
  ...fxEndpoints,
];
