/**
 * Deterministic client identity and sampling for RUM.
 *
 * - Generates a random opaque ID stored in sessionStorage (not localStorage,
 *   so it does not persist across tabs indefinitely and is cleared on logout).
 * - Never derives the ID from email, username, IP, device fingerprint, or any
 *   other PII.
 * - Sampling is deterministic: for a given clientId and a given session window,
 *   the same client always produces the same sample decision.
 */

const CLIENT_ID_KEY = 'bp_rum_cid';

/** Default RUM session sample rate when `NEXT_PUBLIC_RUM_SAMPLE_RATE` is unset. */
export const DEFAULT_RUM_SAMPLE_RATE = 0.1;

/**
 * Reads and validates `NEXT_PUBLIC_RUM_SAMPLE_RATE` (float in `[0, 1]`).
 * Values outside `[0, 1]` are clamped; malformed or empty values fall back to
 * `DEFAULT_RUM_SAMPLE_RATE`.
 */
export function getConfiguredSampleRate(
  rawValue: string | undefined = process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE,
): number {
  if (rawValue === undefined || rawValue.trim() === '') {
    return DEFAULT_RUM_SAMPLE_RATE;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_RUM_SAMPLE_RATE;
  }
  return Math.min(1, Math.max(0, parsed));
}

/**
 * Get or create a random opaque client identifier.
 * Stored in sessionStorage to limit cross-tab persistence.
 */
export function getClientId(): string {
  if (typeof window === 'undefined') return '';

  try {
    let id = sessionStorage.getItem(CLIENT_ID_KEY);
    if (id) return id;

    // Generate 16 random bytes → 32 hex chars
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

    sessionStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    // sessionStorage may be unavailable (private browsing, quota, etc.)
    return '';
  }
}

/**
 * Simple deterministic hash for sampling decisions.
 * Uses a basic DJB2 hash — not cryptographic, but sufficient for
 * non-adversarial sampling.
 */
export function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash >>> 0; // Ensure non-negative
}

/**
 * Deterministic sample decision for a given client and time window.
 *
 * @param clientId - Opaque client identifier
 * @param sampleRate - Float between 0 and 1 (1 = always sample)
 * @param windowMs - Time window in ms (default 60000 = 1 minute)
 * @returns true if this client should be sampled in the current window
 */
export function shouldSample(
  clientId: string,
  sampleRate: number = getConfiguredSampleRate(),
  windowMs: number = 60000
): boolean {
  if (!clientId) return false;
  if (sampleRate <= 0) return false;
  if (sampleRate >= 1) return true;

  const windowKey = Math.floor(Date.now() / windowMs).toString();
  const hash = djb2Hash(clientId + windowKey);
  const bucket = (hash % 10000) / 10000;

  return bucket < sampleRate;
}
