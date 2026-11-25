import { fmtRelative } from '@/lib/utils/relativeTime';

const NOW = Date.parse('2026-11-24T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('fmtRelative', () => {
  it('returns "Unknown" for null, undefined and empty values', () => {
    expect(fmtRelative(null, NOW)).toBe('Unknown');
    expect(fmtRelative(undefined, NOW)).toBe('Unknown');
    expect(fmtRelative('', NOW)).toBe('Unknown');
    expect(fmtRelative('   ', NOW)).toBe('Unknown');
  });

  it('returns "Unknown" instead of "NaNd ago" for unparseable dates', () => {
    expect(fmtRelative('not-a-date', NOW)).toBe('Unknown');
    expect(fmtRelative('2026-13-45T99:99:99Z', NOW)).toBe('Unknown');
    expect(fmtRelative('undefined', NOW)).toBe('Unknown');
  });

  it('never produces NaN in its output', () => {
    for (const input of [null, undefined, '', 'garbage', '0000-00-00']) {
      expect(fmtRelative(input as string | null | undefined, NOW)).not.toMatch(/NaN/);
    }
  });

  it('formats minutes, hours and days', () => {
    expect(fmtRelative(ago(0), NOW)).toBe('0m ago');
    expect(fmtRelative(ago(5 * 60_000), NOW)).toBe('5m ago');
    expect(fmtRelative(ago(59 * 60_000), NOW)).toBe('59m ago');
    expect(fmtRelative(ago(60 * 60_000), NOW)).toBe('1h ago');
    expect(fmtRelative(ago(23 * 3_600_000), NOW)).toBe('23h ago');
    expect(fmtRelative(ago(24 * 3_600_000), NOW)).toBe('1d ago');
    expect(fmtRelative(ago(10 * 86_400_000), NOW)).toBe('10d ago');
  });

  it('treats a timestamp in the future as just now, not a negative duration', () => {
    expect(fmtRelative(new Date(NOW + 5 * 60_000).toISOString(), NOW)).toBe('0m ago');
  });

  it('defaults to the current time when no reference is given', () => {
    jest.useFakeTimers().setSystemTime(NOW);
    try {
      expect(fmtRelative(ago(2 * 3_600_000))).toBe('2h ago');
    } finally {
      jest.useRealTimers();
    }
  });
});
