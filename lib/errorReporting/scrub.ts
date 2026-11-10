/**
 * PII scrubbing for error payloads.
 *
 * Error messages and stack traces routinely embed the very values we must not
 * ship to a reporting backend: the email a login failed for, the Stellar
 * address a transaction was built against, the JWT an interceptor rejected,
 * the query string of the failing request. Everything that leaves the browser
 * goes through `scrubText` first.
 */

/** Hard caps so one pathological stack cannot blow out a batch. */
export const MAX_MESSAGE_LENGTH = 512;
export const MAX_STACK_LENGTH = 4096;
export const MAX_COMPONENT_STACK_LENGTH = 2048;

const REDACTIONS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  // Email addresses
  { pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: '[email]' },
  // Bearer tokens in Authorization headers or error dumps (must run before JWT rule so `Bearer <jwt>` becomes `Bearer [REDACTED]`)
  {
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
    replacement: 'Bearer [REDACTED]',
  },
  // JWTs (header.payload.signature)
  {
    pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
    replacement: '[jwt]',
  },
  // Stellar secret seeds / private keys (56 chars starting with S)
  { pattern: /\bS[A-Z0-9]{55}\b/g, replacement: '[REDACTED]' },
  // Stellar public keys / muxed addresses (base32)
  { pattern: /\b(?:G[A-Z2-7]{55}|M[A-Z2-7]{68})\b/g, replacement: '[stellar-key]' },
  // Password, secret, private key, and API key fields in JSON / key-value / header dumps
  {
    pattern:
      /(['"]?(?:password|passwd|pwd|secret|private_?key|api_?key|access_?token|refresh_?token|client_?secret)['"]?\s*[:=]\s*)(?:'[^']*'|"[^"]*"|[^\s"',;}]+)/gi,
    replacement: '$1[REDACTED]',
  },
  // Long hex blobs — tx hashes, secrets, session ids
  { pattern: /\b[a-fA-F0-9]{32,}\b/g, replacement: '[hex]' },
  // Token and api keys in headers (space-separated)
  { pattern: /\b(token|apikey|api_key)\s+\S+/gi, replacement: '$1 [REDACTED]' },
  // Card-shaped digit runs
  { pattern: /\b\d{13,19}\b/g, replacement: '[number]' },
];

/**
 * Strip the query string and fragment from any URL appearing in the text,
 * keeping the path so the failing endpoint stays identifiable.
 */
function stripUrlParams(text: string): string {
  return text.replace(/(https?:\/\/[^\s)'"]+?)[?#][^\s)'"]*/g, '$1');
}

/**
 * Redact PII from arbitrary error text and truncate it.
 *
 * Safe to call on any string, including empty or non-string input.
 */
export function scrubText(input: unknown, maxLength = MAX_MESSAGE_LENGTH): string {
  if (typeof input !== 'string' || input.length === 0) return '';

  let text = stripUrlParams(input);

  for (const { pattern, replacement } of REDACTIONS) {
    text = text.replace(pattern, replacement);
  }

  if (text.length > maxLength) {
    text = `${text.slice(0, maxLength)}…[truncated]`;
  }

  return text;
}

/**
 * Scrub a stack trace. Local file paths are kept (they are build artefacts,
 * not user data) but any embedded credentials or identifiers are redacted.
 */
export function scrubStack(stack: unknown): string | undefined {
  const scrubbed = scrubText(stack, MAX_STACK_LENGTH);
  return scrubbed || undefined;
}

/**
 * DJB2 hash — non-cryptographic, used only to group identical errors.
 */
export function fingerprint(parts: ReadonlyArray<string>): string {
  const str = parts.join('|');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
