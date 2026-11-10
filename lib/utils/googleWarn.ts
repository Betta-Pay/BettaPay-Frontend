let hasWarnedMissingGoogleClientId = false;
const emittedDeprecationWarnings = new Set<string>();

export const DEFAULT_MISSING_GOOGLE_CLIENT_ID_WARNING =
  '[BettaPay] Google login is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in.';

export function isProductionEnvironment(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv === 'production';
}

export function shouldWarnMissingGoogleClientId(): boolean {
  if (isProductionEnvironment()) return false;
  if (hasWarnedMissingGoogleClientId) return false;
  hasWarnedMissingGoogleClientId = true;
  return true;
}

/**
 * Logs a development-only warning for a missing Google OAuth client ID at most
 * once per session, and suppresses it completely in production builds.
 */
export function warnMissingGoogleClientId(
  message: string = DEFAULT_MISSING_GOOGLE_CLIENT_ID_WARNING,
): boolean {
  if (!shouldWarnMissingGoogleClientId()) return false;
  // eslint-disable-next-line no-console
  console.warn(message);
  return true;
}

/**
 * Logs a development-only Google / SDK deprecation warning at most once per
 * warning key, suppressing output in production builds.
 */
export function warnDevDeprecation(key: string, message: string): boolean {
  if (isProductionEnvironment()) return false;
  if (emittedDeprecationWarnings.has(key)) return false;
  emittedDeprecationWarnings.add(key);
  // eslint-disable-next-line no-console
  console.warn(message);
  return true;
}

export function __resetGoogleWarnForTests() {
  hasWarnedMissingGoogleClientId = false;
  emittedDeprecationWarnings.clear();
}
