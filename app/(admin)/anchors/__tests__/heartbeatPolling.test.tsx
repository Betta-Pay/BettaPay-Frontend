import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminAnchorsPage, { HEARTBEAT_INTERVAL_MS } from '../page';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

describe('AdminAnchorsPage SEP-24 heartbeat polling and status indicators (#932)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries: jest.fn() });
    (useMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false });
  });

  it('polls anchor health every 60 seconds and renders latency badges and warning banner for degraded/down anchors', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: {
        data: [
          {
            id: 'anc_1',
            name: 'Cowrie Integrated',
            code: 'COWRIE',
            currency: 'NGN',
            country: 'Nigeria',
            flag: '🇳🇬',
            kycLevels: ['basic'],
            settlementTime: 'Instant',
            enabled: true,
            websiteUrl: null,
            health: {
              status: 'healthy',
              latencyMs: 142,
              checkedAt: '2026-03-01T10:00:00.000Z',
              errorMessage: null,
            },
            stats: {
              totalVolumeUsdc: 50000,
              settlementCount: 120,
              failureCount: 0,
              failureRate: 0,
              lastSettlementAt: '2026-03-01T09:00:00.000Z',
            },
          },
          {
            id: 'anc_2',
            name: 'YellowCard Anchor',
            code: 'YCARD',
            currency: 'KES',
            country: 'Kenya',
            flag: '🇰🇪',
            kycLevels: ['basic'],
            settlementTime: '5 mins',
            enabled: true,
            websiteUrl: null,
            health: {
              status: 'degraded',
              latencyMs: 980,
              checkedAt: '2026-03-01T10:00:00.000Z',
              errorMessage: 'High SEP-24 /info latency',
            },
            stats: {
              totalVolumeUsdc: 12000,
              settlementCount: 30,
              failureCount: 1,
              failureRate: 3.33,
              lastSettlementAt: '2026-03-01T08:00:00.000Z',
            },
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<AdminAnchorsPage />);

    expect(HEARTBEAT_INTERVAL_MS).toBe(60_000);
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchInterval: 60_000,
      }),
    );

    expect(screen.getByText('142ms')).toBeInTheDocument();
    expect(screen.getByText('980ms')).toBeInTheDocument();
    expect(screen.getByTestId('anchor-health-warning-banner')).toHaveTextContent(
      /YellowCard Anchor \(Degraded\)/i,
    );
  });
});
