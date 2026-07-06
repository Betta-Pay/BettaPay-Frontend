import { cn } from '@/lib/utils';
import { formatCurrency, truncateAddress, formatDate } from '@/lib/utils/format';

describe('utils/format', () => {
  describe('cn()', () => {
    it('merges tailwind classes using twMerge (conflicting utilities)', () => {
      const result = cn('text-sm', 'text-lg');
      // twMerge should keep the last conflicting class
      expect(result.split(' ')).toContain('text-lg');
      expect(result.split(' ')).not.toContain('text-sm');
    });

    it('removes falsy/conditional classes via clsx', () => {
      // Cast 0 as unknown first to satisfy strict mode type checking safely
      const result = cn('p-2', false && 'p-4', undefined, 0 as unknown as string, 'm-1');
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
      // Cast null and undefined safely through unknown to test invalid runtime parameters
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
});
