import {
  downloadPdf,
  generateInvoice,
  resetPdfGenerator,
  setPdfGenerator,
  type InvoiceData,
  type PdfGenerator,
} from '../pdfGenerator';
import type { ApiSettlement } from '@/lib/api/hooks';

const merchant = { businessName: 'Acme Ltd' };
const settlement = { id: 's1' } as ApiSettlement;

describe('pdfGenerator service', () => {
  afterEach(() => resetPdfGenerator());

  it('delegates generateInvoice to the active backend', async () => {
    const pdf = { blob: new Blob(['%PDF']), filename: 'inv.pdf' };
    const backend: PdfGenerator = { generateInvoice: jest.fn().mockResolvedValue(pdf) };
    setPdfGenerator(backend);

    const data: InvoiceData = { kind: 'single', settlement, merchant };
    await expect(generateInvoice(data)).resolves.toBe(pdf);
    expect(backend.generateInvoice).toHaveBeenCalledWith(data);
  });

  it('passes batch requests through unchanged', async () => {
    const backend: PdfGenerator = { generateInvoice: jest.fn().mockResolvedValue(null) };
    setPdfGenerator(backend);

    const data: InvoiceData = { kind: 'batch', settlements: [settlement], merchant };
    await expect(generateInvoice(data)).resolves.toBeNull();
    expect(backend.generateInvoice).toHaveBeenCalledWith(data);
  });

  it('downloadPdf clicks a temporary link and revokes the object URL', () => {
    const createObjectURL = jest.fn(() => 'blob:mock');
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadPdf({ blob: new Blob(['%PDF']), filename: 'inv.pdf' });

    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(document.querySelector('a[download]')).toBeNull();
    click.mockRestore();
  });
});
