import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import FxRateChart, { type FxRatePoint } from '@/components/charts/FxRateChart';

// recharts measures its container before painting; jsdom reports 0x0, so render
// the chart subtree directly (same harness as ChartsAccessibility.test.tsx).
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container">{children}</div>
    ),
  };
});

const live: FxRatePoint[] = [
  { date: 'Mar 3', rate: 1580 },
  { date: 'Mar 4', rate: 1592 },
];

describe('FxRateChart rate history fallback (issue #1136)', () => {
  it('renders no fabricated rates when the caller supplies no data', () => {
    render(<FxRateChart />);

    expect(screen.getByText('No rate history available')).toBeInTheDocument();
    expect(screen.queryByText('Jan 7')).not.toBeInTheDocument();
    expect(screen.queryByText('₦1,480')).not.toBeInTheDocument();
  });

  it('shows the unavailable state, not an error, for an empty history array', () => {
    render(<FxRateChart data={[]} />);

    expect(screen.getByText('No rate history available')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the accessible region label for the pair when history is missing', () => {
    render(<FxRateChart data={[]} pairLabel="EURC/NGN" currency="NGN" />);

    expect(
      screen.getByRole('region', { name: /eurc to ngn exchange rate chart/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('No rate history available')).toBeInTheDocument();
  });

  it('treats a series of unreadable values as missing history', () => {
    render(<FxRateChart data={[{ date: 'Mar 3', rate: Number.NaN }]} />);

    expect(screen.getByText('No rate history available')).toBeInTheDocument();
  });

  it('renders the live series untouched', () => {
    render(<FxRateChart data={live} />);

    expect(screen.queryByText('No rate history available')).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: /usdc to ngn exchange rate data table/i })).toBeInTheDocument();
    expect(screen.getByText('Mar 3')).toBeInTheDocument();
    expect(screen.getByText('₦1,580')).toBeInTheDocument();
    expect(screen.getByText('₦1,592')).toBeInTheDocument();
  });

  it('renders the fetch error with a working retry', () => {
    const onRetry = jest.fn();
    render(<FxRateChart data={[]} error="Rates feed unavailable" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Rates feed unavailable');
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
