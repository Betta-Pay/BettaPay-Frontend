/**
 * MerchantsKybPage must load the queue through the shared `apiClient`-backed
 * hook (so auth / CSRF / refresh interceptors apply) and must never render
 * "NaNd ago" for a missing or invalid submission date (issue #1118).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';

const mockUseKybMerchants = jest.fn();

jest.mock('@/lib/api/hooks', () => ({
  useKybMerchants: (status?: string) => mockUseKybMerchants(status),
}));

// A raw axios call from the page would bypass the interceptors; fail loudly.
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => {
      throw new Error('raw axios.get must not be used by MerchantsKybPage');
    }),
    post: jest.fn(),
  },
}));

jest.mock('@/components/admin/KybReviewPane', () => ({
  __esModule: true,
  default: () => <div data-testid="kyb-review-pane" />,
}));

import MerchantsKybPage from '@/app/(admin)/merchants/kyb/page';

function merchant(overrides: Record<string, unknown> = {}) {
  return {
    merchantId: 'm_1',
    businessName: 'Acme Ltd',
    businessType: 'LLC',
    country: 'NG',
    industry: 'Retail',
    contactEmail: 'ops@acme.test',
    phoneNumber: null,
    registrationNumber: null,
    taxId: null,
    websiteUrl: null,
    kybStatus: 'pending',
    submittedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    documents: [],
    ...overrides,
  };
}

function mockHook(data: unknown[]) {
  mockUseKybMerchants.mockReturnValue({
    data,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MerchantsKybPage />
    </QueryClientProvider>,
  );
}

describe('MerchantsKybPage', () => {
  afterEach(() => jest.clearAllMocks());

  it('loads the queue through useKybMerchants with the current filter, not raw axios', () => {
    mockHook([merchant()]);
    renderPage();

    expect(mockUseKybMerchants).toHaveBeenCalledWith('all');
    expect(axios.get).not.toHaveBeenCalled();
    expect(screen.getByText('Acme Ltd')).toBeInTheDocument();
  });

  it('renders a relative time for a valid submission date', () => {
    mockHook([merchant()]);
    renderPage();

    expect(screen.getByText('3h ago')).toBeInTheDocument();
  });

  it('renders "Unknown" instead of "NaNd ago" for null and invalid dates', () => {
    mockHook([
      merchant({ merchantId: 'm_null', businessName: 'Null Co', submittedAt: null }),
      merchant({ merchantId: 'm_bad', businessName: 'Bad Co', submittedAt: 'not-a-date' }),
    ]);
    renderPage();

    expect(screen.getAllByText('Unknown')).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('shows the hook error state', () => {
    mockUseKybMerchants.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: 'Request failed',
      refetch: jest.fn(),
    });
    renderPage();

    expect(screen.getByText(/Failed to load KYB queue/i)).toBeInTheDocument();
  });
});
