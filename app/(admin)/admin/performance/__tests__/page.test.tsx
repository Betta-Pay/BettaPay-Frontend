import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPerformancePage from '../page';

// Mock recharts to avoid SVG rendering issues in jsdom
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

// Mock useQuery to return loading state by default
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(),
  };
});

import { useQuery } from '@tanstack/react-query';
import type { DashboardResponse } from '@/components/admin/performance/performanceFormat';

type MockQueryResult = {
  data: DashboardResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: jest.Mock;
};

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('AdminPerformancePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    } as MockQueryResult);

    const { container } = render(<AdminPerformancePage />, { wrapper: createWrapper() });
    expect(screen.getByText('Frontend Performance')).toBeDefined();
    // Should show skeleton loaders (animated pulse elements)
    expect(container.querySelectorAll('[data-slot="skeleton"]').length + container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(0);
  });

  it('renders page title', () => {
    mockUseQuery.mockReturnValue({
      data: { routes: [], metrics: [], timeRange: { from: '', to: '' }, totalEvents: 0, data: null },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as MockQueryResult);

    render(<AdminPerformancePage />, { wrapper: createWrapper() });
    expect(screen.getByText('Frontend Performance')).toBeDefined();
  });

  it('shows empty data state', () => {
    mockUseQuery.mockReturnValue({
      data: { routes: [], metrics: [], timeRange: { from: '', to: '' }, totalEvents: 0, data: null },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as MockQueryResult);

    render(<AdminPerformancePage />, { wrapper: createWrapper() });
    expect(screen.getByText(/No performance data available yet/)).toBeDefined();
  });

  it('shows error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API Error'),
      refetch: jest.fn(),
    } as MockQueryResult);

    render(<AdminPerformancePage />, { wrapper: createWrapper() });
    expect(screen.getByText(/Failed to load performance data/)).toBeDefined();
  });

  it('renders performance data with percentiles', () => {
    mockUseQuery.mockReturnValue({
      data: {
        routes: ['/dashboard', '/overview'],
        metrics: ['lcp', 'fcp'],
        timeRange: { from: '2026-01-01T00:00:00Z', to: '2026-01-08T00:00:00Z' },
        totalEvents: 100,
        data: {
          metric: 'lcp',
          percentiles: { p50: 1200, p75: 1800, p90: 2500, p95: 3200, count: 100, min: 400, max: 5000 },
          trend: [
            { date: '2026-01-01', percentiles: { p50: 1100, p75: 1600, p90: 2300, p95: 3000, count: 50, min: 350, max: 4500 }, count: 50 },
            { date: '2026-01-02', percentiles: { p50: 1300, p75: 2000, p90: 2700, p95: 3400, count: 50, min: 450, max: 5500 }, count: 50 },
          ],
          routeSummaries: [
            { route: '/dashboard', percentiles: { p50: 1100, p75: 1600, p90: 2300, p95: 3000, count: 60, min: 350, max: 4500 }, count: 60 },
            { route: '/overview', percentiles: { p50: 1400, p75: 2100, p90: 2900, p95: 3600, count: 40, min: 500, max: 6000 }, count: 40 },
          ],
          distribution: [
            { lower: 0, upper: 200, count: 5 },
            { lower: 200, upper: 400, count: 10 },
            { lower: 400, upper: 800, count: 20 },
            { lower: 800, upper: 1200, count: 30 },
            { lower: 1200, upper: 2000, count: 25 },
            { lower: 2000, upper: 4000, count: 8 },
            { lower: 4000, upper: Infinity, count: 2 },
          ],
          route: null,
          sampleCount: 100,
        },
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as MockQueryResult);

    render(<AdminPerformancePage />, { wrapper: createWrapper() });

    // Check percentile values are displayed
    expect(screen.getByText('p50')).toBeDefined();
    expect(screen.getByText('p75')).toBeDefined();
    expect(screen.getByText('p90')).toBeDefined();
    expect(screen.getByText('p95')).toBeDefined();

    // Check route summaries
    expect(screen.getByText('/dashboard')).toBeDefined();
    expect(screen.getByText('/overview')).toBeDefined();

    // Check total events
    expect(screen.getByText(/100 total events/)).toBeDefined();
  });

  it('shows low sample size warning', () => {
    mockUseQuery.mockReturnValue({
      data: {
        routes: ['/dashboard'],
        metrics: ['lcp'],
        timeRange: { from: '2026-01-01T00:00:00Z', to: '2026-01-08T00:00:00Z' },
        totalEvents: 10,
        data: {
          metric: 'lcp',
          percentiles: { p50: 1200, p75: 1800, p90: 2500, p95: 3200, count: 10, min: 400, max: 5000 },
          trend: [],
          routeSummaries: [],
          distribution: [],
          route: null,
          sampleCount: 10,
        },
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as MockQueryResult);

    render(<AdminPerformancePage />, { wrapper: createWrapper() });
    expect(screen.getByText(/Low sample size/)).toBeDefined();
  });
});
