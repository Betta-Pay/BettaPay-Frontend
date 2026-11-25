/**
 * The admin overview must never render NaN%, Infinity or undefined when the
 * stats endpoint returns zeroed, null or missing figures (issue #1116).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AdminStats } from '@/lib/api/hooks';

const mockUseAdminStats = jest.fn();

jest.mock('@/lib/api/hooks', () => ({
  useAdminStats: () => mockUseAdminStats(),
}));

jest.mock('next/dynamic', () => () => function DynamicStub() {
  return <div data-testid="chart-stub" />;
});

jest.mock('@/components/admin/SystemHealthCard', () => ({
  SystemHealthCard: () => <div data-testid="system-health-stub" />,
}));

import AdminOverviewPage from '@/app/(admin)/overview/page';

function withStats(data: unknown) {
  mockUseAdminStats.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    isSampleData: false,
  });
}

const positive: AdminStats = {
  totalProcessed: 1452310.89,
  totalProcessedChangePct: 12.5,
  platformFees: 14523.1,
  feeRatePct: 1,
  activeMerchants: 142,
  newMerchantsThisWeek: 12,
  pendingKyb: 8,
};

function expectNoBrokenNumbers() {
  const text = document.body.textContent ?? '';
  expect(text).not.toMatch(/NaN/);
  expect(text).not.toMatch(/Infinity/);
  expect(text).not.toMatch(/undefined/);
  expect(text).not.toMatch(/\bnull\b/);
}

describe('AdminOverviewPage KPI cards', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders positive stats with a signed change and a new-merchants count', () => {
    withStats(positive);
    render(<AdminOverviewPage />);

    expect(screen.getByText('+12.5% from last month')).toBeInTheDocument();
    expect(screen.getByText('1.0% flat fee across volume')).toBeInTheDocument();
    expect(screen.getByText('+12 new this week')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expectNoBrokenNumbers();
  });

  it('shows 0% for a zero change and does not crash on all-zero stats', () => {
    withStats({
      totalProcessed: 0,
      totalProcessedChangePct: 0,
      platformFees: 0,
      feeRatePct: 0,
      activeMerchants: 0,
      newMerchantsThisWeek: 0,
      pendingKyb: 0,
    });
    render(<AdminOverviewPage />);

    expect(screen.getByText('0% from last month')).toBeInTheDocument();
    expect(screen.getByText('0.0% flat fee across volume')).toBeInTheDocument();
    expect(screen.getByText('0 new this week')).toBeInTheDocument();
    expectNoBrokenNumbers();
  });

  it('shows an em dash for null and missing figures instead of throwing', () => {
    withStats({
      totalProcessed: null,
      totalProcessedChangePct: null,
      platformFees: null,
      activeMerchants: null,
      pendingKyb: undefined,
    });

    expect(() => render(<AdminOverviewPage />)).not.toThrow();
    expect(screen.getByText('— from last month')).toBeInTheDocument();
    expect(screen.getByText('— flat fee across volume')).toBeInTheDocument();
    expect(screen.getByText('— new this week')).toBeInTheDocument();
    expectNoBrokenNumbers();
  });

  it('shows an em dash for NaN and Infinity figures', () => {
    withStats({
      totalProcessed: Number.NaN,
      totalProcessedChangePct: Number.POSITIVE_INFINITY,
      platformFees: Number.POSITIVE_INFINITY,
      feeRatePct: Number.NaN,
      activeMerchants: Number.NaN,
      newMerchantsThisWeek: Number.NaN,
      pendingKyb: Number.POSITIVE_INFINITY,
    });
    render(<AdminOverviewPage />);

    expect(screen.getByText('— from last month')).toBeInTheDocument();
    expectNoBrokenNumbers();
  });

  it('derives the fee rate from fees and volume when the API omits it, and shows a dash when volume is zero', () => {
    withStats({ ...positive, feeRatePct: undefined, platformFees: 50, totalProcessed: 5000 });
    const { unmount } = render(<AdminOverviewPage />);
    expect(screen.getByText('1.0% flat fee across volume')).toBeInTheDocument();
    unmount();

    withStats({ ...positive, feeRatePct: undefined, platformFees: 50, totalProcessed: 0 });
    render(<AdminOverviewPage />);
    expect(screen.getByText('— flat fee across volume')).toBeInTheDocument();
    expectNoBrokenNumbers();
  });

  it('keeps the minus sign for a negative change', () => {
    withStats({ ...positive, totalProcessedChangePct: -4.2 });
    render(<AdminOverviewPage />);

    expect(screen.getByText('-4.2% from last month')).toBeInTheDocument();
  });
});
