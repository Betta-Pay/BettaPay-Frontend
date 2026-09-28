/**
 * Stellar address utilities.
 *
 * These utilities encapsulate Stellar address validation and manipulation.
 * They are designed to be shared between frontend and backend via the
 * @bettapay/stellar-utils package.
 *
 * TODO: Once @bettapay/stellar-utils is published, replace this with:
 *   import { isValidStellarAddress, extractStellarAddress } from '@bettapay/stellar-utils';
 */

const STELLAR_ADDRESS_PREFIX_REGEX = /^stellar:[a-z]+:/i;
const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;

/**
 * Validates whether a string is a valid Stellar public key (address).
 * Valid addresses are 56-character strings starting with 'G' (G-address format).
 */
export function isValidStellarAddress(address: string): boolean {
  return STELLAR_PUBLIC_KEY_REGEX.test(address);
}

/**
 * Extracts a Stellar public key from a CAIP-2 formatted account identifier.
 *
 * Converts:
 *   "stellar:testnet:GAXY...7QF" → "GAXY...7QF"
 *   "stellar:mainnet:GAXY...7QF" → "GAXY...7QF"
 *   "GAXY...7QF" → "GAXY...7QF"
 */
export function extractStellarAddress(accountId: string): string {
  return accountId.replace(STELLAR_ADDRESS_PREFIX_REGEX, '');
}

/**
 * Validates and extracts Stellar addresses from a list of CAIP-2 account identifiers.
 * Returns only valid addresses, filtering out invalid ones.
 */
export function extractValidStellarAddresses(accountIds: string[]): string[] {
  return accountIds
    .map(extractStellarAddress)
    .filter((address) => address.length > 0 && isValidStellarAddress(address));
}

const MAX_PUBLIC_KEY_LENGTH = 56;

/**
 * Reduces an untrusted account string to characters a Stellar public key can
 * contain (base32 alphabet: A–Z, 2–7) and caps it at key length. React already
 * escapes text nodes, but this keeps markup, control characters, bidi
 * overrides or memo-style payloads out of the UI and out of attributes like
 * `aria-label` if the data source ever changes.
 */
export function toDisplaySafeStellarAddress(address: string): string {
  return address
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '')
    .slice(0, MAX_PUBLIC_KEY_LENGTH);
}

/** Shortens a public key to `GABCDEFG...XYZ123` after making it display-safe. */
export function shortenStellarAddress(address: string, head = 8, tail = 6): string {
  const safe = toDisplaySafeStellarAddress(address);
  if (safe.length <= head + tail) return safe;
  return `${safe.slice(0, head)}...${safe.slice(-tail)}`;
}
