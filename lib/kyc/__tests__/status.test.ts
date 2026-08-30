import {
  isSettlementConfigUnlocked,
  normalizeKybStatus,
  KYB_STATUS_META,
  KYB_DOC_STATUS_META,
} from '../status';

describe('normalizeKybStatus', () => {
  it('passes through known KybStatus values', () => {
    expect(normalizeKybStatus('pending')).toBe('pending');
    expect(normalizeKybStatus('approved')).toBe('approved');
    expect(normalizeKybStatus('rejected')).toBe('rejected');
    expect(normalizeKybStatus('unverified')).toBe('unverified');
  });

  it('folds the auth user "none", null, and undefined into "unverified"', () => {
    expect(normalizeKybStatus('none')).toBe('unverified');
    expect(normalizeKybStatus(null)).toBe('unverified');
    expect(normalizeKybStatus(undefined)).toBe('unverified');
  });
});

describe('isSettlementConfigUnlocked', () => {
  it('locks a merchant that has not started verification', () => {
    expect(isSettlementConfigUnlocked('none')).toBe(false);
    expect(isSettlementConfigUnlocked('unverified')).toBe(false);
    expect(isSettlementConfigUnlocked(undefined)).toBe(false);
    expect(isSettlementConfigUnlocked(null)).toBe(false);
  });

  it('unlocks once verification is at least pending', () => {
    expect(isSettlementConfigUnlocked('pending')).toBe(true);
    expect(isSettlementConfigUnlocked('approved')).toBe(true);
    // Rejected still counts — the merchant can keep working while fixing docs.
    expect(isSettlementConfigUnlocked('rejected')).toBe(true);
  });
});

describe('status metadata', () => {
  it('has an entry with a tone and description for every status', () => {
    for (const meta of Object.values(KYB_STATUS_META)) {
      expect(meta.tone).toBeTruthy();
      expect(meta.description.length).toBeGreaterThan(0);
    }
    for (const meta of Object.values(KYB_DOC_STATUS_META)) {
      expect(meta.tone).toBeTruthy();
      expect(meta.description.length).toBeGreaterThan(0);
    }
  });
});
