/**
 * JWT inspection helpers.
 *
 * ## Trust boundary
 *
 * A browser cannot verify a JWT signature: doing so requires the signing
 * secret for HMAC algorithms, or a trusted public key for RSA and ECDSA, and
 * shipping either to the client would defeat the point. Everything in this
 * module therefore treats the token as **unverified input**.
 *
 * These helpers exist to fail fast on tokens that are obviously unusable —
 * malformed, unsigned, `alg: none`, or already expired — so the UI does not
 * act on a dead session and wait for an API 401 to find out. They are NOT an
 * authorization mechanism.
 *
 * **Never derive identity, role, or permissions from the returned payload.**
 * The server is the source of truth for the session: create it through
 * `/api/auth/session` and read the confirmed profile back from the backend.
 */

/** Why a token was rejected. */
export type JwtDecodeErrorCode =
  | 'malformed'
  | 'unsupported_alg'
  | 'missing_signature'
  | 'missing_expiry'
  | 'expired'
  | 'not_yet_valid'
  | 'issuer_mismatch';

export interface JwtClaims {
  exp?: number;
  nbf?: number;
  iat?: number;
  iss?: string;
  [claim: string]: unknown;
}

export type JwtDecodeResult =
  | { ok: true; payload: JwtClaims }
  | { ok: false; error: JwtDecodeErrorCode; message: string };

export interface DecodeJwtOptions {
  /** Reject tokens whose `iss` does not match. Defaults to NEXT_PUBLIC_JWT_ISSUER. */
  expectedIssuer?: string;
  /** Seconds of clock skew tolerated on `exp` / `nbf`. Defaults to 30. */
  clockToleranceSeconds?: number;
  /** Treat a token with no `exp` as valid. Defaults to false — expiry is required. */
  allowMissingExpiry?: boolean;
}

const DEFAULT_CLOCK_TOLERANCE_SECONDS = 30;

/** Algorithms we accept in the header. `none` is rejected outright. */
const SUPPORTED_ALGORITHMS: ReadonlySet<string> = new Set([
  'HS256', 'HS384', 'HS512',
  'RS256', 'RS384', 'RS512',
  'ES256', 'ES384', 'ES512',
  'PS256', 'PS384', 'PS512',
]);

function fail(error: JwtDecodeErrorCode, message: string): JwtDecodeResult {
  return { ok: false, error, message };
}

export function base64UrlDecode(base64Url: string): string | null {
  if (typeof base64Url !== 'string') return null;

  try {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    if (typeof atob === 'function') {
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }

    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf-8');
    }

    return null;
  } catch {
    return null;
  }
}

function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    const decoded = base64UrlDecode(segment);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Decode and sanity-check a JWT without verifying its signature.
 *
 * Returns `{ ok: false, error }` — it never throws — for tokens that are
 * malformed, unsigned, use `alg: none`, carry no expiry, have expired, are not
 * yet valid, or come from an unexpected issuer.
 *
 * A successful result means only "this token is well-formed and unexpired".
 * It does **not** mean the token is authentic. See the trust-boundary note at
 * the top of this file.
 */
export function decodeJwtPayload(
  token: string,
  options: DecodeJwtOptions = {}
): JwtDecodeResult {
  if (typeof token !== 'string' || token.length === 0) {
    return fail('malformed', 'Invalid JWT: token is empty');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return fail('malformed', 'Invalid JWT: expected 3 parts');
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;

  // An empty signature is the `alg: none` forgery in its most direct form.
  if (!signatureSegment) {
    return fail('missing_signature', 'Invalid JWT: signature segment is empty');
  }

  const header = decodeSegment(headerSegment);
  if (!header) {
    return fail('malformed', 'Invalid JWT: header is not valid JSON');
  }

  const alg = typeof header.alg === 'string' ? header.alg : '';
  if (!alg || alg.toLowerCase() === 'none' || !SUPPORTED_ALGORITHMS.has(alg.toUpperCase())) {
    return fail('unsupported_alg', `Invalid JWT: unsupported algorithm "${alg || 'missing'}"`);
  }

  const payload = decodeSegment(payloadSegment);
  if (!payload) {
    return fail('malformed', 'Invalid JWT: payload is not valid JSON');
  }

  const claims = payload as JwtClaims;
  const tolerance = options.clockToleranceSeconds ?? DEFAULT_CLOCK_TOLERANCE_SECONDS;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) {
    if (!options.allowMissingExpiry) {
      return fail('missing_expiry', 'Invalid JWT: no expiry claim');
    }
  } else if (claims.exp + tolerance <= nowSeconds) {
    return fail('expired', 'Session has expired. Please sign in again.');
  }

  if (typeof claims.nbf === 'number' && Number.isFinite(claims.nbf)) {
    if (claims.nbf - tolerance > nowSeconds) {
      return fail('not_yet_valid', 'Invalid JWT: token is not yet valid');
    }
  }

  const expectedIssuer = options.expectedIssuer ?? process.env.NEXT_PUBLIC_JWT_ISSUER;
  if (expectedIssuer && claims.iss !== expectedIssuer) {
    return fail('issuer_mismatch', 'Invalid JWT: unexpected issuer');
  }

  return { ok: true, payload: claims };
}

/**
 * Whether a token is unusable right now — malformed, unsigned, or expired.
 *
 * Used to drop a dead session before a request goes out, instead of waiting
 * for the API to answer 401.
 */
export function isJwtExpiredOrInvalid(token: string | null | undefined): boolean {
  if (!token) return true;
  return !decodeJwtPayload(token).ok;
}
