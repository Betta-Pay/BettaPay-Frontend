# Admin operations consoles

The shared admin layout checks the backend session before rendering. Each console
also gates client queries on the hydrated administrator session. New Next.js API
handlers call `guardAdminApi` and forward requests to `NEXT_PUBLIC_API_URL`, with
cookies and CSRF headers. Mutations additionally use the existing CSRF verifier.
Responses are never cached and rate-limit headers are preserved. An unavailable
service produces an error with retry controls; these consoles do not use fixtures.

This frontend repository does not contain the persistent merchant database,
AuditLog, SettlementBatch, or fx-engine. Deployment requires the backend endpoints
below. The contracts describe the data consumed by this implementation; they are
not a claim that a backend deployment already implements them. Backend mutations
must enforce permissions independently, derive the actor from the session, and
write their audit entries in the same transaction as their state changes.

## Merchant management

`/merchants` supports search, status, and KYC filters, cursor pagination, selection
of up to 100 merchants, and confirmed suspend/activate/reviewer actions.
`/merchants?merchantId=<id>` opens that merchant's profile and audit drawer, including
when linked from compliance history. `/merchants/kyb` remains the document review
entry point.

Backend contracts:

- `GET /api/admin/merchants?limit=25&cursor=...&search=...&status=...&kycStatus=...`
  returns `{ data: AdminMerchant[], nextCursor: string | null }`.
- `GET /api/admin/merchants/:id` returns `{ data: AdminMerchant }`, including
  `auditLog`. The shape is defined in `lib/admin/types.ts`. Payment and settlement
  counts must come from stored relationships; `lastActivity` comes from AuditLog.
- `POST /api/admin/merchants/actions` accepts `{ merchantIds, action, reviewerId? }`.
  Actions are `suspend`, `activate`, and `assign_reviewer`. Reviewer assignment
  requires a valid eligible reviewer ID. The backend validates reviewer eligibility.
  It may return `{ results: [{ id, success, error? }] }` for partial success; without
  results, a successful response means the entire operation succeeded atomically.

A suspension must be enforced by the backend payment service for future payments.
The frontend invalidates payment, settlement, merchant, compliance, and overview
queries after successful actions. It does not alter historical payment statuses.
The merchant drawer displays the backend suspension audit entry on refetch.

## Platform ledger

The canonical route is `/admin/transactions`, matching the existing navigation.
Filters (`merchantId`, `status`, `asset`, `from`, `to`, `batchId`) and sorting (`sort`,
`order`) persist in the URL. Dates use inclusive UTC day boundaries. TanStack Table
uses transaction IDs, server sorting, and a virtual scroll viewport; cursor pages
are appended without rendering all loaded rows. Duplicate IDs are deduplicated,
and repeated cursors stop pagination. Refresh is configurable and pauses on hidden
tabs. Returning to a visible tab refreshes stale data.

`GET /api/admin/transactions` accepts these filters, `limit` (up to 100), and
`cursor`. It returns `{ data: AdminTransaction[], nextCursor }`. The backend must
apply all filters and the global sort before pagination, use a stable ID tie-breaker,
and issue cursors compatible with the active filters/sort. IDs must be unique
across payments and settlements. `kind` identifies `payment` or `settlement`.
Transactions include the existing `ApiPayment` fields, an `asset`, and optionally:

```ts
settlementBatch: {
  id: string; status: string; paymentCount: number; amountUsdc: number;
  createdAt: string; txHash?: string | null;
} | null;
feeSnapshot: {
  feeBps: number; feeAmountUsdc: number; netAmountUsdc: number; source?: string;
} | null;
```

The existing TransactionDrawer shows these relationships and links the batch ID
back to the filtered ledger. Fee snapshots must represent the rule applied when
processing the transaction, rather than today's fee configuration.

## FX management

`/fx-management` polls every 20 seconds while visible, preserves previously loaded
data through refetch errors, and renders selected-pair history using FxRateChart.
The override panel requires a positive rate, a reason, and an expiry within 24 hours.
An override is flagged with a countdown, stops being presented as active at expiry,
and triggers a board refresh. Expiry enforcement belongs to the backend: browser
timers must never determine the rate used by the payment service.

Backend contracts:

- `GET /api/rates`: `{ rates: [{ from, to, rate, updatedAt, source, deviationPct,
  staleAfterMs?, override?: { rate, expiresAt, reason } | null }] }`.
  `deviationPct` may be null when no reference is available. `updatedAt` and
  `expiresAt` are ISO timestamps. The board defaults to a 60-second stale threshold.
- `GET /api/admin/fx/health`: `{ circuitBreaker: { state, reason?, updatedAt },
  fallbackEvents: [{ id, from, to, source, reason, createdAt }] }`.
- `GET /api/rates/history?from=USDC&to=NGN`: `{ data: [{ date, rate }] }` in
  chronological order. An empty array renders an empty state, without sample data.
- `POST /api/admin/fx/overrides`: `{ from, to, rate, expiresAt, reason }`. The backend
  persists the override and audit entry and returns success only after committing.
  `/api/rates` must expose the effective override and remove it when expired.

The browser uses guarded `/api/admin/fx/*` Next.js routes for these operations.

## Compliance

`/compliance` polls each independently guarded source, so a failed source does not
hide successful sections. IP values, risk signals, and incident text are rendered
only as returned by the backend. There is no external enrichment or inferred PII.

`GET /api/admin/auth/ip-score` returns `{ data: [{ ip, score, failedAttempts,
retryAfterUntil: string | null }] }`. The UI displays each IP's retry deadline and
an endpoint-level countdown when the service responds with HTTP 429/Retry-After.
The proxy preserves delta seconds and normalizes HTTP-date Retry-After values for
the shared API client.

The remaining backend routes use `/api/admin/compliance/<resource>` and return
`{ data: [...], windowStart?, windowEnd?, truncated? }`:

| Resource | Row fields |
| --- | --- |
| `failed-logins` | `id, ip, merchantId?, createdAt` |
| `suspensions` | `id, merchantId, action, createdAt, note` |
| `webhook-failures` | `merchantId, failed, total, failureRate` |
| `risk-queue` | `merchantId, businessName, failedAuthCount, chargebackRate, failureRate, flags[]` |
| `incidents` | `id, merchantId, type, severity, status, createdAt, summary` |

Rates are percentage points (for example, `3.2` means 3.2%). Risk flags may include
sanctions-related findings supplied by the backend. Risk thresholds, reporting
windows, and queue membership are backend policy. Failed-auth charts group the
returned window by UTC day and show the top 20 IPs by event count. The backend must
mark truncated windows explicitly.

Incident filters apply to the loaded rows. CSV uses `buildCsv`, follows exactly the
visible row order, includes the same fields as the table, and neutralizes spreadsheet
formula prefixes. Exports never silently include additional hidden/unloaded records.

## Validation status

Tests, builds, linters, formatters, type checking, dependency installation, and local
CI execution were deliberately not run for this implementation, as instructed.
Review was limited to reading source files and the final Git diff. Backend contract
compatibility and runtime behavior remain unverified.
