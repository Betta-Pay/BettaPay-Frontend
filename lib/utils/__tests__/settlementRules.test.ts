import {
  calculateFeeSnapshot,
  validateSettlementThreshold,
  formatAnchorLimits,
} from '@/lib/utils/settlementRules';

describe('utils/settlementRules', () => {
  describe('validateSettlementThreshold()', () => {
    const anchorRules = {
      min_amount: 10,
      max_amount: 5000,
    };

    it('rejects amounts below the anchor minimum threshold', () => {
      const result = validateSettlementThreshold(5, anchorRules, {
        assetCode: 'USDC',
        operation: 'withdrawal',
      });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('BELOW_MINIMUM');
      expect(result.minAmount).toBe(10);
      expect(result.error).toContain('Minimum withdrawal amount is 10 USDC');
    });

    it('rejects amounts above the anchor maximum threshold', () => {
      const result = validateSettlementThreshold(7500, anchorRules, {
        assetCode: 'USDC',
        operation: 'deposit',
      });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('ABOVE_MAXIMUM');
      expect(result.maxAmount).toBe(5000);
      expect(result.error).toContain('Maximum deposit amount is 5000 USDC');
    });

    it('accepts amounts within the valid range and on exact boundaries', () => {
      expect(validateSettlementThreshold(10, anchorRules).isValid).toBe(true);
      expect(validateSettlementThreshold(250, anchorRules).isValid).toBe(true);
      expect(validateSettlementThreshold(5000, anchorRules).isValid).toBe(true);
      expect(validateSettlementThreshold('100.50', anchorRules).isValid).toBe(true);
    });

    it('rejects non-positive or NaN amounts', () => {
      expect(validateSettlementThreshold(0, anchorRules)).toMatchObject({
        isValid: false,
        reason: 'INVALID_AMOUNT',
      });
      expect(validateSettlementThreshold(-20, anchorRules)).toMatchObject({
        isValid: false,
        reason: 'INVALID_AMOUNT',
      });
      expect(validateSettlementThreshold('not-a-number', anchorRules)).toMatchObject({
        isValid: false,
        reason: 'INVALID_AMOUNT',
      });
    });

    it('supports camelCase minAmount and maxAmount fields', () => {
      const result = validateSettlementThreshold(2, { minAmount: 5, maxAmount: 100 });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('BELOW_MINIMUM');
    });
  });

  describe('formatAnchorLimits()', () => {
    it('formats both min and max limits', () => {
      expect(formatAnchorLimits({ min_amount: 10, max_amount: 5000 }, 'USDC')).toBe(
        '10 - 5000 USDC',
      );
    });

    it('formats min-only or max-only limits', () => {
      expect(formatAnchorLimits({ min_amount: 10 }, 'NGN')).toBe('Min 10 NGN');
      expect(formatAnchorLimits({ max_amount: 1000 }, 'NGN')).toBe('Max 1000 NGN');
      expect(formatAnchorLimits({})).toBe('No anchor limits');
    });
  });

  describe('calculateFeeSnapshot()', () => {
    it('calculates base fee and applies cap', () => {
      const snapshot = calculateFeeSnapshot(1000, { feeBps: 100, capAmountUsdc: 5 });
      expect(snapshot.baseFeeUsdc).toBe(10);
      expect(snapshot.totalFeeUsdc).toBe(5);
      expect(snapshot.capApplied).toBe(true);
    });
  });
});
