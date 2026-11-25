import {
  formatCount,
  formatPercent,
  formatSignedPercent,
  isUsableNumber,
  percentOf,
  trendDirection,
  usableNumber,
} from '@/lib/utils/adminStats';

const BAD_VALUES: Array<number | null | undefined> = [
  null,
  undefined,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
];

describe('isUsableNumber / usableNumber', () => {
  it('accepts finite numbers including zero and negatives', () => {
    expect(isUsableNumber(0)).toBe(true);
    expect(isUsableNumber(-4.2)).toBe(true);
    expect(usableNumber(7)).toBe(7);
    expect(usableNumber(0)).toBe(0);
  });

  it('rejects null, undefined, NaN, Infinity and non-numbers', () => {
    for (const v of BAD_VALUES) {
      expect(isUsableNumber(v)).toBe(false);
      expect(usableNumber(v)).toBeNull();
    }
    expect(isUsableNumber('12')).toBe(false);
  });
});

describe('percentOf', () => {
  it('returns the ratio as a percentage for positive inputs', () => {
    expect(percentOf(50, 5000)).toBe(1);
    expect(percentOf(1, 4)).toBe(25);
  });

  it('returns 0 when the part is zero and the whole is positive', () => {
    expect(percentOf(0, 100)).toBe(0);
  });

  it('returns null for a zero denominator instead of Infinity or NaN', () => {
    expect(percentOf(10, 0)).toBeNull();
    expect(percentOf(0, 0)).toBeNull();
  });

  it('returns null when either input is missing or not finite', () => {
    for (const v of BAD_VALUES) {
      expect(percentOf(v, 100)).toBeNull();
      expect(percentOf(100, v)).toBeNull();
    }
  });
});

describe('formatSignedPercent', () => {
  it('prefixes positive changes with +', () => {
    expect(formatSignedPercent(12.5)).toBe('+12.5%');
    expect(formatSignedPercent(100)).toBe('+100.0%');
  });

  it('keeps the minus sign on negative changes', () => {
    expect(formatSignedPercent(-3)).toBe('-3.0%');
  });

  it('shows 0% for zero, including values that round to zero', () => {
    expect(formatSignedPercent(0)).toBe('0%');
    expect(formatSignedPercent(0.01)).toBe('0%');
    expect(formatSignedPercent(-0.04)).toBe('0%');
  });

  it('shows an em dash for null, undefined, NaN and Infinity', () => {
    for (const v of BAD_VALUES) {
      expect(formatSignedPercent(v)).toBe('—');
    }
  });

  it('never renders NaN, Infinity or undefined', () => {
    for (const v of [...BAD_VALUES, 0, 5, -5]) {
      expect(formatSignedPercent(v)).not.toMatch(/NaN|Infinity|undefined|null/);
    }
  });
});

describe('formatPercent', () => {
  it('formats usable values, including zero', () => {
    expect(formatPercent(1)).toBe('1.0%');
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(2.346, 2)).toBe('2.35%');
  });

  it('shows an em dash for missing values', () => {
    for (const v of BAD_VALUES) {
      expect(formatPercent(v)).toBe('—');
    }
  });
});

describe('formatCount', () => {
  it('formats counts, including zero', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1234)).toBe((1234).toLocaleString());
  });

  it('shows an em dash instead of throwing on missing values', () => {
    for (const v of BAD_VALUES) {
      expect(() => formatCount(v)).not.toThrow();
      expect(formatCount(v)).toBe('—');
    }
  });
});

describe('trendDirection', () => {
  it('classifies positive, negative and zero changes', () => {
    expect(trendDirection(12.5)).toBe('up');
    expect(trendDirection(-0.5)).toBe('down');
    expect(trendDirection(0)).toBe('flat');
  });

  it('treats a change that rounds to zero as flat', () => {
    expect(trendDirection(0.04)).toBe('flat');
    expect(trendDirection(-0.04)).toBe('flat');
  });

  it('treats missing values as flat', () => {
    for (const v of BAD_VALUES) {
      expect(trendDirection(v)).toBe('flat');
    }
  });
});
