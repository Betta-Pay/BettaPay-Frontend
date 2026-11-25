import React from 'react';
import { render, screen, act } from '@testing-library/react';

// ── next/navigation ──────────────────────────────────────────────────────────
let mockSearchStatus: string | null = 'processing';
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ txId: 'pay_test_123' }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'status' ? mockSearchStatus : null),
  }),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

// ── framer-motion ────────────────────────────────────────────────────────────
jest.mock('framer-motion', () => {
  const motionProps = new Set(['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout']);
  const motion = new Proxy(
    {},
    {
      get: (_target, prop) => {
        const Component = ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => {
          const domProps = Object.fromEntries(
            Object.entries(rest).filter(([key]) => !motionProps.has(key)),
          );
          return React.createElement(prop as string, domProps, children);
        };
        return Component;
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// ── api client ───────────────────────────────────────────────────────────────
jest.mock('@/lib/api/axios', () => ({
  apiClient: { get: jest.fn() },
}));

import { apiClient } from '@/lib/api/axios';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';
import PaymentStatusPage from '../page';

const getMock = apiClient.get as jest.Mock;
const TX_ID = 'pay_test_123';
const REAL_HASH = 'f'.repeat(64);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchStatus = 'processing';
});

afterEach(() => {
  jest.useRealTimers();
});

describe('PaymentStatusPage - real payment data', () => {
  it('renders the amount and tx hash from a { data: payment } envelope instead of placeholders', async () => {
    getMock.mockResolvedValue({
      data: {
        data: {
          id: TX_ID,
          status: 'completed',
          amount: '250.5',
          asset: 'USDC',
          txHash: REAL_HASH,
        },
      },
    });

    render(<PaymentStatusPage />);

    expect(await screen.findByText('Payment Successful')).toBeInTheDocument();
    expect(screen.getByText(/250\.50/)).toBeInTheDocument();
    expect(screen.queryByText(/BettaPay Merchant LLC/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Merchant Corp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^To /)).not.toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', getStellarExplorerTxUrl(REAL_HASH));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('href')).toContain(REAL_HASH);
  });

  it('still accepts a flat payload and the documented amountUsdc field', async () => {
    getMock.mockResolvedValue({
      data: { status: 'success', amountUsdc: 12.5, asset: 'USDC' },
    });

    render(<PaymentStatusPage />);

    expect(await screen.findByText('Payment Successful')).toBeInTheDocument();
    expect(screen.getByText(/12\.50/)).toBeInTheDocument();
  });

  it('omits the Network Hash row and explorer link when the payload has no txHash', async () => {
    getMock.mockResolvedValue({
      data: { data: { status: 'completed', amount: '10', asset: 'USDC', txHash: null } },
    });

    render(<PaymentStatusPage />);

    expect(await screen.findByText('Payment Successful')).toBeInTheDocument();
    expect(screen.queryByText('Network Hash')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('treats an empty or whitespace txHash as missing', async () => {
    getMock.mockResolvedValue({
      data: { data: { status: 'completed', amount: '10', asset: 'USDC', txHash: '   ' } },
    });

    render(<PaymentStatusPage />);

    expect(await screen.findByText('Payment Successful')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a dash rather than inventing an amount when the payload has none', async () => {
    getMock.mockResolvedValue({
      data: { data: { status: 'completed', asset: 'USDC', txHash: REAL_HASH } },
    });

    render(<PaymentStatusPage />);

    expect(await screen.findByText('Payment Successful')).toBeInTheDocument();
    expect(screen.getByLabelText('No amount')).toBeInTheDocument();
  });
});

describe('PaymentStatusPage - backend status vocabulary', () => {
  it('renders failure for the backend "failed" status', async () => {
    getMock.mockResolvedValue({ data: { data: { status: 'failed' } } });

    render(<PaymentStatusPage />);

    expect(await screen.findByText('Payment Failed')).toBeInTheDocument();
  });

  it('renders failure for the backend "cancelled" status', async () => {
    getMock.mockResolvedValue({ data: { data: { status: 'cancelled' } } });

    render(<PaymentStatusPage />);

    expect(await screen.findByText('Payment Failed')).toBeInTheDocument();
  });

  it('keeps polling while the payment is "initiated"', async () => {
    jest.useFakeTimers();
    getMock.mockResolvedValue({ data: { data: { status: 'initiated' } } });

    render(<PaymentStatusPage />);

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(screen.getByText('Confirming Payment')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(POLL_FIRST_DELAY);
    });

    expect(screen.getByText('Confirming Payment')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});

const POLL_FIRST_DELAY = 4_500; // 3000 * 1.5^1

describe('PaymentStatusPage - polling lifecycle', () => {
  it('does not stack poll loops when restart is triggered twice before the kickoff fires', async () => {
    jest.useFakeTimers();
    mockSearchStatus = 'timeout';
    getMock.mockResolvedValue({ data: { data: { status: 'initiated' } } });

    render(<PaymentStatusPage />);
    expect(screen.getByText('Still Confirming')).toBeInTheDocument();

    const restart = screen.getByRole('button', { name: /Check Again/i });
    act(() => {
      restart.click();
      restart.click();
    });

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    expect(getMock).toHaveBeenCalledTimes(1);

    // One request per interval — a second loop would double this.
    await act(async () => {
      jest.advanceTimersByTime(POLL_FIRST_DELAY);
    });
    expect(getMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(6_750); // 3000 * 1.5^2
    });
    expect(getMock).toHaveBeenCalledTimes(3);

    await act(async () => {
      jest.advanceTimersByTime(10_125); // 3000 * 1.5^3
    });
    expect(getMock).toHaveBeenCalledTimes(4);
  });

  it('stops polling once a terminal status is reached', async () => {
    jest.useFakeTimers();
    getMock.mockResolvedValue({ data: { data: { status: 'completed', amount: '5' } } });

    render(<PaymentStatusPage />);

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(screen.getByText('Payment Successful')).toBeInTheDocument();
    expect(jest.getTimerCount()).toBe(0);

    await act(async () => {
      jest.advanceTimersByTime(120_000);
    });

    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending timer and ignores an in-flight response after unmount', async () => {
    jest.useFakeTimers();
    const pending = deferred<{ data: unknown }>();
    getMock.mockReturnValue(pending.promise);

    const { unmount } = render(<PaymentStatusPage />);

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    expect(getMock).toHaveBeenCalledTimes(1);

    unmount();
    expect(jest.getTimerCount()).toBe(0);

    // The response arrives after unmount; it must not schedule another loop.
    await act(async () => {
      pending.resolve({ data: { data: { status: 'initiated' } } });
    });
    await act(async () => {
      jest.advanceTimersByTime(120_000);
    });

    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('restarts polling from the timeout card', async () => {
    jest.useFakeTimers();
    mockSearchStatus = 'timeout';

    const pending = deferred<{ data: unknown }>();
    getMock.mockReturnValue(pending.promise);

    render(<PaymentStatusPage />);

    const restart = screen.getByRole('button', { name: /Check Again/i });
    act(() => {
      restart.click();
    });

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    expect(getMock).toHaveBeenCalledTimes(1);

    // The restarted loop is live: a response is in flight, no timer pending.
    expect(jest.getTimerCount()).toBe(0);

    await act(async () => {
      pending.resolve({ data: { data: { status: 'failed' } } });
    });

    expect(screen.getByText('Payment Failed')).toBeInTheDocument();
  });

  it('reaches the timeout state after the full retry budget, then stops', async () => {
    jest.useFakeTimers();
    getMock.mockResolvedValue({ data: { data: { status: 'initiated' } } });

    render(<PaymentStatusPage />);

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    // Each loop iteration fires the timer scheduled by the previous response;
    // the response that exhausts the budget must not schedule another one.
    for (let i = 0; i < 60 && !screen.queryByText('Still Confirming'); i += 1) {
      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
    }

    expect(screen.getByText('Still Confirming')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(60);
    expect(jest.getTimerCount()).toBe(0);

    await act(async () => {
      jest.advanceTimersByTime(600_000);
    });

    expect(getMock).toHaveBeenCalledTimes(60);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('retries a rejected request with backoff and stops after unmount', async () => {
    jest.useFakeTimers();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    getMock.mockRejectedValue(new Error('network down'));

    const { unmount } = render(<PaymentStatusPage />);

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    // Rejection is non-terminal: the same backoff schedule still applies.
    await act(async () => {
      jest.advanceTimersByTime(POLL_FIRST_DELAY);
    });
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledTimes(2);

    unmount();
    expect(jest.getTimerCount()).toBe(0);

    await act(async () => {
      jest.advanceTimersByTime(600_000);
    });
    expect(getMock).toHaveBeenCalledTimes(2);

    errorSpy.mockRestore();
  });

  it('discards a request that was in flight when polling restarted', async () => {
    jest.useFakeTimers();
    mockSearchStatus = 'timeout';

    const stale = deferred<{ data: unknown }>();
    const current = deferred<{ data: unknown }>();
    getMock.mockResolvedValue({ data: { data: { status: 'initiated' } } });
    getMock.mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise);

    render(<PaymentStatusPage />);
    const restart = screen.getByRole('button', { name: /Check Again/i });

    act(() => {
      restart.click(); // restart #1 → schedules the tracked kickoff
      jest.advanceTimersByTime(0); // kickoff fires; request A is in flight
      restart.click(); // restart #2 while request A is still pending
    });

    await act(async () => {
      jest.advanceTimersByTime(0); // kickoff for the newer run; request B
    });

    expect(getMock).toHaveBeenCalledTimes(2);

    // The superseded run resolves as a terminal success after the restart.
    await act(async () => {
      stale.resolve({
        data: { data: { status: 'completed', amount: '999', txHash: REAL_HASH } },
      });
    });

    expect(screen.queryByText('Payment Successful')).not.toBeInTheDocument();
    expect(screen.getByText('Confirming Payment')).toBeInTheDocument();
    expect(jest.getTimerCount()).toBe(0); // the stale response scheduled nothing

    // The newer run is still the only one driving the loop.
    await act(async () => {
      current.resolve({ data: { data: { status: 'initiated' } } });
    });
    expect(jest.getTimerCount()).toBe(1);

    await act(async () => {
      jest.advanceTimersByTime(POLL_FIRST_DELAY);
    });
    expect(getMock).toHaveBeenCalledTimes(3);
  });
});
