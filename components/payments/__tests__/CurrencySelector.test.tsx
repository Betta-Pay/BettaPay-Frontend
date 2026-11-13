import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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

  describe('debounced search filtering', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('updates search input value immediately while debouncing currency list filtering by 150ms', async () => {
      get.mockResolvedValue({
        data: {
          data: [
            asset('USDC', 'USD Coin'),
            asset('EURC', 'Euro Coin'),
            asset('XLM', 'Stellar Lumens'),
          ],
        },
      });

      renderSelector(['USDC']);
      expect(await screen.findByText('USD Coin')).toBeInTheDocument();
      expect(screen.getByText('Euro Coin')).toBeInTheDocument();
      expect(screen.getByText('Stellar Lumens')).toBeInTheDocument();

      const searchInput = screen.getByRole('searchbox', { name: /search currencies/i });
      fireEvent.change(searchInput, { target: { value: 'Stellar' } });

      // Input updates immediately on keystroke
      expect(searchInput).toHaveValue('Stellar');
      // List has not filtered yet before 150ms elapses
      expect(screen.getByText('USD Coin')).toBeInTheDocument();
      expect(screen.getByText('Euro Coin')).toBeInTheDocument();

      // Advance 100ms (still under 150ms threshold)
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(screen.getByText('USD Coin')).toBeInTheDocument();

      // Advance remaining 50ms to reach 150ms debounce threshold
      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(screen.queryByText('USD Coin')).not.toBeInTheDocument();
      expect(screen.queryByText('Euro Coin')).not.toBeInTheDocument();
      expect(screen.getByText('Stellar Lumens')).toBeInTheDocument();
    });

    it('resets the 150ms debounce timer on rapid consecutive keystrokes', async () => {
      get.mockResolvedValue({
        data: {
          data: [
            asset('USDC', 'USD Coin'),
            asset('EURC', 'Euro Coin'),
          ],
        },
      });

      renderSelector(['USDC']);
      expect(await screen.findByText('USD Coin')).toBeInTheDocument();

      const searchInput = screen.getByRole('searchbox', { name: /search currencies/i });
      fireEvent.change(searchInput, { target: { value: 'EU' } });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Type again before 150ms finishes
      fireEvent.change(searchInput, { target: { value: 'EURC' } });
      expect(searchInput).toHaveValue('EURC');

      // 100ms after second keystroke (200ms total) should still not have filtered
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(screen.getByText('USD Coin')).toBeInTheDocument();

      // Complete the 150ms after second keystroke
      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(screen.queryByText('USD Coin')).not.toBeInTheDocument();
      expect(screen.getByText('Euro Coin')).toBeInTheDocument();
    });

    it('shows empty state when no currency matches and restores full list when cleared', async () => {
      get.mockResolvedValue({
        data: {
          data: [
            asset('USDC', 'USD Coin'),
            asset('EURC', 'Euro Coin'),
          ],
        },
      });

      renderSelector(['USDC']);
      expect(await screen.findByText('USD Coin')).toBeInTheDocument();

      const searchInput = screen.getByRole('searchbox', { name: /search currencies/i });
      fireEvent.change(searchInput, { target: { value: '   zzz-none   ' } });
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(screen.getByText(/no matching currencies found/i)).toBeInTheDocument();
      expect(screen.queryByText('USD Coin')).not.toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: '   ' } });
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(screen.queryByText(/no matching currencies found/i)).not.toBeInTheDocument();
      expect(screen.getByText('USD Coin')).toBeInTheDocument();
      expect(screen.getByText('Euro Coin')).toBeInTheDocument();
    });

    it('avoids re-rendering memoized CurrencyCard items on intermediate keystrokes before debounce settles', async () => {
      let nameReads = 0;
      const trackedAsset = {
        code: 'USDC',
        get name() {
          nameReads += 1;
          return 'USD Coin';
        },
        contractId: 'CUSDC',
        decimals: 7,
        isActive: true,
      };
      get.mockResolvedValue({ data: { data: [trackedAsset] } });

      renderSelector(['USDC']);
      expect(await screen.findByText('USD Coin')).toBeInTheDocument();
      const readsAfterMount = nameReads;

      const searchInput = screen.getByRole('searchbox', { name: /search currencies/i });
      fireEvent.change(searchInput, { target: { value: 'U' } });
      fireEvent.change(searchInput, { target: { value: 'US' } });
      fireEvent.change(searchInput, { target: { value: 'USD' } });

      // Neither filteredAssets nor memoized CurrencyCard should re-evaluate asset.name before 150ms
      expect(nameReads).toBe(readsAfterMount);

      act(() => {
        jest.advanceTimersByTime(150);
      });
      expect(screen.getByText('USD Coin')).toBeInTheDocument();
    });
  });
});
