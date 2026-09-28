import { cn } from '@/lib/utils';
import {
  formatCurrency,
  truncateAddress,
  formatDate,
  formatFiat,
  formatNumber,
  formatRelativeTime,
  getActiveLocale,
  isSupportedFiatCurrency,
} from '@/lib/utils/format';

describe('utils/format', () => {
  describe('cn()', () => {
    it('merges tailwind classes using twMerge (conflicting utilities)', () => {
      const result = cn('text-sm', 'text-lg');
      // twMerge should keep the last conflicting class
      expect(result.split(' ')).toContain('text-lg');
      expect(result.split(' ')).not.toContain('text-sm');
    });

    it('removes falsy/conditional classes via clsx', () => {
      const result = cn('p-2', false && 'p-4', undefined, 0, 'm-1');
      expect(result.split(' ')).toContain('p-2');
      expect(result.split(' ')).toContain('m-1');
      expect(result).not.toContain('p-4');
    });
  });

  describe('formatCurrency()', () => {
    it('formats USDC (default) and prefixes output with “USDC ”', () => {
      expect(formatCurrency(100, 'USDC')).toBe('USDC 100.00');
    });

    it('formats NGN (Intl keeps fractional digits because maxFractionDigits is not set)', () => {
      expect(formatCurrency(1234.56, 'NGN')).toBe('₦1,234.56');
    });

    it('handles zero', () => {
      expect(formatCurrency(0, 'USDC')).toBe('USDC 0.00');
      expect(formatCurrency(0, 'NGN')).toBe('₦0');
    });

    it('handles negative values', () => {
      expect(formatCurrency(-50, 'USDC')).toBe('-USDC 50.00');
      expect(formatCurrency(-50, 'NGN')).toBe('-₦50');
    });

    it('handles large numbers', () => {
      expect(formatCurrency(1234567890.12, 'USDC')).toBe('USDC 1,234,567,890.12');
    });

    it('supports showDecimals:false for whole USDC amounts', () => {
      expect(formatCurrency(1250, 'USDC', { showDecimals: false })).toBe('USDC 1,250');
      expect(formatCurrency(1250.5, 'USDC', { showDecimals: false })).toBe('USDC 1,250.50');
    });

    it('abbreviates extreme magnitudes with a locale-aware number body', () => {
      expect(formatCurrency(1.5e12, 'USDC')).toBe('USDC 1.50T');
      expect(formatCurrency(2e15, 'NGN')).toBe('₦2.00Q');
    });

    it('accepts an options object with an explicit locale', () => {
      const value = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(1234.56);
      expect(formatCurrency(1234.56, 'USDC', { locale: 'fr' })).toBe(`USDC ${value}`);
    });
  });

  describe('truncateAddress()', () => {
    it('returns short addresses as-is', () => {
      expect(truncateAddress('123456789')).toBe('123456789'); // length 9
    });

    it('truncates long addresses to first 6 + ... + last 4', () => {
      const addr = 'GABCD1234567890XYZ';
      // first 6: GABCD1, last 4: YZ?? (computed by substring)
      expect(truncateAddress(addr)).toBe(`${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`);
    });

    it('returns empty string as-is', () => {
      expect(truncateAddress('')).toBe('');
    });

    it('returns null/undefined unchanged (runtime)', () => {
      expect(truncateAddress(null as unknown as string)).toBe(null);
      expect(truncateAddress(undefined as unknown as string)).toBe(undefined);
    });
  });

  describe('formatDate()', () => {
    it('formats a string input', () => {
      const input = '2024-01-02T03:04:00.000Z';
      const expected = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(input));

      expect(formatDate(input)).toBe(expected);
    });

    it('formats a Date input', () => {
      const d = new Date('2024-06-15T10:20:00.000Z');
      const expected = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(d);

      expect(formatDate(d)).toBe(expected);
    });
  });

  describe('active-locale formatting (AC4)', () => {
    afterEach(() => {
      // Reset so locale-dependent tests never leak into the default-locale ones.
      document.documentElement.lang = '';
    });

    it('formatCurrency USDC renders numbers in an explicit locale', () => {
      const value = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(1234.56);
      expect(formatCurrency(1234.56, 'USDC', 'fr')).toBe(`USDC ${value}`);
    });

    it('formatCurrency NGN renders numbers in an explicit locale', () => {
      const expected = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(1234.56);
      expect(formatCurrency(1234.56, 'NGN', 'pt')).toBe(expected);
    });

    it('formatDate renders in an explicit locale', () => {
      const input = '2024-01-02T03:04:00.000Z';
      const expected = new Intl.DateTimeFormat('pt-BR', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(input));
      expect(formatDate(input, 'pt')).toBe(expected);
    });

    it('formatNumber renders in an explicit locale', () => {
      const expected = new Intl.NumberFormat('fr-FR').format(1234567.89);
      expect(formatNumber(1234567.89, 'fr')).toBe(expected);
    });

    it('uses document.documentElement.lang when no locale is passed', () => {
      document.documentElement.lang = 'fr';
      const value = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(1234.56);
      expect(formatCurrency(1234.56, 'USDC')).toBe(`USDC ${value}`);
    });

    it('falls back to en (en-US) for an unsupported document lang', () => {
      document.documentElement.lang = 'de';
      expect(formatCurrency(100, 'USDC')).toBe('USDC 100.00');
      expect(formatDate('2024-01-02T03:04:00.000Z')).toBe(
        new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date('2024-01-02T03:04:00.000Z')),
      );
    });
  });

  describe('formatFiat() (#750)', () => {
    afterEach(() => {
      document.documentElement.lang = '';
    });

    it('renders the native symbol for the requested ISO currency', () => {
      expect(formatFiat(1234.56, 'EUR')).toBe(
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 2,
        }).format(1234.56),
      );
    });

    it('keeps both cents for two-decimal currencies instead of trimming to "1,120.5"', () => {
      expect(formatFiat(1120.5, 'EUR')).toBe('€1,120.50');
      expect(formatFiat(1120.5, 'USD')).toBe('$1,120.50');
    });

    it('places the symbol per locale convention (fr-FR suffixes it)', () => {
      const expected = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2,
      }).format(1234.56);

      expect(formatFiat(1234.56, 'EUR', 'fr')).toBe(expected);
      expect(formatFiat(1234.56, 'EUR', 'fr')).toMatch(/€$/);
    });

    it('defaults to NGN and resolves the ₦ symbol for the default `en` locale', () => {
      // en-US has no Naira symbol, so formatFiat must switch to the en-NG tag.
      const ngn = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(2325000);

      expect(formatFiat(2325000)).toBe(ngn);
      expect(formatFiat(2325000)).toContain('₦');
    });

    it('drops minor units for currencies that have none', () => {
      expect(formatFiat(1234.5, 'JPY', 'en')).toBe('¥1,235');
    });

    it('keeps the sign ahead of the symbol for negative amounts', () => {
      expect(formatFiat(-50, 'NGN')).toBe(
        new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
          minimumFractionDigits: 0,
        }).format(-50),
      );
    });

    it('collapses floating-point residuals to a clean zero', () => {
      expect(formatFiat(-0.0000001, 'NGN')).toBe(
        new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
          minimumFractionDigits: 0,
        }).format(0),
      );
    });

    it('falls back to NGN for a malformed currency code instead of throwing', () => {
      const ngn = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(1000);

      expect(formatFiat(1000, 'EURO')).toBe(ngn);
      expect(formatFiat(1000, '')).toBe(ngn);
      expect(formatFiat(1000, 'usd1')).toBe(ngn);
      expect(formatFiat(1000, null as unknown as string)).toBe(ngn);
      expect(formatFiat(1000, undefined)).toBe(ngn);
    });

    it('normalises case and surrounding whitespace on the currency code', () => {
      expect(formatFiat(10, ' eur ')).toBe(formatFiat(10, 'EUR'));
    });

    it('isSupportedFiatCurrency() accepts ISO codes and rejects everything else', () => {
      expect(isSupportedFiatCurrency('EUR')).toBe(true);
      expect(isSupportedFiatCurrency('NGN')).toBe(true);
      // 4-letter tickers are tokens, not ISO fiat — they must be rejected so a
      // stablecoin can never be rendered with a fiat symbol.
      expect(isSupportedFiatCurrency('USDC')).toBe(false);
      expect(isSupportedFiatCurrency('EURO')).toBe(false);
      expect(isSupportedFiatCurrency('12')).toBe(false);
      expect(isSupportedFiatCurrency('')).toBe(false);
      expect(isSupportedFiatCurrency(undefined)).toBe(false);
      expect(isSupportedFiatCurrency(123)).toBe(false);
    });
  });

  describe('formatRelativeTime()', () => {
    const fixedNow = new Date('2025-01-15T12:00:00.000Z').getTime();

    it('formats past and future times in English (default)', () => {
      const twoHoursAgo = new Date('2025-01-15T10:00:00.000Z');
      const inThreeDays = new Date('2025-01-18T12:00:00.000Z');

      expect(formatRelativeTime(twoHoursAgo, fixedNow, 'en')).toBe('2 hours ago');
      expect(formatRelativeTime(inThreeDays, fixedNow, 'en')).toBe('in 3 days');
    });

    it('formats relative time in French', () => {
      const twoHoursAgo = new Date('2025-01-15T10:00:00.000Z');
      const formatted = formatRelativeTime(twoHoursAgo, fixedNow, 'fr');
      expect(formatted).toBe('il y a 2 heures');
    });

    it('formats relative time in Portuguese', () => {
      const twoHoursAgo = new Date('2025-01-15T10:00:00.000Z');
      const formatted = formatRelativeTime(twoHoursAgo, fixedNow, 'pt');
      expect(formatted).toBe('há 2 horas');
    });

    it('formats relative time in Swahili', () => {
      const twoHoursAgo = new Date('2025-01-15T10:00:00.000Z');
      const formatted = formatRelativeTime(twoHoursAgo, fixedNow, 'sw');
      expect(formatted).toMatch(/masaa 2 yaliyopita|saa 2 zilizopita/i);
    });

    it('responds to document.documentElement.lang', () => {
      document.documentElement.lang = 'fr';
      const twoHoursAgo = new Date('2025-01-15T10:00:00.000Z');
      expect(formatRelativeTime(twoHoursAgo, fixedNow)).toBe('il y a 2 heures');
      document.documentElement.lang = '';
    });

    it('returns empty string for invalid date input', () => {
      expect(formatRelativeTime('invalid-date', fixedNow)).toBe('');
    });
  });

  describe('getActiveLocale()', () => {
    afterEach(() => {
      document.documentElement.lang = '';
    });

    it('returns the supported document language', () => {
      document.documentElement.lang = 'pt';
      expect(getActiveLocale()).toBe('pt');
    });

    it('falls back to en for an empty or unsupported language', () => {
      document.documentElement.lang = '';
      expect(getActiveLocale()).toBe('en');
      document.documentElement.lang = 'xx';
      expect(getActiveLocale()).toBe('en');
    });
  });
});


