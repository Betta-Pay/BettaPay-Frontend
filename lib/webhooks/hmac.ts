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

export const SIGNATURE_HEADER = 'X-BettaPay-Signature';
export const TIMESTAMP_HEADER = 'X-BettaPay-Timestamp';
export const EVENT_HEADER = 'X-BettaPay-Event';
