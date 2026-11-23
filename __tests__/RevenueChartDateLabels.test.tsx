import React from 'react';
import { render, screen, within } from '@testing-library/react';
import RevenueChart, {
  aggregatePaymentsByDay,
  WEEKDAY_SPAN_LIMIT,
} from '@/components/charts/RevenueChart';

// The axis label is the thing under test; the SVG it feeds is recharts'.
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container">{children}</div>
    ),
  };
});

/** `count` consecutive `YYYY-MM-DD` keys starting at a UTC midnight. */
function consecutiveDays(startISO: string, count: number): string[] {
  const start = new Date(`${startISO}T00:00:00Z`);
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

/** Noon UTC keeps the bucket key equal to the calendar date in every timezone. */
function paymentsOnDays(days: string[], amountUsdc = 10) {
  return days.map((day) => ({
    amountUsdc,
    createdAt: `${day}T12:00:00Z`,
    status: 'success',
  }));
}

const CALENDAR_LABEL = /^[A-Z][a-z]{2} \d{1,2}$/;
const WEEKDAY_LABEL = /^[A-Z][a-z]{2}$/;
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

describe('RevenueChart day labels (issue #1135)', () => {
  it('keeps weekday names for a seven-day window', () => {
    const chartData = aggregatePaymentsByDay(
      paymentsOnDays(consecutiveDays('2026-11-02', 7))
    );

    expect(chartData).toHaveLength(7);
    // 2026-11-02 is a Monday, so a readable week is exactly the seven names.
    expect(chartData.map((point) => point.name)).toEqual(WEEKDAY_NAMES);
  });

  it('labels a 30-day window with month and day, one label per bucket', () => {
    const chartData = aggregatePaymentsByDay(
      paymentsOnDays(consecutiveDays('2026-10-15', 30))
    );

    expect(chartData).toHaveLength(30);
    expect(chartData[0].name).toBe('Oct 15');
    expect(chartData[chartData.length - 1].name).toBe('Nov 13');

    const names = chartData.map((point) => point.name);
    for (const name of names) {
      expect(name).toMatch(CALENDAR_LABEL);
      expect(WEEKDAY_NAMES).not.toContain(name);
    }
    // The bug: 30 buckets drawn from seven weekday names collapsed to <= 7 labels.
    expect(new Set(names).size).toBe(30);
  });

  it('labels every bucket uniquely across a 90-day window', () => {
    const chartData = aggregatePaymentsByDay(
      paymentsOnDays(consecutiveDays('2026-08-16', 90))
    );

    expect(chartData).toHaveLength(90);
    const names = chartData.map((point) => point.name);
    expect(new Set(names).size).toBe(90);
    expect(names[0]).toBe('Aug 16');
    expect(names[names.length - 1]).toBe('Nov 13');
  });

  it('switches formats at the seven-day boundary', () => {
    const inside = aggregatePaymentsByDay(
      paymentsOnDays(consecutiveDays('2026-11-02', WEEKDAY_SPAN_LIMIT))
    );
    const outside = aggregatePaymentsByDay(
      paymentsOnDays(consecutiveDays('2026-11-02', WEEKDAY_SPAN_LIMIT + 1))
    );

    expect(inside).toHaveLength(WEEKDAY_SPAN_LIMIT);
    expect(outside).toHaveLength(WEEKDAY_SPAN_LIMIT + 1);
    expect(inside[0].name).toMatch(WEEKDAY_LABEL);
    // Eight days is the first span where a weekday name can repeat.
    expect(outside[0].name).toBe('Nov 2');
    expect(outside[outside.length - 1].name).toBe('Nov 9');
  });

  it('follows the calendar span rather than the bucket count', () => {
    // Four buckets would pass a "more than seven buckets" test while still
    // reading Mon/Tue/Wed/Fri across a month nobody can date.
    const chartData = aggregatePaymentsByDay(
      paymentsOnDays(['2026-10-15', '2026-10-22', '2026-10-29', '2026-11-13'])
    );

    expect(chartData).toHaveLength(4);
    expect(chartData.map((point) => point.name)).toEqual([
      'Oct 15',
      'Oct 22',
      'Oct 29',
      'Nov 13',
    ]);
  });

  it('aggregates a month that shares one weekday into distinct buckets', () => {
    // Every one of these is a Monday.
    const mondays = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'];
    const chartData = aggregatePaymentsByDay(paymentsOnDays(mondays, 100));

    expect(chartData).toHaveLength(5);
    expect(chartData.map((point) => point.name)).toEqual([
      'Nov 2',
      'Nov 9',
      'Nov 16',
      'Nov 23',
      'Nov 30',
    ]);
  });

  it('leaves totals and cumulative volume untouched by the label change', () => {
    const chartData = aggregatePaymentsByDay(
      paymentsOnDays(consecutiveDays('2026-08-16', 90), 10)
    );

    let expectedVolume = 0;
    for (const point of chartData) {
      expect(point.total).toBe(10);
      expectedVolume += point.total;
      expect(point.volume).toBe(expectedVolume);
    }
    expect(chartData[chartData.length - 1].volume).toBe(900);
  });

  it('renders the calendar labels in the screen-reader data table', () => {
    const payments = paymentsOnDays(consecutiveDays('2026-10-15', 30));
    render(<RevenueChart data={payments} />);

    const table = screen.getByRole('table', { name: /revenue and volume data table/i });
    const rows = within(table).getAllByRole('row');
    // Header row plus one row per bucket.
    expect(rows).toHaveLength(31);
    expect(within(table).getByText('Oct 15')).toBeInTheDocument();
    expect(within(table).getByText('Nov 13')).toBeInTheDocument();
    expect(within(table).queryByText('Mon')).not.toBeInTheDocument();
  });
});
