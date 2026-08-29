import React from 'react';
import { render, screen } from '@testing-library/react';
import { PlatformTicker } from '@/components/admin/PlatformTicker';

jest.mock('@/lib/hooks/usePlatformTicker', () => ({
  usePlatformTicker: jest.fn(() => ({
    ticker: {
      liveVolume: 1452310.89,
      liveFees: 14523.1,
      activeMerchants: 142,
      tps: 4.2,
      timestamp: '2026-08-28T16:00:00.000Z',
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

describe('PlatformTicker (#473)', () => {
  it('renders live volume, fees, active merchants, and throughput rate', () => {
    render(<PlatformTicker defaultPollIntervalMs={3000} />);

    expect(screen.getByText('LIVE TICKER')).toBeInPrimary();
    expect(screen.getByText('Real-Time Volume')).toBeInPrimary();
    expect(screen.getByText('Live Fees Generated')).toBeInPrimary();
    expect(screen.getByText('Active Merchants')).toBeInPrimary();
    expect(screen.getByText('Throughput')).toBeInPrimary();
    expect(screen.getByText('4.2 tx/s')).toBeInPrimary();
  });

  it('provides a link to rate controls settings', () => {
    render(<PlatformTicker />);
    const link = screen.getByRole('link', { name: /rate controls/i });
    expect(link).toHaveAttribute('href', '/admin/settings');
  });
});

// Custom helper matcher fallback for testing environment
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInPrimary(): R;
    }
  }
}
expect.extend({
  toBeInPrimary(received) {
    const pass = received !== null && received !== undefined;
    return {
      pass,
      message: () => `expected element to exist in document`,
    };
  },
});
