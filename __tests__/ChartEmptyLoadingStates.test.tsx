import React from 'react';
import { render, screen } from '@testing-library/react';
import ClicksChart from '@/components/charts/ClicksChart';
import RevenueChart from '@/components/charts/RevenueChart';
import PlatformVolumeChart from '@/components/charts/PlatformVolumeChart';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 400, height: 260 }}>
        {children}
      </div>
    ),
  };
});

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Chart empty and loading states (Issue #513)', () => {
  describe('RevenueChart', () => {
    it('shows a loading skeleton while isLoading', () => {
      render(<RevenueChart data={[]} isLoading />);
      expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-empty')).not.toBeInTheDocument();
    });

    it('shows an empty state for an explicit empty series', () => {
      render(<RevenueChart data={[]} />);
      expect(screen.getByTestId('chart-empty')).toBeInTheDocument();
      expect(screen.getByText(/no revenue yet/i)).toBeInTheDocument();
    });

    it('renders the populated chart when data is provided', () => {
      render(
        <RevenueChart
          data={[
            { name: 'Mon', total: 100, volume: 100 },
            { name: 'Tue', total: 200, volume: 300 },
          ]}
        />,
      );
      expect(screen.getByRole('region', { name: /revenue and volume chart/i })).toBeInTheDocument();
      expect(screen.queryByTestId('chart-empty')).not.toBeInTheDocument();
      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
    });
  });

  describe('ClicksChart', () => {
    it('shows loading and empty states distinctly', () => {
      const { rerender } = render(<ClicksChart data={[]} isLoading />);
      expect(screen.getByTestId('chart-loading')).toBeInTheDocument();

      rerender(<ClicksChart data={[]} />);
      expect(screen.getByTestId('chart-empty')).toBeInTheDocument();
      expect(screen.getByText(/no clicks yet/i)).toBeInTheDocument();
    });
  });

  describe('PlatformVolumeChart', () => {
    it('shows empty state when the API returns an empty array', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      mockedAxios.get.mockResolvedValueOnce({ data: [] });

      render(
        <QueryClientProvider client={queryClient}>
          <PlatformVolumeChart />
        </QueryClientProvider>,
      );

      expect(await screen.findByTestId('chart-empty')).toBeInTheDocument();
      expect(screen.getByText(/no platform volume yet/i)).toBeInTheDocument();
    });
  });
});
