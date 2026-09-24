import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KybDocumentsPanel } from '../KybDocumentsPanel';

/**
 * KybDocumentsPanel fetches via the React Query hook `useMerchantKyb`. The
 * unit tests mock the hook at the module boundary (the repo convention, see
 * `KybDocumentRow.test.tsx`) and drive the three states that matter here:
 * normal render, a render throw isolated by the ErrorBoundary, and recovery
 * via the fallback's Retry action.
 */

type KybData = {
  merchantId: string;
  kybStatus: string;
  rejectionReason: string | null;
  documents: Array<{ type: string }>;
};

type MerchantKybResult = {
  data: KybData;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

const mockUseMerchantKyb = jest.fn<MerchantKybResult, [string]>();

jest.mock('@/lib/kyc/api', () => ({
  // The panel reads `kybQueryKeys.profile` to invalidate the cached query on
  // retry; keep the real shape so the retry path is exercised end-to-end.
  kybQueryKeys: { profile: (id?: string) => ['merchant', id ?? null, 'kyb'] },
  useMerchantKyb: (merchantId: string) => mockUseMerchantKyb(merchantId),
}));

// Keep the boundary's reporting side effect out of the unit test.
jest.mock('@/lib/errorReporting', () => ({
  captureException: jest.fn(),
}));

// Throw toggle: when set, the row render throws, simulating a malformed
// payload or a bug deep in the panel body.
let shouldThrow = false;

jest.mock('../KybDocumentRow', () => ({
  KybDocumentRow: () => {
    if (shouldThrow) throw new Error('malformed KYB payload');
    return <div data-testid="doc-row" />;
  },
}));

jest.mock('../KybStatusBadge', () => ({
  KybStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

// Lucide v1 reads an internal theme context that jsdom tests don't set up;
// stub the icons the panel and its fallback render (repo convention, see
// googleLoginFallback test).
jest.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  ShieldCheck: () => null,
  AlertCircle: () => null,
  RotateCcw: () => null,
}));

function healthyKyb(merchantId: string): KybData {
  return {
    merchantId,
    kybStatus: 'unverified',
    rejectionReason: null,
    documents: [{ type: 'certificate_of_incorporation' }],
  };
}

function mockHealthyHook(merchantId = 'm-1') {
  mockUseMerchantKyb.mockImplementation(() => ({
    data: healthyKyb(merchantId),
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }));
}

/**
 * A sibling "dashboard" node that is genuinely interactive: clicking it
 * re-renders the panel beneath it, exactly as a state change in a real page
 * re-renders the panel embedded within it. The render prop (rather than
 * `children`) matters — re-invoking it on each render creates a fresh panel
 * element, so the body really re-renders instead of React bailing out on an
 * identical element reference.
 */
function InteractiveSibling({
  renderChildren,
}: {
  renderChildren: () => React.ReactNode;
}) {
  const [, setBump] = React.useState(0);
  return (
    <div>
      <button
        type="button"
        data-testid="sibling"
        onClick={() => setBump((n) => n + 1)}
      >
        dashboard stays interactive
      </button>
      {renderChildren()}
    </div>
  );
}

/**
 * Renders the panel with an interactive sibling and a QueryClientProvider,
 * mirroring how the panel is embedded in a page.
 */
function renderPanel(merchantId = 'm-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <InteractiveSibling
        renderChildren={() => <KybDocumentsPanel merchantId={merchantId} />}
      />
    </QueryClientProvider>
  );
  return { ...utils, invalidateSpy, queryClient };
}

describe('KybDocumentsPanel error boundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    shouldThrow = false;
    mockUseMerchantKyb.mockReset();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders the panel normally when the data loads', () => {
    mockHealthyHook();

    renderPanel();

    expect(screen.getByText('Business verification (KYB)')).toBeInTheDocument();
    expect(screen.getAllByTestId('doc-row').length).toBeGreaterThan(0);
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('isolates a render throw to the panel: fallback replaces the panel while sibling content stays mounted', () => {
    mockHealthyHook();

    renderPanel();

    // The body throws on mount (malformed payload from the API).
    shouldThrow = true;

    // Force a parent re-render so the body renders again with the throwing
    // row; the boundary must contain it.
    fireEvent.click(screen.getByTestId('sibling'));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // The sibling is untouched and the panel shows its local fallback…
    expect(screen.getByTestId('sibling')).toBeInTheDocument();
    expect(
      screen.getByText(/couldn't load your verification documents/i)
    ).toBeInTheDocument();

    // …the card chrome stays (fallback renders in place, not a white screen)…
    expect(screen.getByText('Business verification (KYB)')).toBeInTheDocument();

    // …and no default route-level fallback leaked through.
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /go to dashboard/i })
    ).not.toBeInTheDocument();
  });

  it('recovers to the normal panel view when Retry is pressed and the error is gone', () => {
    mockHealthyHook();

    renderPanel();

    shouldThrow = true;
    fireEvent.click(screen.getByTestId('sibling'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('doc-row')).not.toBeInTheDocument();

    // Underlying error clears (backend healthy again)…
    shouldThrow = false;

    // …then the user retries and the panel remounts.
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('doc-row').length).toBeGreaterThan(0);
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
  });

  it('Retry re-attempts the fetch: the KYB query is invalidated and the body remounts', () => {
    mockHealthyHook();

    const { invalidateSpy } = renderPanel();

    const hookCallsBeforeError = mockUseMerchantKyb.mock.calls.length;

    shouldThrow = true;
    fireEvent.click(screen.getByTestId('sibling'));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // The failed body is unmounted while the fallback shows.
    const hookCallsAtError = mockUseMerchantKyb.mock.calls.length;

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    // The cached (possibly malformed) KYB payload was invalidated so the
    // remounted body refetches instead of replaying stale data.
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['merchant', 'm-1', 'kyb'],
    });

    // The data hook that drives the document-status fetch ran again — a fresh
    // mount of the body, not just a repaint of the stale failed render.
    expect(mockUseMerchantKyb.mock.calls.length).toBeGreaterThan(
      hookCallsAtError
    );
    expect(mockUseMerchantKyb.mock.calls.length).toBeGreaterThan(
      hookCallsBeforeError
    );
    expect(mockUseMerchantKyb).toHaveBeenLastCalledWith('m-1');
  });
});
