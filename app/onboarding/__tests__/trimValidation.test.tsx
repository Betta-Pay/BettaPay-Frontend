/* eslint-disable react/display-name, @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('@/components/onboarding/Stepper', () => ({
  Stepper: () => <div data-testid="mock-stepper" />,
}));
jest.mock('@/components/onboarding/StepBusinessInfo', () => ({
  StepBusinessInfo: ({ data, errors, onChange, onFieldBlur }: any) => (
    <>
      <input
        data-testid="businessName"
        value={data.businessName}
        onChange={(e: any) => onChange({ businessName: e.target.value })}
        onBlur={() => onFieldBlur?.('businessName')}
      />
      <input
        data-testid="country"
        value={data.country}
        onChange={(e: any) => onChange({ country: e.target.value })}
        onBlur={() => onFieldBlur?.('country')}
      />
      {Object.entries(errors).map(([k, v]) => (
        <p key={k} data-testid={`error-${k}`}>
          {String(v)}
        </p>
      ))}
    </>
  ),
}));
jest.mock('@/components/onboarding/StepCurrency', () => ({ StepCurrency: () => null }));
jest.mock('@/components/onboarding/StepSettlement', () => ({ StepSettlement: () => null }));
jest.mock('@/components/onboarding/StepWebhook', () => ({ StepWebhook: () => null }));
jest.mock('@/components/onboarding/StepReview', () => ({ StepReview: () => null }));

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

jest.mock('@/lib/store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'm_1', role: 'merchant' } }),
}));

jest.mock('@/lib/api/axios', () => ({
  apiClient: {
    patch: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

import OnboardingPage from '@/app/onboarding/page';

describe('Onboarding form — input trimming and validation (issue #258)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    localStorage.clear();
  });

  it('preserves spaces while typing a multi-word business name (issue #1129)', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const input = screen.getByTestId('businessName');
    await user.type(input, 'Betta Pay Ltd');

    expect(input).toHaveValue('Betta Pay Ltd');
  });

  it('keeps a trailing space mid-typing and trims it on blur', () => {
    render(<OnboardingPage />);

    const input = screen.getByTestId('businessName');
    fireEvent.change(input, { target: { value: '  Acme Co  ' } });
    expect(input).toHaveValue('  Acme Co  ');

    fireEvent.blur(input);
    expect(input).toHaveValue('Acme Co');
  });

  it('trims the country input on blur as well', () => {
    render(<OnboardingPage />);

    const input = screen.getByTestId('country');
    fireEvent.change(input, { target: { value: '  Ghana  ' } });
    fireEvent.blur(input);

    expect(input).toHaveValue('Ghana');
  });

  it('trims values when the step is validated, even without a blur', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    fireEvent.change(screen.getByTestId('businessName'), { target: { value: ' Acme Corp ' } });
    // Leave the step before blurring so only the validate path can trim.
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    const { apiClient } = require('@/lib/api/axios');
    expect(apiClient.patch).not.toHaveBeenCalled();
    // The value persisted for submission is the trimmed one.
    const saved = JSON.parse(localStorage.getItem('bettapay_onboarding_progress') ?? '{}');
    expect(saved.data.businessName).toBe('Acme Corp');
  });

  it('rejects a businessName that is only whitespace because trimming leaves it empty/short', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const input = screen.getByTestId('businessName');
    // Paste a name that trims down to a single character.
    fireEvent.change(input, { target: { value: '  A  ' } });

    // Trigger validation by clicking Continue.
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    expect(
      await screen.findByTestId('error-businessName'),
    ).toHaveTextContent(/at least 2 characters/);
  });

  it('accepts a businessName whose trimmed length meets the minimum', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const input = screen.getByTestId('businessName');
    fireEvent.change(input, { target: { value: '  Acme  ' } });

    await user.click(screen.getByRole('button', { name: /Continue/i }));

    expect(screen.queryByTestId('error-businessName')).not.toBeInTheDocument();
  });
});
