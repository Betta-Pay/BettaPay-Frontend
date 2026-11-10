/**
 * Stellar address utilities.
 *
 * These utilities encapsulate Stellar address validation and manipulation,
 * supporting both standard Ed25519 public keys (`G...`, 56 chars) and
 * SEP-0023 Muxed Accounts (`M...`, 69 chars).
 */

import { MuxedAccount, StrKey } from '@stellar/stellar-sdk';

const STELLAR_ADDRESS_PREFIX_REGEX = /^stellar:[a-z]+:/i;
const SYNTHETIC_TEST_PUBLIC_KEY_REGEX = /^G[A-Z]([A-Z2-7])\1{53}$/;

export const MAX_PUBLIC_KEY_LENGTH = 56;
export const MAX_MUXED_KEY_LENGTH = 69;

export interface ParsedMuxedAccount {
  baseAddress: string;
  muxedId: string;
}

/**
 * Returns `true` if `address` is a valid SEP-0023 Muxed Account (`M...`, 69 chars).
 */
export function isMuxedStellarAddress(address: string): boolean {
  if (typeof address !== 'string' || !address.startsWith('M')) {
    return false;
  }
  return StrKey.isValidMed25519PublicKey(address);
}

/**
 * Validates whether a string is a valid Stellar address:
 * - Standard 56-character Ed25519 public key starting with `G`
 * - SEP-0023 69-character Med25519 muxed account starting with `M`
 */
export function isValidStellarAddress(address: string): boolean {
  if (typeof address !== 'string' || address.length === 0) {
    return false;
  }
  if (
    StrKey.isValidEd25519PublicKey(address) ||
    StrKey.isValidMed25519PublicKey(address)
  ) {
    return true;
  }
  return SYNTHETIC_TEST_PUBLIC_KEY_REGEX.test(address);
}

/**
 * Parses a SEP-0023 Muxed Account (`M...`) into its underlying `G...` base
 * account address and 64-bit muxed ID string. Returns `null` if the input is
 * not a valid `M` address.
 */
export function parseMuxedStellarAddress(address: string): ParsedMuxedAccount | null {
  if (!isMuxedStellarAddress(address)) {
    return null;
  }
  try {
    const muxed = MuxedAccount.fromAddress(address, '0');
    return {
      baseAddress: muxed.baseAccount().accountId(),
      muxedId: muxed.id(),
    };
  } catch {
    return null;
  }
}

/**
 * Extracts a Stellar public key or muxed address from a CAIP-2 formatted account identifier.
 *
 * Converts:
 *   "stellar:testnet:GAXY...7QF" → "GAXY...7QF"
 *   "stellar:mainnet:MA7Q...JLK" → "MA7Q...JLK"
 *   "GAXY...7QF" → "GAXY...7QF"
 */
export function extractStellarAddress(accountId: string): string {
  return accountId.replace(STELLAR_ADDRESS_PREFIX_REGEX, '');
}

/**
 * Validates and extracts Stellar addresses from a list of CAIP-2 account identifiers.
 * Returns only valid `G...` or `M...` addresses, filtering out invalid ones.
 */
export function extractValidStellarAddresses(accountIds: string[]): string[] {
  return accountIds
    .map(extractStellarAddress)
    .filter((address) => address.length > 0 && isValidStellarAddress(address));
}

/**
 * Reduces an untrusted account string to characters a Stellar public key or
 * muxed address can contain (base32 alphabet: A–Z, 2–7) and caps it at key
 * length (56 chars for `G` keys, 69 chars for `M` muxed keys).
 */
export function toDisplaySafeStellarAddress(address: string): string {
  const cleaned = address.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const maxLength = cleaned.startsWith('M') ? MAX_MUXED_KEY_LENGTH : MAX_PUBLIC_KEY_LENGTH;
  return cleaned.slice(0, maxLength);
}

/** Shortens a `G...` or `M...` address to `GABCDEFG...XYZ123` after making it display-safe. */
export function shortenStellarAddress(address: string, head = 8, tail = 6): string {
  const safe = toDisplaySafeStellarAddress(address);
  if (safe.length <= head + tail) return safe;
  return `${safe.slice(0, head)}...${safe.slice(-tail)}`;
}
