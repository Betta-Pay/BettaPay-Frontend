/**
 * HMAC-SHA256 signing for webhook deliveries. Uses WebCrypto only so the same
 * code runs in the browser (signature preview) and in Node route handlers.
 */

const encoder = new TextEncoder();

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Signature over `${timestamp}.${body}`, sent as `X-BettaPay-Signature`. */
export function signPayload(secret: string, timestamp: string | number, body: string): Promise<string> {
  return hmacSha256Hex(secret, `${timestamp}.${body}`);
}

export const SIGNATURE_PREFIX = 'sha256=';

/**
 * Canonical string that is actually signed. The timestamp is part of the
 * input so a captured signature cannot be replayed against a different
 * delivery without also rewriting the (untrusted) timestamp header.
 */
export function canonicalSignatureInput(timestamp: string | number, body: string): string {
  return `${timestamp}.${body}`;
}

/** Strip the optional `sha256=` prefix and normalise casing/whitespace. */
export function normalizeSignature(signature: string): string {
  const trimmed = signature.trim();
  const withoutPrefix = trimmed.toLowerCase().startsWith(SIGNATURE_PREFIX)
    ? trimmed.slice(SIGNATURE_PREFIX.length)
    : trimmed;
  return withoutPrefix.trim().toLowerCase();
}

/**
 * Compare two strings without leaking where they differ through early exits.
 * The length difference is folded into the accumulator instead of returning
 * early, and every byte of both values is always visited.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return difference === 0;
}

export interface VerifyWebhookSignatureOptions {
  secret: string;
  payload: string;
  timestamp: string | number;
  /** The raw `X-BettaPay-Signature` header value. */
  signature: string;
}

export interface WebhookSignatureVerification {
  valid: boolean;
  reason: string | null;
  /** `${timestamp}.${payload}` — the exact string that was signed. */
  canonical: string;
  /** Recomputed value, always with the `sha256=` prefix. */
  computedSignature: string;
  /** Provided value normalised to `sha256=<hex>`, or empty when absent. */
  providedSignature: string;
  /** Index of the first differing hex character, when the values mismatch. */
  firstMismatchIndex: number | null;
}

function firstMismatchIndex(computed: string, provided: string): number | null {
  if (computed === provided) return null;
  const length = Math.max(computed.length, provided.length);
  for (let index = 0; index < length; index += 1) {
    if (computed[index] !== provided[index]) return index;
  }
  return null;
}

/**
 * Verify a webhook signature over the canonical `${timestamp}.${rawBody}`
 * string using a constant-time comparison. Payloads are treated as opaque
 * strings: an empty or non-JSON body is still signed/verified over its exact
 * bytes, so callers must pass the raw request body rather than re-serialised
 * JSON.
 */
export async function verifyWebhookSignature({
  secret,
  payload,
  timestamp,
  signature,
}: VerifyWebhookSignatureOptions): Promise<WebhookSignatureVerification> {
  const canonical = canonicalSignatureInput(timestamp, payload);
  const providedHex = normalizeSignature(signature);
  const providedSignature = providedHex ? `${SIGNATURE_PREFIX}${providedHex}` : '';

  // WebCrypto refuses zero-length HMAC keys, so validate the inputs before
  // attempting to import the secret.
  if (!secret) {
    return {
      valid: false,
      reason: 'Missing signing secret.',
      canonical,
      computedSignature: '',
      providedSignature,
      firstMismatchIndex: null,
    };
  }

  if (String(timestamp).trim() === '') {
    return {
      valid: false,
      reason: 'Missing timestamp.',
      canonical,
      computedSignature: '',
      providedSignature,
      firstMismatchIndex: null,
    };
  }

  const computedHex = await hmacSha256Hex(secret, canonical);
  const computedSignature = `${SIGNATURE_PREFIX}${computedHex}`;
  const mismatchIndex = firstMismatchIndex(computedHex, providedHex);

  const base = {
    canonical,
    computedSignature,
    providedSignature,
    firstMismatchIndex: mismatchIndex,
  };

  if (!providedHex) {
    return { ...base, valid: false, reason: 'Missing signature header.' };
  }

  const valid = constantTimeEqual(computedHex, providedHex);

  return {
    ...base,
    valid,
    reason: valid ? null : 'Signature does not match the payload.',
  };
}

export const SIGNATURE_HEADER = 'X-BettaPay-Signature';
export const TIMESTAMP_HEADER = 'X-BettaPay-Timestamp';
export const EVENT_HEADER = 'X-BettaPay-Event';
