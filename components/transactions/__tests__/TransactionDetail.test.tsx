/**
 * Fiat currency rendering in the transaction detail dialog (issue #750): the
 * approximation must come from `Intl.NumberFormat({ style: 'currency' })` using
 * the transaction's own ISO 4217 metadata, never a hardcoded `₦` prefix.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { TransactionDetail } from '../TransactionDetail';
import type { Transaction } from '@/lib/mock/transactions';
import i18n from '@/lib/i18n/config';

jest.mock('@/lib/api/hooks', () => ({
  usePayment: jest.fn(() => ({ data: undefined })),
}));

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn(), silent: jest.fn() }),
}));

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx_01',
  txHash: 'abc123',
  payerAddress: 'GBX...4Q3',
  merchantAddress: 'GDM...9L1',
  amountUsdc: 1500,
  amountNgn: 2325000,
  fxRate: 1550,
  status: 'completed',
  source: 'Payment Link',
  timestamp: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

const renderDetail = (transaction: Transaction) =>
  render(<TransactionDetail transaction={transaction} isOpen onClose={jest.fn()} />);

/**
 * The `≈ …` approximation line, matched on its leading approximation sign. The
 * dialog renders through a portal, so search the whole document rather than the
 * render container.
 */
const fiatLine = () => {
  const nodes = Array.from(document.querySelectorAll('p'));
  const node = nodes.find((el) => (el.textContent ?? '').trim().startsWith('≈'));
  return node?.textContent?.trim() ?? '';
};

describe('TransactionDetail fiat currency (#750)', () => {
  beforeAll(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  afterEach(() => {
    document.documentElement.lang = '';
  });

  it('renders NGN with the native symbol by default and drops the redundant code suffix', () => {
    renderDetail(makeTransaction());

    expect(fiatLine()).toBe('≈ ₦2,325,000');
    // The old markup produced "≈ ₦2,325,000 NGN" — symbol and code both.
    expect(fiatLine()).not.toContain('NGN');
  });

  it('renders EUR with the euro symbol when the transaction says it settled in EUR', () => {
    renderDetail(
      makeTransaction({ amountUsdc: 1500, amountNgn: 0, fiatCurrency: 'EUR', fiatAmount: 1392.4 }),
    );

    expect(fiatLine()).toBe('≈ €1,392.40');
    expect(fiatLine()).not.toContain('₦');
  });

  it('honours the active locale for grouping and symbol placement', () => {
    document.documentElement.lang = 'fr';
    renderDetail(makeTransaction({ amountNgn: 2325000 }));

    const expected = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(2325000);

    expect(fiatLine()).toBe(`≈ ${expected}`);
  });

  it('refuses to label a naira amount with a non-NGN symbol when no amount is paired', () => {
    renderDetail(makeTransaction({ fiatCurrency: 'EUR' }));

    expect(fiatLine()).toBe('≈ ₦2,325,000');
  });

  it('ignores a malformed currency code rather than crashing the dialog', () => {
    renderDetail(
      makeTransaction({ fiatCurrency: 'EURO', fiatAmount: 1392.4 }),
    );

    expect(fiatLine()).toBe('≈ ₦2,325,000');
  });

  it('keeps rendering the rest of the dialog', () => {
    renderDetail(makeTransaction({ fiatCurrency: 'GBP', fiatAmount: 1180 }));

    expect(screen.getByText('Transaction Details')).toBeInTheDocument();
    expect(screen.getByText('USDC 1,500.00')).toBeInTheDocument();
  });
});
