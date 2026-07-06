/**
 * CSRF token utilities for double-submit cookie pattern.
 *
 * The server sets a `csrf_token` cookie (non-HttpOnly so JS can read it).
 * The frontend reads that cookie and sends it back in the `X-CSRF-Token`
 * header on every state-changing request. The backend is responsible for
 * verifying the header value matches the cookie value.
 */

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Read the CSRF token from cookies.
 */
export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));

  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

/**
 * Generate a cryptographically random CSRF token (browser & server).
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for Node.js < 19 / edge runtime without web crypto
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
