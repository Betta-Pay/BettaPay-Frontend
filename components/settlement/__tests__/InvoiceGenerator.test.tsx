/**
 * Invoice preview before PDF generation (issue #790): clicking the trigger
 * must open a visual preview of the invoice, and the PDF must only be
 * generated/downloaded once the user explicitly clicks "Download PDF" /
 * "Download All" inside that preview.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoiceDownloadButton, BatchInvoiceDownload } from '../InvoiceGenerator';
import { setPdfGenerator, resetPdfGenerator, type PdfGenerator } from '@/lib/services/pdfGenerator';
import type { ApiSettlement } from '@/lib/api/hooks';

jest.mock('@/lib/store/authStore', () => ({
  useAuthStore: (selector: (s: { user: Record<string, unknown> }) => unknown) =>
    selector({ user: { businessName: 'Acme Merchant Ltd', email: 'billing@acme.test' } }),
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function makeSettlement(overrides: Partial<ApiSettlement> = {}): ApiSettlement {
  return {
    id: 'settlement_abc12345',
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

describe('InvoiceDownloadButton preview (#790)', () => {
  let backend: PdfGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:mock'), revokeObjectURL: jest.fn() });
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    backend = { generateInvoice: jest.fn().mockResolvedValue({ blob: new Blob(['%PDF']), filename: 'inv.pdf' }) };
    setPdfGenerator(backend);
  });

  afterEach(() => {
    resetPdfGenerator();
    jest.restoreAllMocks();
  });

  it('opens a preview showing invoice details instead of downloading immediately', async () => {
    const user = userEvent.setup();
    const settlement = makeSettlement();
    render(<InvoiceDownloadButton settlement={settlement} />);

    await user.click(screen.getByRole('button', { name: /preview invoice/i }));

    expect(screen.getByText('Invoice Preview')).toBeInTheDocument();
    expect(screen.getByText('Acme Merchant Ltd')).toBeInTheDocument();
    expect(screen.getByText(/INV-/)).toBeInTheDocument();
    // Nothing generated yet — the preview alone must not trigger a download.
    expect(backend.generateInvoice).not.toHaveBeenCalled();
  });

  it('only generates and downloads the PDF after "Download PDF" is clicked in the preview', async () => {
    const user = userEvent.setup();
    const settlement = makeSettlement();
    render(<InvoiceDownloadButton settlement={settlement} />);

    await user.click(screen.getByRole('button', { name: /preview invoice/i }));
    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => expect(backend.generateInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'single', settlement }),
    ));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Invoice downloaded'));
  });
});

describe('BatchInvoiceDownload preview (#790)', () => {
  let backend: PdfGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:mock'), revokeObjectURL: jest.fn() });
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    backend = { generateInvoice: jest.fn().mockResolvedValue({ blob: new Blob(['%PDF']), filename: 'inv.pdf' }) };
    setPdfGenerator(backend);
  });

  afterEach(() => {
    resetPdfGenerator();
    jest.restoreAllMocks();
  });

  it('previews only the completed settlements before downloading them all', async () => {
    const user = userEvent.setup();
    const settlements = [
      makeSettlement({ id: 's_completed_1', status: 'completed' }),
      makeSettlement({ id: 's_pending_1', status: 'pending' }),
    ];
    render(<BatchInvoiceDownload settlements={settlements} />);

    await user.click(screen.getByRole('button', { name: /download invoices/i }));

    expect(screen.getByText('1 invoice')).toBeInTheDocument();
    expect(backend.generateInvoice).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /download all/i }));

    await waitFor(() => expect(backend.generateInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'batch', settlements: [settlements[0]] }),
    ));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Downloaded 1 invoice'));
  });
});
