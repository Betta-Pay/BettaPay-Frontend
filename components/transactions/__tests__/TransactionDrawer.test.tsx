/**
 * Soroban XDR decoding in the transaction drawer (issue #793): a Soroban
 * contract invocation should render as a readable "Contract Invocation"
 * section (contract id, function name, args) instead of the raw XDR staying
 * invisible/opaque, while ordinary payments are unaffected.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  Account,
  Address,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { TransactionDrawer } from '../TransactionDrawer';
import type { ApiPayment } from '@/lib/api/hooks';

function buildInvokeContractEnvelope(): { envelopeXdr: string; contractId: string } {
  const source = new Account(Keypair.random().publicKey(), '0');
  const contractId = Address.contract(Buffer.alloc(32, 2)).toString();

  const op = Operation.invokeContractFunction({
    contract: contractId,
    function: 'transfer',
    args: [
      nativeToScVal(Keypair.random().publicKey(), { type: 'address' }),
      nativeToScVal(BigInt(1000), { type: 'i128' }),
    ],
  });

  const tx = new TransactionBuilder(source, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(op)
    .setTimeout(30)
    .build();

  return { envelopeXdr: tx.toXDR(), contractId };
}

function buildPaymentEnvelope(): string {
  const source = new Account(Keypair.random().publicKey(), '0');
  const tx = new TransactionBuilder(source, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: Keypair.random().publicKey(), asset: Asset.native(), amount: '10' }))
    .setTimeout(30)
    .build();
  return tx.toXDR();
}

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
    const { envelopeXdr, contractId } = buildInvokeContractEnvelope();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ envelope_xdr: envelopeXdr }),
    }) as unknown as typeof fetch;

    render(<TransactionDrawer transaction={makePayment()} isOpen onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('Contract Invocation')).toBeInTheDocument());
    expect(screen.getByText('transfer')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('https://horizon-testnet.stellar.org/transactions/hash1');
    void contractId;
  });

  it('does not show a Contract Invocation section for an ordinary payment', async () => {
    const envelopeXdr = buildPaymentEnvelope();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ envelope_xdr: envelopeXdr }),
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
