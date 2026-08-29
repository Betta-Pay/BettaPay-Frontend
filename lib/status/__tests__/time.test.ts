import {
  UNKNOWN_TIME_LABEL,
  formatAbsoluteTime,
  formatLastIncident,
  formatRelativeTime,
  parseTimestamp,
  stableNow,
} from '@/lib/status/time';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-08-25T12:00:00.000Z');

  it('reports sub-minute gaps as "just now"', () => {
    expect(formatRelativeTime(new Date(now - 30_000).toISOString(), now)).toBe('just now');
  });

  it.each([
    [1 * MINUTE, '1 minute ago'],
    [2 * MINUTE, '2 minutes ago'],
    [59 * MINUTE, '59 minutes ago'],
    [1 * HOUR, '1 hour ago'],
    [5 * HOUR, '5 hours ago'],
    [1 * DAY, '1 day ago'],
    [18 * DAY, '18 days ago'],
    [45 * DAY, '1 month ago'],
  ])('formats a %ims gap as "%s"', (gap, expected) => {
    expect(formatRelativeTime(new Date(now - gap).toISOString(), now)).toBe(expected);
  });

  it('advances as time passes', () => {
    const iso = new Date(now - 2 * MINUTE).toISOString();

    expect(formatRelativeTime(iso, now)).toBe('2 minutes ago');
    // The same timestamp, read one minute later.
    expect(formatRelativeTime(iso, now + MINUTE)).toBe('3 minutes ago');
    expect(formatRelativeTime(iso, now + 58 * MINUTE)).toBe('1 hour ago');
  });

  it('handles future timestamps without saying "ago"', () => {
    expect(formatRelativeTime(new Date(now + 5 * MINUTE).toISOString(), now)).toBe('in 5 minutes');
  });

  it.each([null, undefined, '', 'not-a-date'])(
    'falls back to "time unknown" for %p',
    (value) => {
      expect(formatRelativeTime(value as string | null | undefined, now)).toBe(
        UNKNOWN_TIME_LABEL,
      );
    },
  );
});

describe('formatLastIncident', () => {
  const now = Date.parse('2026-08-25T12:00:00.000Z');

  it('says "None" when a component has never had an incident', () => {
    expect(formatLastIncident(null, now)).toBe('None');
  });

  it('says "time unknown" when the timestamp is unparseable', () => {
    expect(formatLastIncident('nonsense', now)).toBe(UNKNOWN_TIME_LABEL);
  });

  it.each([
    [2 * HOUR, 'Today'],
    [26 * HOUR, 'Yesterday'],
    [3 * DAY, '3 days ago'],
  ])('formats a %ims gap as "%s"', (gap, expected) => {
    expect(formatLastIncident(new Date(now - gap).toISOString(), now)).toBe(expected);
  });

  it('falls back to a calendar date beyond a week', () => {
    const label = formatLastIncident(new Date(now - 20 * DAY).toISOString(), now);
    expect(label).not.toMatch(/ago|Today|Yesterday/);
    expect(label).toMatch(/[A-Z][a-z]{2} \d+/);
  });
});

describe('parseTimestamp / formatAbsoluteTime', () => {
  it('rejects invalid input', () => {
    expect(parseTimestamp('nope')).toBeNull();
    expect(parseTimestamp(null)).toBeNull();
    expect(formatAbsoluteTime(undefined)).toBe(UNKNOWN_TIME_LABEL);
  });

  it('renders a real timestamp', () => {
    expect(formatAbsoluteTime('2026-08-25T12:00:00.000Z')).toMatch(/[A-Z][a-z]{2} \d+/);
  });
});

describe('stableNow', () => {
  it('is floored to the start of the minute', () => {
    expect(stableNow() % MINUTE).toBe(0);
  });

  it('is stable across calls within the same minute', () => {
    expect(stableNow()).toBe(stableNow());
  });
});

describe('relative-time labels advance rather than freeze', () => {
  const now = Date.parse('2026-08-25T12:00:00.000Z');

  // The regression this guards: status timestamps used to be fixed strings, so
  // "50 minutes ago" stayed "50 minutes ago" forever. They are now real ISO
  // timestamps (from the live health probe) rendered against a ticking clock.
  it('keeps a fixed timestamp counting up as the clock moves', () => {
    const probedAt = new Date(now - 50 * MINUTE).toISOString();

    expect(formatRelativeTime(probedAt, now)).toBe('50 minutes ago');
    expect(formatRelativeTime(probedAt, now + 10 * MINUTE)).toBe('1 hour ago');
    expect(formatRelativeTime(probedAt, now + 24 * HOUR)).toBe('1 day ago');
  });
});
