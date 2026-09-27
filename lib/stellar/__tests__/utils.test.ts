import { shortenStellarAddress, toDisplaySafeStellarAddress } from '../utils';

const KEY = 'GAXYZABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOP7QF';

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
    expect(shortenStellarAddress(KEY)).toBe('GAXYZABC...NOP7QF');
  });

  it('returns short values without an ellipsis', () => {
    expect(shortenStellarAddress('GABC')).toBe('GABC');
  });
});
