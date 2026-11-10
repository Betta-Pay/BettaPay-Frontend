import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { EmailLoginForm } from '../EmailLoginForm';

const mockNotifyError = jest.fn();

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({
    error: mockNotifyError,
    success: jest.fn(),
    info: jest.fn(),
  }),
}));

jest.mock('@/lib/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/utils/announce', () => ({
  announce: jest.fn(),
}));

jest.mock('lucide-react', () => ({
  Loader2: () => <svg data-testid="loader-icon" />,
}));

describe('EmailLoginForm — rate limit cooldown', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  function fillCredentials() {
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'merchant@bettapay.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });
  }

  it('disables submit button and renders countdown from JSON retryAfter on 429 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => null },
      json: async () => ({ retryAfter: 45, message: 'Rate limit exceeded' }),
    });

    render(<EmailLoginForm />);
    fillCredentials();

    const submitButton = screen.getByRole('button', { name: /Sign In with Email/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Try again in 45s' })).toBeDisabled();
    });

    expect(mockNotifyError).toHaveBeenCalledWith(
      expect.stringContaining('Try again in 45s'),
    );
  });

  it('parses Retry-After header, ticks down every second, and re-enables button when complete', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: (header: string) => (header.toLowerCase() === 'retry-after' ? '3' : null),
      },
      json: async () => ({}),
    });

    render(<EmailLoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: /Sign In with Email/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Try again in 3s' })).toBeDisabled();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Try again in 2s' })).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Try again in 1s' })).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const reenabledButton = screen.getByRole('button', { name: 'Sign In with Email' });
    expect(reenabledButton).not.toBeDisabled();
  });

  it('parses retry seconds from error message text and blocks form submission during cooldown', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => null },
      json: async () => ({ message: 'Too many login attempts. Please try again in 20s.' }),
    });
    global.fetch = fetchMock;

    render(<EmailLoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: /Sign In with Email/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Try again in 20s' })).toBeDisabled();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.submit(screen.getByRole('form', { name: /Sign in with email and password/i }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
