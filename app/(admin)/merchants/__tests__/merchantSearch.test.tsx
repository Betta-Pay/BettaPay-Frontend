import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MerchantsPage from '../page';
import { useMerchants } from '@/lib/hooks/useMerchants';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: null, isLoading: false, error: null, refetch: jest.fn() }),
}));

jest.mock('@/components/admin/AdminAccess', () => ({
  AdminAccess: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AdminState: ({ empty }: { empty: boolean }) => (empty ? <p>No matching merchants found</p> : null),
  useAdminAccess: () => true,
  useAdminOnline: () => true,
}));

jest.mock('@/lib/hooks/useMerchants', () => ({
  useMerchants: jest.fn(),
}));

const sampleMerchants = [
  {
    id: 'm_1',
    businessName: 'Lagos Solar Mart',
    contactEmail: 'billing@lagossolar.ng',
    publicKey: 'GB7TAYRUZGE6TVT7NHP5SMIZRNQA6PLM423EYISAOAP3MKYIQMVYP2JO',
    country: 'Nigeria',
    status: 'active',
    kycStatus: 'approved',
    reviewerId: null,
    paymentCount: 14,
    settlementCount: 5,
    lastActivity: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'm_2',
    businessName: 'Nairobi Coffee Exports',
    contactEmail: 'ops@nairobicoffee.ke',
    publicKey: 'GD5DJQDDBKGAYNEAXU562HYGOOSYAEOO6AS53PZXBOZGCP5M2OPGMZV3',
    country: 'Kenya',
    status: 'active',
    kycStatus: 'pending',
    reviewerId: null,
    paymentCount: 4,
    settlementCount: 1,
    lastActivity: null,
  },
];

describe('MerchantsPage debounced search and match highlighting (#931)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (useMerchants as jest.Mock).mockReturnValue({
      merchants: sampleMerchants,
      isLoading: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
      action: { mutateAsync: jest.fn(), isPending: false, reset: jest.fn(), error: null },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('debounces search input by 300ms, filters by Stellar public key or name, and highlights matched text', () => {
    render(<MerchantsPage />);

    const searchInput = screen.getByLabelText('Search merchants');
    fireEvent.change(searchInput, { target: { value: 'GB7TAY' } });

    // While debouncing, loading skeleton is visible
    expect(screen.getByTestId('merchants-search-skeleton')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.queryByTestId('merchants-search-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('Lagos Solar Mart')).toBeInTheDocument();
    expect(screen.queryByText('Nairobi Coffee Exports')).not.toBeInTheDocument();

    const highlighted = document.querySelector('mark');
    expect(highlighted).not.toBeNull();
    expect(highlighted?.textContent).toBe('GB7TAY');
  });
});
