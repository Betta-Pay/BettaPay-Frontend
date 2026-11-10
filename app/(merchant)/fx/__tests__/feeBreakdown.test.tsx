import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FxRatesPage from '../page';

jest.mock('@/lib/api/hooks', () => ({
  useRates: () => ({
    primaryRate: 1600,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

jest.mock('@/lib/store/rateAlertStore', () => ({
  useRateAlertStore: () => ({
    alerts: [],
    addAlert: jest.fn(),
    toggleAlert: jest.fn(),
    deleteAlert: jest.fn(),
    markAlertTriggered: jest.fn(),
    hydrateFromServer: jest.fn(),
    evaluate: jest.fn(),
  }),
}));

describe('FxRatesPage fee breakdown accordion & rate lock window (#927)', () => {
  it('displays the 30s rate lock window and recalculates fee breakdown live as amount changes', () => {
    render(<FxRatesPage />);

    expect(screen.getByTestId('rate-lock-window')).toHaveTextContent(/Rate locked for 30s/i);

    const toggleBtn = screen.getByRole('button', { name: /Fee Breakdown/i });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    const panel = screen.getByTestId('fee-breakdown-panel');
    expect(panel).toHaveTextContent('0.00001 XLM');
    expect(screen.getByTestId('breakdown-platform-fee')).toHaveTextContent('$5.00 USDC');
    expect(screen.getByTestId('breakdown-spread-fee')).toHaveTextContent('$1.50 USDC');

    // Change conversion amount from 1000 to 2000
    const amountInput = screen.getByDisplayValue('1000');
    fireEvent.change(amountInput, { target: { value: '2000' } });

    expect(screen.getByTestId('breakdown-platform-fee')).toHaveTextContent('$10.00 USDC');
    expect(screen.getByTestId('breakdown-spread-fee')).toHaveTextContent('$3.00 USDC');
  });
});
