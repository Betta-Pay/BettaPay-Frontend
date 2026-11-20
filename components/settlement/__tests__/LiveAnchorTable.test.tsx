/**
 * SEP protocol filtering for the live anchor table: the merchant-facing
 * fiat-settlements table must let users filter anchors by the Stellar SEP
 * protocols they support (SEP-24 / SEP-31) and show a badge per protocol.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LiveAnchorTable from '../LiveAnchorTable';
import { apiClient } from '@/lib/api/axios';
import type { Anchor } from '@/lib/types';

jest.mock('@/lib/api/axios', () => ({
  apiClient: { get: jest.fn() },
}));

function makeAnchor(overrides: Partial<Anchor> = {}): Anchor {
  return {
    id: 'anc_x',
    name: 'Anchor',
    code: 'ANCHOR',
    currency: 'USD',
    country: 'United States',
    flag: '',
    kycLevels: ['basic'],
    settlementTime: 'Instant',
    protocols: ['SEP-24'],
    websiteUrl: null,
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const anchors: Anchor[] = [
  makeAnchor({ id: 'anc_24', name: 'Interactive Anchor', protocols: ['SEP-24'] }),
  makeAnchor({ id: 'anc_31', name: 'Payments Anchor', protocols: ['SEP-31'] }),
  makeAnchor({ id: 'anc_both', name: 'Universal Anchor', protocols: ['SEP-24', 'SEP-31'] }),
];

function renderTable() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LiveAnchorTable />
    </QueryClientProvider>
  );
}

describe('LiveAnchorTable SEP protocol filter', () => {
  const mockGet = apiClient.get as jest.Mock;

  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: { data: anchors } });
  });

  it('renders every anchor and protocol badges by default', async () => {
    renderTable();

    await waitFor(() => expect(screen.getByText('Interactive Anchor')).toBeInTheDocument());
    expect(screen.getByText('Payments Anchor')).toBeInTheDocument();
    expect(screen.getByText('Universal Anchor')).toBeInTheDocument();

    // SEP-24 / SEP-31 badges are rendered as table cell text.
    expect(screen.getAllByText('SEP-24').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SEP-31').length).toBeGreaterThan(0);
  });

  it('filters to SEP-24 anchors only', async () => {
    const user = userEvent.setup();
    renderTable();

    await waitFor(() => expect(screen.getByText('Interactive Anchor')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: 'SEP-24' }));

    expect(screen.getByText('Interactive Anchor')).toBeInTheDocument();
    expect(screen.getByText('Universal Anchor')).toBeInTheDocument();
    expect(screen.queryByText('Payments Anchor')).not.toBeInTheDocument();
  });

  it('filters to SEP-31 anchors only', async () => {
    const user = userEvent.setup();
    renderTable();

    await waitFor(() => expect(screen.getByText('Payments Anchor')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: 'SEP-31' }));

    expect(screen.getByText('Payments Anchor')).toBeInTheDocument();
    expect(screen.getByText('Universal Anchor')).toBeInTheDocument();
    expect(screen.queryByText('Interactive Anchor')).not.toBeInTheDocument();
  });

  it('shows an empty state when no anchor supports the selected protocol', async () => {
    mockGet.mockResolvedValue({ data: { data: [makeAnchor({ name: 'Only SEP-24', protocols: ['SEP-24'] })] } });
    const user = userEvent.setup();
    renderTable();

    await waitFor(() => expect(screen.getByText('Only SEP-24')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: 'SEP-31' }));

    expect(screen.getByText('No anchors support SEP-31.')).toBeInTheDocument();
  });
});
