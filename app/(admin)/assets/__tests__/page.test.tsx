import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';
import AdminAssetsPage from '../page';

jest.mock('@/lib/api/axios', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
const notify = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock('@/lib/hooks/useNotify', () => ({ useNotify: () => notify }));

const api = apiClient as unknown as Record<'get' | 'post' | 'patch' | 'delete', jest.Mock>;
const rows = [
  { code: 'USDC', contractId: 'CBGBGKJSUY7XYB6HWW4CVAU6MW2KD25FSF45E5KCP53TKUK374MBZNFB', decimals: 7, name: 'USD Coin', isActive: true, createdAt: '2026-01-02T00:00:00Z' },
  { code: 'USDT', contractId: 'CUSDT', decimals: 7, name: 'Tether', isActive: false },
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminAssetsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  api.get.mockResolvedValue({ data: { data: rows } });
});

describe('AdminAssetsPage', () => {
  it('lists enabled and disabled assets with issuer, status and created date', async () => {
    renderPage();
    const usdc = (await screen.findByText('USD Coin')).closest('tr')!;
    expect(within(usdc).getByText('Enabled')).toBeInTheDocument();
    expect(within(usdc).getByText('CBGBGKJS…MBZNFB')).toBeInTheDocument();
    const usdt = screen.getByText('Tether').closest('tr')!;
    expect(within(usdt).getByText('Disabled')).toBeInTheDocument();
    expect(within(usdt).getByText('—', { selector: 'td' })).toBeInTheDocument();
  });

  it('disables an asset optimistically and rolls back with an error toast when the backend rejects', async () => {
    api.patch.mockRejectedValue(new Error('forbidden'));
    renderPage();
    const row = (await screen.findByText('USD Coin')).closest('tr')!;
    await userEvent.click(within(row).getByRole('switch', { name: 'Disable USDC' }));

    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(api.patch).toHaveBeenCalledWith('/api/admin/assets/USDC', { isActive: false });
    expect(within(screen.getByText('USD Coin').closest('tr')!).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('validates the create form before calling the backend, then creates', async () => {
    api.post.mockResolvedValue({ data: { data: { code: 'XLM', contractId: 'CXLM', decimals: 7, name: 'Stellar Lumens', isActive: true } } });
    renderPage();
    await screen.findByText('USD Coin');
    await userEvent.click(screen.getByRole('button', { name: /add asset/i }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /^add asset$/i }));
    expect(within(dialog).getByText('Enter an asset code.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/code/i), 'xlm');
    await userEvent.type(within(dialog).getByLabelText(/^name/i), 'Stellar Lumens');
    await userEvent.type(within(dialog).getByLabelText(/issuer/i), 'CXLM');
    await userEvent.click(within(dialog).getByRole('button', { name: /^add asset$/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/admin/assets', {
      code: 'XLM', name: 'Stellar Lumens', contractId: 'CXLM', decimals: 7, isActive: true,
    }));
  });
});
