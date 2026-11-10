import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ForgotPasswordPage from '../page';

jest.mock('@/lib/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ForgotPasswordPage 60s rate-limit cooldown (#934)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('starts a 60-second cooldown after submitting a valid reset request and counts down to re-enable', async () => {
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText('forgotPassword.emailLabel');
    fireEvent.change(emailInput, { target: { value: 'merchant@bettapay.com' } });

    const submitButton = screen.getByRole('button', { name: 'forgotPassword.submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('forgotPassword.confirmation.title')).toBeInTheDocument();
    });

    const resendBtn = screen.getByRole('button', { name: /Resend in 60s/i });
    expect(resendBtn).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(15_000);
    });
    expect(screen.getByRole('button', { name: /Resend in 45s/i })).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(45_000);
    });

    const enabledResendBtn = screen.getByRole('button', { name: /Resend reset link/i });
    expect(enabledResendBtn).not.toBeDisabled();
  });
});
