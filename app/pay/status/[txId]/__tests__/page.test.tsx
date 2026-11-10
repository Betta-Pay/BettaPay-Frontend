import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useParams: () => ({ txId: 'tx_test_925' }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop) => {
        const MotionTag = ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) =>
          React.createElement(prop as string, rest, children);
        return MotionTag;
      },
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/lib/api/axios', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api/axios';
import PaymentStatusPage, {
  computeStatusPollDelay,
  POLL_BASE_MS,
  POLL_CAP_MS,
  POLL_TWO_MINUTES_MS,
} from '../page';

const mockGet = apiClient.get as jest.Mock;

describe('PaymentStatusPage — exponential backoff and jitter (#925)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('computes adaptive polling intervals starting at 2s and capping at 15s with jitter', () => {
    // Neutral jitter (randomFn = 0.5)
    expect(computeStatusPollDelay(0, 0, () => 0.5)).toBe(2000);
    expect(computeStatusPollDelay(2, 10_000, () => 0.5)).toBe(4500);
    expect(computeStatusPollDelay(4, 30_000, () => 0.5)).toBe(10125);
    expect(computeStatusPollDelay(8, 90_000, () => 0.5)).toBe(POLL_CAP_MS);
    expect(computeStatusPollDelay(1, POLL_TWO_MINUTES_MS + 1000, () => 0.5)).toBe(
      POLL_CAP_MS,
    );

    // Jitter bounds stay within [POLL_BASE_MS, POLL_CAP_MS]
    const low = computeStatusPollDelay(2, 0, () => 0);
    const high = computeStatusPollDelay(2, 0, () => 1);
    expect(low).toBeLessThan(high);
    expect(low).toBeGreaterThanOrEqual(POLL_BASE_MS);
    expect(high).toBeLessThanOrEqual(POLL_CAP_MS);
  });

  it('halts polling immediately when payment reaches terminal success state', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { status: 'processing', amount: 50, asset: 'USDC' } })
      .mockResolvedValueOnce({ data: { status: 'completed', amount: 50, asset: 'USDC' } });

    render(<PaymentStatusPage />);

    // First poll fires on mount
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    // Advance past first backoff window (~3s)
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Payment Successful/i)).toBeInTheDocument();

    // Advance 60 more seconds — no additional polls should fire
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('halts polling immediately when payment reaches terminal failed state', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'failed', amount: 50, asset: 'USDC' } });

    render(<PaymentStatusPage />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Payment Failed/i)).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
