/**
 * Soroban XDR decoding in the transaction drawer (issue #793): a Soroban
 * contract invocation should render as a readable "Contract Invocation"
 * section (contract id, function name, args) instead of the raw XDR staying
 * invisible/opaque, while ordinary payments are unaffected.
 *
 * The envelopes are precomputed fixtures (generated over the testnet
 * passphrase with a fixed seed): building them at runtime calls
 * Keypair.fromRawEd25519Seed, which wraps the seed in the npm `buffer`
 * package's Buffer — and Buffers from the jsdom realm fail @noble/ed25519's
 * cross-realm Uint8Array check ("expected Uint8Array ... got type=object").
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TransactionDrawer } from '../TransactionDrawer';
import type { ApiPayment } from '@/lib/api/hooks';

const SOROBAN_ENVELOPE =
  'AAAAAgAAAADqSmxj4pxSCr71UHsTLsX5lUd2rr6+e5JCHuppFEbSLAAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAABq6hEFAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAAAAIdHJhbnNmZXIAAAACAAAAEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAD6AAAAAAAAAAAAAAAAA==';
const PAYMENT_ENVELOPE =
  'AAAAAgAAAADqSmxj4pxSCr71UHsTLsX5lUd2rr6+e5JCHuppFEbSLAAAAGQAAAAAAAAAAgAAAAEAAAAAAAAAAAAAAABq6hEFAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABfXhAAAAAAAAAAAA';

function makePayment(overrides: Partial<ApiPayment> = {}): ApiPayment {
  return {
    id: 'pay_1',
    txHash: 'hash1',
    payerAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    merchantId: 'merchant_1',
    amountUsdc: 750,
    amountNgn: 1162500,
    fxRate: 1550,
    status: 'completed',
    source: 'Consulting',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TransactionDrawer Soroban invocation (#793)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('shows a Contract Invocation section for a Soroban transaction', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ envelope_xdr: SOROBAN_ENVELOPE }),
    }) as unknown as typeof fetch;

    render(<TransactionDrawer transaction={makePayment()} isOpen onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('Contract Invocation')).toBeInTheDocument());
    expect(screen.getByText('transfer')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('https://horizon-testnet.stellar.org/transactions/hash1');
  });

  it('does not show a Contract Invocation section for an ordinary payment', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ envelope_xdr: PAYMENT_ENVELOPE }),
    }) as unknown as typeof fetch;

    render(<TransactionDrawer transaction={makePayment()} isOpen onClose={jest.fn()} />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByText('Contract Invocation')).not.toBeInTheDocument();
  });

  it('does not fetch anything when the transaction has no tx hash', () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    render(<TransactionDrawer transaction={makePayment({ txHash: null })} isOpen onClose={jest.fn()} />);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
