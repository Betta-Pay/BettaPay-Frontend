import {
  buildInvoiceNumber,
  computeSettlementFees,
  formatUsdc,
  formatNgn,
  SETTLEMENT_FEE_PERCENT,
} from '@/lib/utils/pdf';

describe('utils/pdf', () => {
  describe('buildInvoiceNumber()', () => {
    it('derives an uppercase invoice number from the settlement id', () => {
      expect(buildInvoiceNumber('stl_01abcdef')).toBe('INV-01ABCDEF');
    });

    it('strips non-alphanumeric characters and keeps the last 8', () => {
      expect(buildInvoiceNumber('stl-1234-5678-90ab')).toBe('INV-567890AB');
    });

    it('handles short ids', () => {
      expect(buildInvoiceNumber('a1')).toBe('INV-A1');
    });

    it('falls back when the id has no usable characters', () => {
      expect(buildInvoiceNumber('---')).toBe('INV-UNKNOWN');
    });
  });

  describe('computeSettlementFees()', () => {
    it('applies the default platform fee', () => {
      const fees = computeSettlementFees(1000);
      expect(fees.gross).toBe(1000);
      expect(fees.fee).toBeCloseTo(1000 * (SETTLEMENT_FEE_PERCENT / 100));
      expect(fees.net).toBeCloseTo(1000 - fees.fee);
    });

    it('accepts a custom fee percent', () => {
      const fees = computeSettlementFees(200, 2.5);
      expect(fees.fee).toBeCloseTo(5);
      expect(fees.net).toBeCloseTo(195);
    });

    it('handles zero amounts', () => {
      const fees = computeSettlementFees(0);
      expect(fees.fee).toBe(0);
      expect(fees.net).toBe(0);
    });
  });

  describe('formatUsdc()', () => {
    it('formats with two decimals and USDC suffix', () => {
      expect(formatUsdc(12450)).toBe('12,450.00 USDC');
    });
  });

  describe('formatNgn()', () => {
    it('formats whole naira amounts with NGN prefix', () => {
      expect(formatNgn(19297500)).toBe('NGN 19,297,500');
    });
  });
});
