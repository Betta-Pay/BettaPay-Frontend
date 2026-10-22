import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';
import { assetKeys } from '@/lib/assets/hooks';
import { CurrencySelector } from '../CurrencySelector';

jest.mock('@/lib/api/axios', () => ({ apiClient: { get: jest.fn() } }));
const get = apiClient.get as unknown as jest.Mock;

const asset = (code: string, name = code) => ({ code, name, contractId: `C${code}`, decimals: 7, isActive: true });

function renderSelector(selected: string[], onChange = jest.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={client}>
      <CurrencySelector selectedCurrencies={selected} onSelectionChange={onChange} showRates={false} />
    </QueryClientProvider>,
  );
  return { client, onChange, ...utils };
}

describe('CurrencySelector backed by the supported-assets endpoint', () => {
  beforeEach(() => get.mockReset());

  it('shows a loading skeleton, never a hard-coded list, until the endpoint answers', async () => {
    let resolve!: (v: unknown) => void;
    get.mockReturnValue(new Promise((r) => (resolve = r)));
    renderSelector(['USDC']);

    expect(screen.getByRole('status', { name: /loading supported currencies/i })).toBeInTheDocument();
    expect(screen.queryByText('USDC')).not.toBeInTheDocument();

    resolve({ data: { data: [asset('USDC', 'USD Coin')] } });
    expect(await screen.findByText('USD Coin')).toBeInTheDocument();
  });

  it('lists a newly enabled asset after the shared cache is invalidated', async () => {
    get.mockResolvedValue({ data: { data: [asset('USDC')] } });
    const { client } = renderSelector(['USDC']);
    await screen.findAllByText('USDC');
    expect(screen.queryByText('SHIB')).not.toBeInTheDocument();

    get.mockResolvedValue({ data: { data: [asset('USDC'), asset('SHIB', 'Shiba')] } });
    await client.invalidateQueries({ queryKey: assetKeys.all });
    expect(await screen.findByText('Shiba')).toBeInTheDocument();
  });

  it('flags a selected asset that is no longer enabled and lets the user drop it', async () => {
    get.mockResolvedValue({ data: { data: [asset('USDC')] } });
    const { onChange } = renderSelector(['USDC', 'USDT']);

    expect(await screen.findByTestId('unsupported-asset-banner')).toHaveTextContent('USDT is no longer supported');
    await userEvent.click(screen.getByRole('button', { name: /remove unsupported/i }));
    expect(onChange).toHaveBeenCalledWith(['USDC']);
  });

  it('shows an error with retry instead of a stale list when the endpoint fails', async () => {
    get.mockRejectedValue(new Error('down'));
    renderSelector(['USDC']);
    // The hook retries once (1s back-off) before surfacing the error.
    expect(await screen.findByText(/couldn.t load supported currencies/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByText('USDC')).not.toBeInTheDocument();

    get.mockResolvedValue({ data: { data: [asset('USDC', 'USD Coin')] } });
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.getByText('USD Coin')).toBeInTheDocument());
  });
});
