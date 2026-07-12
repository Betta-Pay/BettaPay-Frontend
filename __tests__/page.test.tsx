/* eslint-disable react/display-name, @typescript-eslint/no-explicit-any */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardPage from '@/app/(merchant)/dashboard/page';

// Mock the auth store to return a merchant user
jest.mock('@/lib/store/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    user: {
      id: 'GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD',
      email: 'merchant@example.com',
      name: 'Merchant User',
      role: 'merchant',
    },
  })),
}));


const mockPayments = [
  { id: 'pay_1', txHash: 'hash1', payerAddress: 'GAAA1111', merchantId: 'm_1', amountUsdc: 750, amountNgn: 1162500, fxRate: 1550, status: 'success', source: 'Consulting Retainer', createdAt: new Date().toISOString() },
  { id: 'pay_2', txHash: 'hash2', payerAddress: 'GBBB2222', merchantId: 'm_1', amountUsdc: 45.5, amountNgn: 70525, fxRate: 1550, status: 'success', source: 'E-commerce Payment', createdAt: new Date().toISOString() },
  { id: 'pay_3', txHash: 'hash3', payerAddress: 'GCCC3333', merchantId: 'm_1', amountUsdc: 1200, amountNgn: 1860000, fxRate: 1550, status: 'pending', source: 'Invoice #1042', createdAt: new Date().toISOString() },
  { id: 'pay_4', txHash: 'hash4', payerAddress: 'GDDD4444', merchantId: 'm_1', amountUsdc: 29, amountNgn: 44950, fxRate: 1550, status: 'success', source: 'Subscription Fee', createdAt: new Date().toISOString() },
  { id: 'pay_5', txHash: 'hash5', payerAddress: 'GEEE5555', merchantId: 'm_1', amountUsdc: 3500, amountNgn: 5425000, fxRate: 1550, status: 'success', source: 'Freelance Project', createdAt: new Date().toISOString() },
];

jest.mock('@/lib/api/hooks', () => ({
  usePayments: () => ({ data: mockPayments, isLoading: false, error: null, refetch: jest.fn() }),
  useSettlements: () => ({ data: [], isLoading: false, error: null, refetch: jest.fn() }),
}));

// Mock next/link to render standard anchors
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock recharts because ResponsiveContainer needs actual DOM measurements which JSDOM lacks
jest.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    AreaChart: ({ children, data }: any) => (
      <svg data-testid="area-chart" data-data={JSON.stringify(data)}>
        {children}
      </svg>
    ),
    Area: () => <g data-testid="area-chart-area" />,
    XAxis: () => <g data-testid="area-chart-xaxis" />,
    YAxis: () => <g data-testid="area-chart-yaxis" />,
    Tooltip: () => <g data-testid="area-chart-tooltip" />,
    CartesianGrid: () => <g data-testid="area-chart-grid" />,
  };
});

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Merchant Dashboard Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the welcome message with merchant name', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Good day, Merchant/i)).toBeInTheDocument();
  });

  it('renders all 4 KPI cards with correct mock values', () => {
    render(<DashboardPage />);

    // KPI Card 1: Total Volume (30d) -> USDC 45,231.89
    expect(screen.getByText(/Total Volume \(30d\)/i)).toBeInTheDocument();
    expect(screen.getByText(/USDC 45,231.89/i)).toBeInTheDocument();

    // KPI Card 2: Active Payment Links -> 12
    expect(screen.getByText(/Active Payment Links/i)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    // KPI Card 3: Available to Settle -> USDC 12,450.00
    expect(screen.getByText(/Available to Settle/i)).toBeInTheDocument();
    expect(screen.getByText(/USDC 12,450.00/i)).toBeInTheDocument();

    // KPI Card 4: Current FX Rate -> ₦1,550
    expect(screen.getByText(/Current FX Rate/i)).toBeInTheDocument();
    expect(screen.getByText('₦1,550')).toBeInTheDocument();
  });

  it('renders the chart with correct container and SVG element', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders the list of recent transactions from mock data', () => {
    render(<DashboardPage />);
    expect(screen.getAllByText('Consulting Retainer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('E-commerce Payment').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Invoice #1042').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Subscription Fee').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Freelance Project').length).toBeGreaterThan(0);

    // Verify amounts are visible (formatted with CurrencyDisplay)
    expect(screen.getByText(/USDC 750/i)).toBeInTheDocument();
    expect(screen.getByText(/USDC 45\.50/i)).toBeInTheDocument();
    expect(screen.getByText(/USDC 1,200/i)).toBeInTheDocument();
    expect(screen.getByText(/USDC 29/i)).toBeInTheDocument();
    expect(screen.getByText(/USDC 3,500/i)).toBeInTheDocument();
  });

  it('updates the active period toggle button state on click', () => {
    render(<DashboardPage />);

    const btn7D = screen.getByRole('button', { name: '7D' });
    const btn30D = screen.getByRole('button', { name: '30D' });
    const btn90D = screen.getByRole('button', { name: '90D' });

    // '7D' should be active by default (containing 'bg-card')
    expect(btn7D).toHaveClass('bg-card');
    expect(btn30D).not.toHaveClass('bg-card');
    expect(btn90D).not.toHaveClass('bg-card');

    // Click '30D'
    fireEvent.click(btn30D);
    expect(btn30D).toHaveClass('bg-card');
    expect(btn7D).not.toHaveClass('bg-card');
    expect(btn90D).not.toHaveClass('bg-card');

    // Click '90D'
    fireEvent.click(btn90D);
    expect(btn90D).toHaveClass('bg-card');
    expect(btn30D).not.toHaveClass('bg-card');
    expect(btn7D).not.toHaveClass('bg-card');
  });

  it('has a "View all" link pointing to /transactions', () => {
    render(<DashboardPage />);
    const link = screen.getByText(/View all/i).closest('a');
    expect(link).toHaveAttribute('href', '/transactions');
  });
});
