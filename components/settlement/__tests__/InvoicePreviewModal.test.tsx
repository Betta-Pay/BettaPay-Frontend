import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  InvoicePreviewModal,
  INVOICE_PRINT_STYLES,
} from '../InvoicePreviewModal';
import type { ApiSettlement } from '@/lib/api/hooks';

function makeSettlement(overrides: Partial<ApiSettlement> = {}): ApiSettlement {
  return {
    id: 'settlement_print123',
    merchantId: 'merchant_1',
    amountUsdc: 1000,
    amountNgn: 1550000,
    status: 'completed',
    createdAt: '2026-08-01T00:00:00.000Z',
    txHash: 'txhash123',
    bankName: 'GTBank',
    accountNumber: '0123456789',
    ...overrides,
  };
}

describe('InvoicePreviewModal print stylesheet and trigger (#877)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls window.print() when the "Print Invoice" toolbar button is clicked', () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <InvoicePreviewModal
        open={true}
        onOpenChange={jest.fn()}
        data={{ kind: 'single', settlement: makeSettlement() }}
        merchant={{ businessName: 'Acme Corp', email: 'billing@acme.test' }}
        isDownloading={false}
        onDownload={jest.fn()}
      />
    );

    const printBtn = screen.getByRole('button', { name: /print invoice/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('applies print-hiding classes and @media print rules to modal chrome while keeping invoice sheet printable', () => {
    render(
      <InvoicePreviewModal
        open={true}
        onOpenChange={jest.fn()}
        data={{ kind: 'single', settlement: makeSettlement() }}
        merchant={{ businessName: 'Acme Corp', email: 'billing@acme.test' }}
        isDownloading={false}
        onDownload={jest.fn()}
      />
    );

    expect(INVOICE_PRINT_STYLES).toContain('@media print');
    expect(INVOICE_PRINT_STYLES).toContain('.invoice-modal-chrome');

    const printBtn = screen.getByRole('button', { name: /print invoice/i });
    const downloadBtn = screen.getByRole('button', { name: /download pdf/i });
    const invoiceSheet = screen.getByTestId('invoice-printable-sheet');

    expect(printBtn.className).toContain('print:hidden');
    expect(downloadBtn.className).toContain('print:hidden');
    expect(invoiceSheet.className).not.toContain('print:hidden');
    expect(screen.getByText('SETTLEMENT INVOICE')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });
});
