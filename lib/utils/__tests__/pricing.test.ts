import {
  PRICING_TIERS,
  MIN_VOLUME,
  MAX_VOLUME,
  DEFAULT_VOLUME,
  clampVolume,
  estimateMonthlyCost,
  recommendTier,
  sliderToVolume,
  volumeToSlider,
} from '@/lib/pricing';

const starter = PRICING_TIERS.find((t) => t.id === 'starter')!;
const growth = PRICING_TIERS.find((t) => t.id === 'growth')!;
const enterprise = PRICING_TIERS.find((t) => t.id === 'enterprise')!;

describe('lib/pricing', () => {
  describe('estimateMonthlyCost()', () => {
    it('computes Starter cost as volume fee plus per-transaction fee', () => {
      // $50k at 1.5% = $750; 1000 tx ($50 avg) at $0.10 = $100
      expect(estimateMonthlyCost(starter, 50_000, 50)).toBeCloseTo(850);
    });

    it('exempts the Growth included volume from the percentage fee', () => {
      // ($50k - $10k) at 1.0% = $400; 1000 tx at $0.05 = $50
      expect(estimateMonthlyCost(growth, 50_000, 50)).toBeCloseTo(450);
    });

    it('charges Growth no percentage fee below the included volume', () => {
      // $5k under the $10k allowance: only 100 tx at $0.05
      expect(estimateMonthlyCost(growth, 5_000, 50)).toBeCloseTo(5);
    });

    it('returns null for custom-priced tiers', () => {
      expect(estimateMonthlyCost(enterprise, 1_000_000, 50)).toBeNull();
    });

    it('returns 0 for non-positive volume', () => {
      expect(estimateMonthlyCost(starter, 0, 50)).toBe(0);
    });

    it('makes Growth cheaper than Starter at high volume', () => {
      const s = estimateMonthlyCost(starter, 100_000, 50)!;
      const g = estimateMonthlyCost(growth, 100_000, 50)!;
      expect(g).toBeLessThan(s);
    });
  });

  describe('recommendTier()', () => {
    it('recommends Starter below $10k', () => {
      expect(recommendTier(1_000)).toBe('starter');
      expect(recommendTier(9_999)).toBe('starter');
    });

    it('recommends Growth from $10k to $500k', () => {
      expect(recommendTier(10_000)).toBe('growth');
      expect(recommendTier(500_000)).toBe('growth');
    });

    it('recommends Enterprise above $500k', () => {
      expect(recommendTier(500_001)).toBe('enterprise');
      expect(recommendTier(10_000_000)).toBe('enterprise');
    });
  });

  describe('clampVolume()', () => {
    it('clamps to the supported range', () => {
      expect(clampVolume(0)).toBe(MIN_VOLUME);
      expect(clampVolume(99_999_999)).toBe(MAX_VOLUME);
      expect(clampVolume(50_000)).toBe(50_000);
    });

    it('falls back to the default for invalid input', () => {
      expect(clampVolume(NaN)).toBe(DEFAULT_VOLUME);
      expect(clampVolume(Infinity)).toBe(DEFAULT_VOLUME);
    });
  });

  describe('slider mapping', () => {
    it('maps the slider extremes to the volume bounds', () => {
      expect(sliderToVolume(0)).toBe(MIN_VOLUME);
      expect(sliderToVolume(100)).toBe(MAX_VOLUME);
    });

    it('round-trips volumes through the log scale within snap tolerance', () => {
      for (const v of [1_000, 5_000, 50_000, 500_000, 10_000_000]) {
        const roundTripped = sliderToVolume(volumeToSlider(v));
        expect(Math.abs(roundTripped - v) / v).toBeLessThan(0.05);
      }
    });

    it('is monotonic', () => {
      expect(sliderToVolume(25)).toBeLessThan(sliderToVolume(50));
      expect(sliderToVolume(50)).toBeLessThan(sliderToVolume(75));
    });
  });

  describe('tier data', () => {
    it('highlights only the Growth tier', () => {
      expect(PRICING_TIERS.filter((t) => t.highlighted).map((t) => t.id)).toEqual(['growth']);
    });

    it('routes Enterprise CTA to the sales contact form', () => {
      expect(enterprise.cta.href).toBe('/contact?subject=enterprise-pricing');
    });
  });
});
