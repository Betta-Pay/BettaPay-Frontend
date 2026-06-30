# ADR 003: Payment infrastructure on Stellar + Soroban

## Status

Accepted

## Context

BettaPay is a merchant payment product. The core requirement is moving value
(stablecoin payments) between a payer and a merchant cheaply, quickly, and with
on-chain auditability, while integrating with local on/off-ramps for fiat.

Constraints and forces:

- **Low fees.** A payments product cannot pass high per-transaction network fees
  on to merchants and stay competitive.
- **Fast settlement.** Merchants expect near-real-time confirmation, not minutes
  to hours.
- **Fiat on/off-ramp.** We need a standard way to integrate regulated anchors
  for currency exchange and cash-in/cash-out.
- **Programmability.** We want to attach payment metadata / references on chain
  for reconciliation, which calls for smart-contract support.
- **Usable wallets.** Payers need a low-friction browser wallet.

Alternatives considered included general-purpose smart-contract chains
(e.g. EVM L1/L2s), which offer rich tooling but historically higher and more
volatile fees, slower finality, and no built-in anchor standard for fiat ramps.

**Stellar** is purpose-built for payments: sub-cent fees, ~5-second settlement,
and the **SEP** standards family — notably **SEP-24** for interactive anchor
deposits/withdrawals (fiat on/off-ramp). **Soroban**, Stellar's smart-contract
platform, lets us store payment references on chain. **Freighter** provides a
well-supported browser wallet with a clean signing API.

## Decision

Build payment infrastructure on **Stellar**, using **Soroban** contracts for
payment-reference storage and **Freighter** as the payer wallet.

Concretely:

- **SDKs.** `@stellar/stellar-sdk` for transaction building, XDR handling, and
  Soroban contract interaction; `@stellar/freighter-api` for wallet connection
  and signing.
- **Networks.** Default to **Testnet**, overridable via the
  `NEXT_PUBLIC_STELLAR_NETWORK` environment variable. Network configuration
  (Horizon URL, Soroban RPC URL, network passphrases) lives in
  [`lib/utils/constants.ts`](../../lib/utils/constants.ts):
  - Horizon: `https://horizon-testnet.stellar.org`
  - Soroban RPC: `https://soroban-testnet.stellar.org`
- **Payment flow.** In [`app/pay/[linkId]/page.tsx`](../../app/pay), a
  transaction is built with `TransactionBuilder` and invokes a Soroban contract
  via `Contract(contractId).call("store_payment_reference", …)`, passing the
  merchant address, a reference hash, and the amount in stroops (10^7 stroops per
  unit). The transaction is prepared, signed through Freighter, and submitted.
- **Wallet integration.** [`lib/stellar/freighter.ts`](../../lib/stellar/freighter.ts)
  wraps Freighter with explicit error types — `FreighterNotInstalledError`,
  `FreighterCancelledError`, and `FreighterNetworkMismatchError` — the last of
  which detects when the wallet's network does not match the app's configured
  network.
- **Fiat ramp.** SEP-24-compliant anchors provide FX rates and on/off-ramp; an
  admin `/anchors` route manages anchor configuration and the FX flow consumes
  anchor rates.

## Consequences

**Positive**

- Very low fees and fast (~5s) settlement, appropriate for a merchant payments
  product.
- SEP-24 gives a standardised path to regulated fiat on/off-ramps instead of a
  bespoke integration per provider.
- Soroban lets us anchor payment references on chain for reconciliation and
  auditability.
- Freighter is a mature browser wallet with a clean signing API and good UX.
- Network is environment-driven, so promoting from Testnet to Public/mainnet is
  a configuration change, not a code change.

**Negative / trade-offs**

- Smaller smart-contract developer ecosystem than EVM chains; fewer libraries,
  examples, and audited contract templates for Soroban.
- Soroban and the SEP standards are evolving; SDK upgrades can introduce
  breaking changes that require maintenance.
- Payers must install the Freighter extension, which adds onboarding friction
  compared to a fully custodial flow.
- Network-mismatch and wallet-availability are real failure modes that the UI
  must handle explicitly (hence the dedicated Freighter error classes).

## Related

- [ADR 001: State management with Zustand](001-state-management.md) — wallet
  connection state lives in `walletStore`.
