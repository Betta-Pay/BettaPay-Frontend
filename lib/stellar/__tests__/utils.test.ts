import {
  extractStellarAddress,
  extractValidStellarAddresses,
  isValidStellarAddress,
  shortenStellarAddress,
  toDisplaySafeStellarAddress,
} from '../utils';

const KEY = 'GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD';
const SECOND_KEY = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('isValidStellarAddress', () => {
  it('accepts a valid G-address', () => {
    expect(isValidStellarAddress(KEY)).toBe(true);
  });

  it('rejects invalid checksums and non-Stellar strings', () => {
    expect(isValidStellarAddress(`${KEY.slice(0, -1)}A`)).toBe(false);
    expect(isValidStellarAddress('not-a-stellar-address')).toBe(false);
  });

  it('rejects whitespace-padded addresses', () => {
    expect(isValidStellarAddress(` ${KEY} `)).toBe(false);
  });
});

describe('extractStellarAddress', () => {
  it('extracts a public key from a CAIP-2 account identifier', () => {
    expect(extractStellarAddress(`stellar:pubnet:${KEY}`)).toBe(KEY);
  });

  it('returns a plain address and trims surrounding whitespace', () => {
    expect(extractStellarAddress(`  ${KEY}  `)).toBe(KEY);
  });

  it('does not extract or normalize non-Stellar strings', () => {
    expect(extractStellarAddress('ethereum:1:0x123')).toBe('ethereum:1:0x123');
  });
});

describe('extractValidStellarAddresses', () => {
  it('keeps valid addresses and removes duplicates', () => {
    expect(extractValidStellarAddresses([
      KEY,
      `stellar:testnet:${KEY}`,
      SECOND_KEY,
    ])).toEqual([KEY, SECOND_KEY]);
  });

  it('filters invalid checksums, mixed-case, and non-Stellar values', () => {
    expect(extractValidStellarAddresses([
      `${KEY.slice(0, -1)}A`,
      KEY.toLowerCase(),
      'ethereum:1:0x123',
      '',
    ])).toEqual([]);
  });
});

describe('toDisplaySafeStellarAddress', () => {
  it('leaves a valid public key unchanged', () => {
    expect(toDisplaySafeStellarAddress(KEY)).toBe(KEY);
  });

  it('strips markup, whitespace and control characters', () => {
    expect(toDisplaySafeStellarAddress('<b>GABC</b>‮\n2 7')).toBe('BGABCB27');
  });

  it('caps the output at public-key length', () => {
    expect(toDisplaySafeStellarAddress('G'.repeat(500))).toHaveLength(56);
  });
});

describe('shortenStellarAddress', () => {
  it('keeps the head and tail of the key', () => {
    expect(shortenStellarAddress(KEY)).toBe('GCCHHKNI...76UHDD');
  });

  it('returns short values without an ellipsis', () => {
    expect(shortenStellarAddress('GABC')).toBe('GABC');
  });
});
