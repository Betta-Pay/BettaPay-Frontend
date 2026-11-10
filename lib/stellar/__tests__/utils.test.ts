import {
  extractValidStellarAddresses,
  isMuxedStellarAddress,
  isValidStellarAddress,
  parseMuxedStellarAddress,
  shortenStellarAddress,
  toDisplaySafeStellarAddress,
} from '../utils';

const KEY = 'GAXYZABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOP7QF';
const VALID_G_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const VALID_M_ADDRESS =
  'MCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYAAAAAAAOW6NCUDWY';

describe('toDisplaySafeStellarAddress', () => {
  it('leaves a valid public key unchanged', () => {
    expect(toDisplaySafeStellarAddress(KEY)).toBe(KEY);
  });

  it('leaves a valid 69-character SEP-0023 muxed address unchanged', () => {
    expect(toDisplaySafeStellarAddress(VALID_M_ADDRESS)).toBe(VALID_M_ADDRESS);
    expect(toDisplaySafeStellarAddress(VALID_M_ADDRESS)).toHaveLength(69);
  });

  it('strips markup, whitespace and control characters', () => {
    expect(toDisplaySafeStellarAddress('<b>GABC</b>‮\n2 7')).toBe('BGABCB27');
  });

  it('caps the output at public-key length for G addresses and 69 for M addresses', () => {
    expect(toDisplaySafeStellarAddress('G'.repeat(500))).toHaveLength(56);
    expect(toDisplaySafeStellarAddress('M'.repeat(500))).toHaveLength(69);
  });
});

describe('shortenStellarAddress', () => {
  it('keeps the head and tail of the key', () => {
    expect(shortenStellarAddress(KEY)).toBe('GAXYZABC...NOP7QF');
  });

  it('shortens SEP-0023 muxed M addresses using the true 69-character tail', () => {
    expect(shortenStellarAddress(VALID_M_ADDRESS)).toBe('MCFIRY65...NCUDWY');
  });

  it('returns short values without an ellipsis', () => {
    expect(shortenStellarAddress('GABC')).toBe('GABC');
  });
});

describe('SEP-0023 Muxed Account validation and parsing (#900)', () => {
  it('validates both 56-character G addresses and 69-character M muxed addresses', () => {
    expect(isValidStellarAddress(VALID_G_ADDRESS)).toBe(true);
    expect(isValidStellarAddress(VALID_M_ADDRESS)).toBe(true);
    expect(isMuxedStellarAddress(VALID_M_ADDRESS)).toBe(true);
    expect(isMuxedStellarAddress(VALID_G_ADDRESS)).toBe(false);
  });

  it('rejects corrupted or malformed G and M addresses', () => {
    const corruptedM = `${VALID_M_ADDRESS.slice(0, -1)}Z`;
    const corruptedG = `${VALID_G_ADDRESS.slice(0, -1)}Z`;
    const truncatedM = VALID_M_ADDRESS.slice(0, 56);

    expect(isValidStellarAddress(corruptedM)).toBe(false);
    expect(isValidStellarAddress(corruptedG)).toBe(false);
    expect(isValidStellarAddress(truncatedM)).toBe(false);
    expect(isValidStellarAddress('')).toBe(false);
  });

  it('extracts base G address and muxed ID from a valid M address', () => {
    const parsed = parseMuxedStellarAddress(VALID_M_ADDRESS);
    expect(parsed).toEqual({
      baseAddress: VALID_G_ADDRESS,
      muxedId: '123456789',
    });
    expect(parseMuxedStellarAddress(VALID_G_ADDRESS)).toBeNull();
  });

  it('extracts valid G and M addresses from CAIP-2 account lists', () => {
    const accounts = [
      `stellar:public:${VALID_G_ADDRESS}`,
      `stellar:public:${VALID_M_ADDRESS}`,
      'stellar:public:INVALID_KEY',
    ];
    expect(extractValidStellarAddresses(accounts)).toEqual([
      VALID_G_ADDRESS,
      VALID_M_ADDRESS,
    ]);
  });
});
