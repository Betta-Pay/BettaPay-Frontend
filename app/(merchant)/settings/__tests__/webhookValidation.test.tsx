import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../page';
import { apiClient } from '@/lib/api/axios';

const mockNotifySuccess = jest.fn();
const mockNotifyError = jest.fn();

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({
    success: mockNotifySuccess,
    error: mockNotifyError,
    info: jest.fn(),
  }),
}));

jest.mock('@/lib/store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'usr_1', email: 'merchant@example.com' },
    logout: jest.fn(),
  }),
}));

jest.mock('@/lib/api/hooks', () => ({
  useMerchantProfile: () => ({
    data: null,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/lib/api/axios', () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ data: {} }),
    get: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('SettingsPage - Webhook URL Validation (#1110)', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  const openWebhooksTab = () => {
    render(<SettingsPage />);
    const webhooksTab = screen.getByText('Webhooks');
    fireEvent.click(webhooksTab);
  };

  it('renders webhooks tab with default valid URL and enabled Save button', () => {
    openWebhooksTab();

    expect(screen.getByText('Webhook Configuration')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Save Webhook Config/i });
    expect(saveBtn).toBeEnabled();
  });

  it('disables save button and displays error when URL is empty or invalid format', () => {
    openWebhooksTab();

    const urlInput = screen.getByDisplayValue('https://example.com/webhooks/bettapay');
    fireEvent.change(urlInput, { target: { value: 'not-a-valid-url' } });

    expect(screen.getByText('Not a valid URL.')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Save Webhook Config/i });
    expect(saveBtn).toBeDisabled();

    fireEvent.change(urlInput, { target: { value: '' } });
    expect(screen.getByText('Enter a URL.')).toBeInTheDocument();
    expect(saveBtn).toBeDisabled();
  });

  it('blocks private or loopback IP addresses when allowPrivate is false', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    openWebhooksTab();

    const urlInput = screen.getByDisplayValue('https://example.com/webhooks/bettapay');
    fireEvent.change(urlInput, { target: { value: 'https://169.254.169.254/webhook' } });

    expect(screen.getByText('Private, loopback and link-local addresses are blocked.')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Save Webhook Config/i });
    expect(saveBtn).toBeDisabled();
  });

  it('blocks non-HTTPS public URLs', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    openWebhooksTab();

    const urlInput = screen.getByDisplayValue('https://example.com/webhooks/bettapay');
    fireEvent.change(urlInput, { target: { value: 'http://my-api.com/webhooks' } });

    expect(screen.getByText('HTTPS is required for public endpoints.')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Save Webhook Config/i });
    expect(saveBtn).toBeDisabled();
  });

  it('saves successfully when a valid HTTPS URL is entered', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({ data: { success: true } });
    openWebhooksTab();

    const urlInput = screen.getByDisplayValue('https://example.com/webhooks/bettapay');
    fireEvent.change(urlInput, { target: { value: 'https://api.merchant.com/v1/webhook' } });

    expect(screen.queryByText(/blocked|invalid|HTTPS is required/i)).not.toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Save Webhook Config/i });
    expect(saveBtn).toBeEnabled();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/api/merchants/webhook', {
        url: 'https://api.merchant.com/v1/webhook',
      });
      expect(mockNotifySuccess).toHaveBeenCalledWith('Webhook URL saved');
    });
  });

  it('handles backend save failure gracefully with error notification', async () => {
    (apiClient.patch as jest.Mock).mockRejectedValueOnce({
      response: { data: { message: 'Webhook endpoint unreachable' } },
    });
    openWebhooksTab();

    const urlInput = screen.getByDisplayValue('https://example.com/webhooks/bettapay');
    fireEvent.change(urlInput, { target: { value: 'https://valid.endpoint.com/hook' } });

    const saveBtn = screen.getByRole('button', { name: /Save Webhook Config/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith('Webhook endpoint unreachable');
    });
  });
});
