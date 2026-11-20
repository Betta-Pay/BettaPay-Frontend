import { z } from 'zod';

/**
 * Zod schema defining required and optional client-safe environment variables.
 */
export const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().default('https://betta.pay'),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().default(''),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().default(''),
  NEXT_PUBLIC_API_URL: z.string().default(''),
  NEXT_PUBLIC_STELLAR_NETWORK: z.enum(['testnet', 'mainnet', 'public']).default('testnet'),
  NEXT_PUBLIC_STELLAR_HORIZON_URL: z.string().default('https://horizon-testnet.stellar.org'),
  NEXT_PUBLIC_SOROBAN_RPC_URL: z.string().default(''),
  NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: z.string().default(''),
  NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID: z.string().default('CBGBGKJSUY7XYB6HWW4CVAU6MW2KD25FSF45E5KCP53TKUK374MBZNFB'),
  NEXT_PUBLIC_MERCHANT_ADDRESS: z.string().default(''),
  NEXT_PUBLIC_USDT_CONTRACT_ID: z.string().optional(),
  NEXT_PUBLIC_WALLETCONNECT_RELAY_URL: z.string().default('wss://relay.walletconnect.com'),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z
    .string()
    .optional()
    .transform((val) => val?.trim() ?? '')
    .default(''),
  NEXT_PUBLIC_ANCHOR_URL: z.string().default('https://testanchor.stellar.org'),
  NEXT_PUBLIC_BUILD_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Collects process.env NEXT_PUBLIC_* variables into a plain object.
 * Explicit property accesses ensure Next.js build-time inlining works correctly.
 */
export function getRawEnv() {
  return {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
    NEXT_PUBLIC_STELLAR_HORIZON_URL: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL,
    NEXT_PUBLIC_SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
    NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE,
    NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID: process.env.NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID,
    NEXT_PUBLIC_MERCHANT_ADDRESS: process.env.NEXT_PUBLIC_MERCHANT_ADDRESS,
    NEXT_PUBLIC_USDT_CONTRACT_ID: process.env.NEXT_PUBLIC_USDT_CONTRACT_ID,
    NEXT_PUBLIC_WALLETCONNECT_RELAY_URL: process.env.NEXT_PUBLIC_WALLETCONNECT_RELAY_URL,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_ANCHOR_URL: process.env.NEXT_PUBLIC_ANCHOR_URL,
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID,
  };
}

/**
 * Validates an environment object against `envSchema`.
 * Throws a descriptive error listing any missing or invalid keys.
 */
export function validateEnv(input: Record<string, unknown> = getRawEnv()): Env {
  const result = envSchema.safeParse(input);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const missingOrInvalidKeys = Object.keys(fieldErrors);

    const formattedErrors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    const errorMessage = `[Config] ❌ Invalid or missing environment variables:\n${formattedErrors}\nMissing/Invalid keys: ${missingOrInvalidKeys.join(', ')}`;

    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return result.data;
}

// Parse process.env against schema on application boot
const env = validateEnv();

// ─── Site / OAuth ─────────────────────────────────────────────────────────────

/** Canonical public URL used for `metadataBase` and OpenGraph tags. */
export const SITE_URL: string = env.NEXT_PUBLIC_SITE_URL;

/** Google OAuth client ID for `<GoogleOAuthProvider>`. */
export const GOOGLE_CLIENT_ID: string = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// ─── reCAPTCHA ────────────────────────────────────────────────────────────────

/**
 * Google reCAPTCHA v3 site key.
 * An empty string means reCAPTCHA is disabled (e.g. in local/test envs).
 */
export const RECAPTCHA_SITE_KEY: string = env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

// ─── API ──────────────────────────────────────────────────────────────────────

/** Base URL for internal/external API requests from the browser. */
export const API_URL: string = env.NEXT_PUBLIC_API_URL;

// ─── Stellar / Soroban ────────────────────────────────────────────────────────

/** Stellar network name — `'testnet'` or `'mainnet'`. */
export const STELLAR_NETWORK: string = env.NEXT_PUBLIC_STELLAR_NETWORK;

/** Horizon REST API endpoint. */
export const HORIZON_URL: string = env.NEXT_PUBLIC_STELLAR_HORIZON_URL;

/** Soroban RPC endpoint. */
export const SOROBAN_RPC_URL: string = env.NEXT_PUBLIC_SOROBAN_RPC_URL;

/** Network passphrase supplied to `TransactionBuilder`. */
export const STELLAR_NETWORK_PASSPHRASE: string = env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE;

/** Settlement smart-contract address on Soroban. */
export const SETTLEMENT_CONTRACT_ID: string = env.NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID;

/** Merchant Stellar address (per-environment default). */
export const MERCHANT_ADDRESS: string = env.NEXT_PUBLIC_MERCHANT_ADDRESS;

/** USDT Soroban contract address. */
export const USDT_CONTRACT_ID: string | undefined = env.NEXT_PUBLIC_USDT_CONTRACT_ID;

// ─── WalletConnect ────────────────────────────────────────────────────────────

/** WalletConnect v2 relay WebSocket URL. */
export const WALLETCONNECT_RELAY_URL: string = env.NEXT_PUBLIC_WALLETCONNECT_RELAY_URL;

/**
 * WalletConnect v2 project ID from https://cloud.walletconnect.com.
 * Empty when unset or whitespace — the public relay rejects pairing without a
 * real id, so callers must treat empty as a configuration error (issue #500),
 * never as a usable default. See `isWalletConnectConfigured()`.
 */
export const WALLETCONNECT_PROJECT_ID: string = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// ─── Anchor ───────────────────────────────────────────────────────────────────

/** SEP-24 anchor URL for fiat off-ramp flows. */
export const ANCHOR_URL: string = env.NEXT_PUBLIC_ANCHOR_URL;

// ─── RUM / Build ──────────────────────────────────────────────────────────────

/**
 * Build ID injected at build time for Real User Monitoring.
 * Typically set via CI (e.g. `NEXT_PUBLIC_BUILD_ID=$GITHUB_SHA`).
 */
export const BUILD_ID: string | undefined = env.NEXT_PUBLIC_BUILD_ID;
