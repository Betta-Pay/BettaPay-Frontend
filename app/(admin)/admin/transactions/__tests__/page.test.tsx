import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminTransactionsPage from '../page';

let mockSearchParams = new URLSearchParams();
const mockReplace = jest.fn();
const mockBump = { current: () => {} };
let mockReplaceMode: 'immediate' | 'deferred' = 'immediate';
const mockQueued: string[] = [];

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/admin/transactions',
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

const mockAdminGet = jest.fn();
jest.mock('@/lib/admin/client', () => ({
  adminGet: (path: string, signal?: AbortSignal) => mockAdminGet(path, signal),
}));

jest.mock('@/components/transactions/TransactionDrawer', () => ({
  TransactionDrawer: () => null,
}));

jest.mock('@/components/admin/AdminAccess', () => ({
  AdminAccess: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AdminState: () => null,
  useAdminAccess: () => true,
  useAdminOnline: () => true,
}));

// jsdom has no layout, so emulate a virtualizer that renders every row.
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 64,
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, size: 64, start: index * 64, key: index })),
  }),
}));

const transactions = {
  first: {
    id: 'tx_1', txHash: null, payerAddress: null, merchantId: 'merchant_1', amountUsdc: 10,
    amountNgn: null, fxRate: null, status: 'settled', source: null,
    createdAt: '2026-01-05T10:00:00.000Z', asset: 'USDC', kind: 'payment' as const,
  },
  second: {
    id: 'tx_2', txHash: null, payerAddress: null, merchantId: 'merchant_2', amountUsdc: 20,
    amountNgn: null, fxRate: null, status: 'pending', source: null,
    createdAt: '2026-01-06T10:00:00.000Z', asset: 'USDC', kind: 'payment' as const,
  },
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  function Harness() {
    const [, setTick] = React.useState(0);
    mockBump.current = () => setTick(tick => tick + 1);
    return <AdminTransactionsPage />;
  }
  return render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
}

/** Request URLs parsed into decoded search params, in call order. */
function requestParams(): URLSearchParams[] {
  return mockAdminGet.mock.calls.map(([path]) => new URL(path as string, 'http://localhost').searchParams);
}

function lastRequest(): URLSearchParams {
  const calls = requestParams();
  return calls[calls.length - 1];
}

/** Let effects, react-query notifications and the fetch promise settle (0ms timers only). */
async function settle(times = 4) {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
  }
}

function advance(ms: number) {
  act(() => { jest.advanceTimersByTime(ms); });
}

function applyUrl(url: string) {
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  mockSearchParams = new URLSearchParams(query);
  mockBump.current();
}

/** Apply the last URL a deferred router.replace was asked to navigate to. */
function commitNavigation() {
  const last = mockQueued[mockQueued.length - 1];
  mockQueued.length = 0;
  if (last) applyUrl(last);
}

