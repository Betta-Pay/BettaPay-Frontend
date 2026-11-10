import React from 'react';
import { render, screen } from '@testing-library/react';
import { MerchantSidebar } from '@/components/layout/MerchantSidebar';
import { useRateAlertStore } from '@/lib/store/rateAlertStore';

jest.mock('next/navigation', () => ({
  usePathname: () => '/overview',
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt?: string }) => <span aria-label={alt} />,
}));

describe('MerchantSidebar — Pending alert badge counts (#892)', () => {
  beforeEach(() => {
    useRateAlertStore.setState({ alerts: [] });
  });

  it('hides badges cleanly when all alert counts are 0', () => {
    render(<MerchantSidebar />);
    expect(screen.queryByTestId('sidebar-badge-fx')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('sidebar-badge-settlement')
    ).not.toBeInTheDocument();
  });

  it('renders numeric badge pills when store or badgeCounts has pending items', () => {
    useRateAlertStore.setState({
      alerts: [
        {
          id: 'a1',
          pair: 'USDC/NGN',
          condition: 'above',
          target: 1600,
          enabled: true,
          recurrence: 'once',
          channels: ['in_app'],
          triggered: true,
        },
        {
          id: 'a2',
          pair: 'USDC/KES',
          condition: 'below',
          target: 130,
          enabled: true,
          recurrence: 'once',
          channels: ['in_app'],
          triggered: true,
        },
      ],
    });

    render(
      <MerchantSidebar badgeCounts={{ '/settlement': 3, '/developers': 0 }} />
    );

    expect(screen.getByTestId('sidebar-badge-fx')).toHaveTextContent('2');
    expect(screen.getByTestId('sidebar-badge-settlement')).toHaveTextContent(
      '3'
    );
    expect(
      screen.queryByTestId('sidebar-badge-developers')
    ).not.toBeInTheDocument();
  });
});
