/**
 * Client-safe runtime configuration module.
 *
 * ALL `process.env.NEXT_PUBLIC_*` reads in the application MUST go through
 * this file. Centralising them here has two benefits:
 *
 *  1. A single place to audit which env vars affect public pages.
 *  2. Next.js inlines `process.env.NEXT_PUBLIC_*` at build time, so the
 *     values baked into the prerendered HTML and the values the client JS
 *     uses are always identical — eliminating SSR/client hydration mismatches
 *     caused by reading the same variable in two different places.
 *
 * Rules:
 *  - This module must NEVER import from `next/headers`, `next/cookies`, or
 *    any other server-only module. It must be safe to import in any context
 *    (server component, client component, API route, test).
 *  - Do NOT add non-NEXT_PUBLIC_ variables here; those are server-only secrets
 *    and belong in dedicated server-side modules.
 *  - Never add conditional logic that branches on user-role cookies or request
 *    headers; public pages must be stateless with respect to the requester.
 */

// ─── Site / OAuth ─────────────────────────────────────────────────────────────

/** Canonical public URL used for `metadataBase` and OpenGraph tags. */
export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://betta.pay';

/** Google OAuth client ID for `<GoogleOAuthProvider>`. */
export const GOOGLE_CLIENT_ID: string =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// ─── reCAPTCHA ────────────────────────────────────────────────────────────────

/**
 * Google reCAPTCHA v3 site key.
 * An empty string means reCAPTCHA is disabled (e.g. in local/test envs).
 */
export const RECAPTCHA_SITE_KEY: string =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

// ─── API ──────────────────────────────────────────────────────────────────────

/** Base URL for internal/external API requests from the browser. */
export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL || '';

// ─── Stellar / Soroban ────────────────────────────────────────────────────────

/** Stellar network name — `'testnet'` or `'mainnet'`. */
export const STELLAR_NETWORK: string =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';

/** Horizon REST API endpoint. */
export const HORIZON_URL: string =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
  'https://horizon-testnet.stellar.org';

/** Soroban RPC endpoint. */
export const SOROBAN_RPC_URL: string =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || '';

/** Network passphrase supplied to `TransactionBuilder`. */
export const STELLAR_NETWORK_PASSPHRASE: string =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || '';

/** Settlement smart-contract address on Soroban. */
export const SETTLEMENT_CONTRACT_ID: string =
  process.env.NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID ||
  'CBGBGKJSUY7XYB6HWW4CVAU6MW2KD25FSF45E5KCP53TKUK374MBZNFB';

/** Merchant Stellar address (per-environment default). */
export const MERCHANT_ADDRESS: string =
  process.env.NEXT_PUBLIC_MERCHANT_ADDRESS || '';

/** USDT Soroban contract address. */
export const USDT_CONTRACT_ID: string | undefined =
  process.env.NEXT_PUBLIC_USDT_CONTRACT_ID;

// ─── WalletConnect ────────────────────────────────────────────────────────────

/** WalletConnect v2 relay WebSocket URL. */
export const WALLETCONNECT_RELAY_URL: string =
  process.env.NEXT_PUBLIC_WALLETCONNECT_RELAY_URL ||
  'wss://relay.walletconnect.com';

/** WalletConnect v2 project ID. */
export const WALLETCONNECT_PROJECT_ID: string =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// ─── Anchor ───────────────────────────────────────────────────────────────────

/** SEP-24 anchor URL for fiat off-ramp flows. */
export const ANCHOR_URL: string =
  process.env.NEXT_PUBLIC_ANCHOR_URL || 'https://testanchor.stellar.org';

// ─── RUM / Build ──────────────────────────────────────────────────────────────

/**
 * Build ID injected at build time for Real User Monitoring.
 * Typically set via CI (e.g. `NEXT_PUBLIC_BUILD_ID=$GITHUB_SHA`).
 */
export const BUILD_ID: string | undefined =
  process.env.NEXT_PUBLIC_BUILD_ID;