beforeEach(() => {
  jest.useFakeTimers();
  mockSearchParams = new URLSearchParams();
  mockReplaceMode = 'immediate';
  mockQueued.length = 0;
  mockReplace.mockReset();
  mockReplace.mockImplementation((url: string) => {
    if (mockReplaceMode === 'deferred') { mockQueued.push(url); return; }
    applyUrl(url);
  });
  mockAdminGet.mockReset();
  mockAdminGet.mockImplementation((path: string) => {
    const cursor = new URL(path, 'http://localhost').searchParams.get('cursor');
    return Promise.resolve({ data: [cursor ? transactions.second : transactions.first], nextCursor: cursor ? null : 'cursor-1' });
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AdminTransactionsPage filter debouncing', () => {
  it('emits one request after rapid typing settles on the 300ms pause', async () => {
    renderPage();
    await settle();
    expect(mockAdminGet).toHaveBeenCalledTimes(1);

    const input = screen.getByLabelText('Merchant ID');
    for (const value of ['m', 'me', 'mer', 'merc']) {
      fireEvent.change(input, { target: { value } });
    }

    advance(299);
    await settle();
    expect(mockAdminGet).toHaveBeenCalledTimes(1);

    advance(1);
    await settle();
    expect(mockAdminGet).toHaveBeenCalledTimes(2);
    expect(lastRequest().get('merchantId')).toBe('merc');
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('merc');
  });

  it('debounces each text filter independently', async () => {
    renderPage();
    await settle();

    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'm1' } });
    advance(150);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'settled' } });

    // Only the merchant field has reached its 300ms pause.
    advance(150);
    await settle();
    expect(mockAdminGet).toHaveBeenCalledTimes(2);
    expect(lastRequest().get('merchantId')).toBe('m1');
    expect(lastRequest().get('status')).toBeNull();

    // The status field fires on its own timer, 300ms after it was edited.
    advance(150);
    await settle();
    expect(mockAdminGet).toHaveBeenCalledTimes(3);
    expect(lastRequest().get('merchantId')).toBe('m1');
    expect(lastRequest().get('status')).toBe('settled');
  });

  it('starts a fresh cursor query when a filter changes', async () => {
    renderPage();
    await settle();
    expect(lastRequest().get('cursor')).toBeNull();
    expect(screen.getByText('1 loaded. Automatic refresh pauses while this tab is hidden.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Load more transactions/i }));
    await settle();
    expect(lastRequest().get('cursor')).toBe('cursor-1');
    expect(screen.getByText('2 loaded. Automatic refresh pauses while this tab is hidden.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'm2' } });
    advance(300);
    await settle();

    const requests = requestParams();
    expect(requests).toHaveLength(3);
    expect(requests[2].get('merchantId')).toBe('m2');
    expect(requests[2].get('cursor')).toBeNull();
    expect(screen.getByText('1 loaded. Automatic refresh pauses while this tab is hidden.')).toBeInTheDocument();
  });

  it('clears drafts and URL without replaying a pending debounce', async () => {
    renderPage();
    await settle();

    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'stale' } });
    advance(300);
    await settle();
    expect(lastRequest().get('merchantId')).toBe('stale');

    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'pending' } });
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/i }));
    await settle();

    expect(screen.getByLabelText('Merchant ID')).toHaveValue('');
    expect(mockReplace).toHaveBeenLastCalledWith('/admin/transactions', { scroll: false });
    expect(lastRequest().get('merchantId')).toBeNull();
    const afterClear = mockAdminGet.mock.calls.length;

    // The cancelled debounce must not resurrect the typed value.
    advance(1000);
    await settle();
    expect(mockAdminGet).toHaveBeenCalledTimes(afterClear);
    expect(lastRequest().get('merchantId')).toBeNull();
    expect(screen.getByLabelText('Merchant ID')).toHaveValue('');
  });

  it('synchronizes external URL changes into the inputs and the query', async () => {
    renderPage();
    await settle();

    // A keystroke is still waiting on its debounce when the URL changes externally.
    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'pending' } });
    advance(100);
    mockSearchParams = new URLSearchParams('merchantId=external&status=settled');
    act(() => { mockBump.current(); });
    await settle();

    expect(screen.getByLabelText('Merchant ID')).toHaveValue('external');
    expect(screen.getByLabelText('Status')).toHaveValue('settled');
    expect(lastRequest().get('merchantId')).toBe('external');
    expect(lastRequest().get('status')).toBe('settled');

    advance(300);
    await settle();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(lastRequest().get('merchantId')).toBe('external');
  });

  it('applies date filters immediately with their ISO bounds', async () => {
    renderPage();
    await settle();

    fireEvent.change(screen.getByLabelText('From (UTC)'), { target: { value: '2026-01-05' } });
    await settle();
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(lastRequest().get('from')).toBe('2026-01-05T00:00:00.000Z');

    fireEvent.change(screen.getByLabelText('Through (UTC)'), { target: { value: '2026-01-09' } });
    await settle();
    expect(mockReplace).toHaveBeenCalledTimes(2);
    expect(lastRequest().get('from')).toBe('2026-01-05T00:00:00.000Z');
    expect(lastRequest().get('to')).toBe('2026-01-09T23:59:59.999Z');
  });

  it('clears several active filters at once without restoring stale values', async () => {
    renderPage();
    await settle();
    // Pause polling so a timer-driven refetch cannot be mistaken for a stale-filter write.
    fireEvent.change(screen.getByLabelText('Refresh interval'), { target: { value: '0' } });
    await settle();

    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'm1' } });
    advance(300);
    await settle();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'settled' } });
    advance(300);
    await settle();
    expect(lastRequest().get('merchantId')).toBe('m1');
    expect(lastRequest().get('status')).toBe('settled');

    // Both fields hold unsaved drafts when Clear resets drafts and URL together.
    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'm2' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'open' } });
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/i }));
    await settle();

    expect(screen.getByLabelText('Merchant ID')).toHaveValue('');
    expect(screen.getByLabelText('Status')).toHaveValue('');
    expect(mockReplace).toHaveBeenLastCalledWith('/admin/transactions', { scroll: false });
    const afterClear = mockAdminGet.mock.calls.length;
    expect(lastRequest().get('merchantId')).toBeNull();
    expect(lastRequest().get('status')).toBeNull();

    // Re-type only the merchant field so its reset timer outlives the status reset timer:
    // the first timer to fire must never re-apply the other field's old committed value.
    advance(200);
    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'z' } });

    advance(100);
    await settle();
    expect(mockAdminGet).toHaveBeenCalledTimes(afterClear);
    expect(lastRequest().get('merchantId')).toBeNull();
    expect(lastRequest().get('status')).toBeNull();

    advance(200);
    await settle();
    expect(mockAdminGet).toHaveBeenCalledTimes(afterClear + 1);
    expect(lastRequest().get('merchantId')).toBe('z');
    expect(lastRequest().get('status')).toBeNull();
    for (const request of requestParams().slice(afterClear - 1)) {
      expect(request.get('merchantId')).not.toBe('m1');
    }
  });

  it('does not restore filters removed by an external URL navigation', async () => {
    renderPage();
    await settle();
    // Pause polling so a timer-driven refetch cannot be mistaken for a stale-filter write.
    fireEvent.change(screen.getByLabelText('Refresh interval'), { target: { value: '0' } });
    await settle();

    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'm1' } });
    advance(300);
    await settle();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'settled' } });
    advance(300);
    await settle();
    expect(lastRequest().get('merchantId')).toBe('m1');
    expect(lastRequest().get('status')).toBe('settled');

    // Back/forward drops both filters while the reset debounces are in flight.
    const replacements = mockReplace.mock.calls.length;
    mockSearchParams = new URLSearchParams();
    act(() => { mockBump.current(); });
    await settle();

    expect(screen.getByLabelText('Merchant ID')).toHaveValue('');
    expect(screen.getByLabelText('Status')).toHaveValue('');
    const afterNavigation = mockAdminGet.mock.calls.length;

    // Re-type only the merchant field so its reset timer outlives the status reset timer.
    advance(150);
    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'y' } });

    advance(150);
    await settle();
    expect(mockAdminGet).toHaveBeenCalledTimes(afterNavigation);
    expect(mockReplace).toHaveBeenCalledTimes(replacements);
    expect(lastRequest().get('merchantId')).toBeNull();
    expect(lastRequest().get('status')).toBeNull();

    advance(200);
    await settle();
    expect(lastRequest().get('merchantId')).toBe('y');
    expect(lastRequest().get('status')).toBeNull();
    for (const request of requestParams().slice(afterNavigation - 1)) {
      expect(request.get('merchantId')).not.toBe('m1');
      expect(request.get('status')).not.toBe('settled');
    }
  });

  it('preserves a pending text draft through date and sorting changes', async () => {
    renderPage();
    await settle();

    fireEvent.change(screen.getByLabelText('From (UTC)'), { target: { value: '2026-01-05' } });
    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'abc' } });
    await settle();

    expect(lastRequest().get('from')).toBe('2026-01-05T00:00:00.000Z');
    expect(lastRequest().get('merchantId')).toBeNull();
    expect(screen.getByLabelText('Merchant ID')).toHaveValue('abc');

    advance(300);
    await settle();
    expect(lastRequest().get('from')).toBe('2026-01-05T00:00:00.000Z');
    expect(lastRequest().get('merchantId')).toBe('abc');

    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'abcd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    await settle();

    expect(screen.getByLabelText('Merchant ID')).toHaveValue('abcd');
    expect(lastRequest().get('sort')).toBe('status');
    expect(lastRequest().get('merchantId')).toBe('abc');
    expect(lastRequest().get('from')).toBe('2026-01-05T00:00:00.000Z');

    advance(300);
    await settle();
    expect(lastRequest().get('merchantId')).toBe('abcd');
    expect(lastRequest().get('sort')).toBe('status');
    expect(lastRequest().get('from')).toBe('2026-01-05T00:00:00.000Z');
  });

  it('composes sorting onto an uncommitted text-filter write', async () => {
    renderPage();
    await settle();
    mockReplaceMode = 'deferred';

    fireEvent.change(screen.getByLabelText('Merchant ID'), { target: { value: 'abc' } });
    advance(300);
    await settle();
    expect(mockQueued).toHaveLength(1);

    // The debounce has committed, but the router has not applied it yet when the user sorts.
    fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    await settle();
    expect(mockQueued).toHaveLength(2);
    expect(mockQueued[1]).toContain('merchantId=abc');

    mockReplaceMode = 'immediate';
    commitNavigation();
    await settle();

    expect(lastRequest().get('merchantId')).toBe('abc');
    expect(lastRequest().get('sort')).toBe('status');
    expect(lastRequest().get('cursor')).toBeNull();
    expect(screen.getByLabelText('Merchant ID')).toHaveValue('abc');
  });
});
