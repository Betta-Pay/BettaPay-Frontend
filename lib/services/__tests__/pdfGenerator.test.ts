import {
  downloadPdf,
  generateInvoice,
  PDF_REVOKE_DELAY_MS,
  PDF_WORKER_TIMEOUT_MS,
  resetPdfGenerator,
  setPdfGenerator,
  workerPdfGenerator,
  type InvoiceData,
  type PdfGenerator,
} from '../pdfGenerator';
import type { ApiSettlement } from '@/lib/api/hooks';
import { intlLocales } from '@/lib/i18n/locales';

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

  it('downloadPdf clicks a temporary link and revokes the object URL after a delay', () => {
    jest.useFakeTimers();
    const createObjectURL = jest.fn(() => 'blob:mock');
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadPdf({ blob: new Blob(['%PDF']), filename: 'inv.pdf' });

    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
    // Not revoked synchronously: browsers read the blob URL after click() returns.
    expect(revokeObjectURL).not.toHaveBeenCalled();

    jest.advanceTimersByTime(PDF_REVOKE_DELAY_MS);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    click.mockRestore();
    jest.useRealTimers();
  });
});

describe('workerPdfGenerator', () => {
  const RealWorker = global.Worker;
  let workers: FakeWorker[];

  class FakeWorker {
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    postMessage = jest.fn();
    terminate = jest.fn();

    constructor() {
      workers.push(this);
    }
  }

  beforeEach(() => {
    jest.useFakeTimers();
    workers = [];
    global.Worker = FakeWorker as unknown as typeof Worker;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.Worker = RealWorker;
  });

  it('rejects and terminates the worker when rendering exceeds the timeout', async () => {
    const promise = workerPdfGenerator.generateInvoice({
      kind: 'batch',
      settlements: [settlement],
      merchant,
    });
    const assertion = expect(promise).rejects.toThrow(
      `PDF generation timed out after ${PDF_WORKER_TIMEOUT_MS} ms`,
    );

    jest.advanceTimersByTime(PDF_WORKER_TIMEOUT_MS);

    await assertion;
    expect(workers[0].terminate).toHaveBeenCalledTimes(1);
  });

  it('gives each job a distinct id', () => {
    void workerPdfGenerator.generateInvoice({ kind: 'single', settlement, merchant });
    void workerPdfGenerator.generateInvoice({ kind: 'single', settlement, merchant });

    const ids = workers.map((worker) => worker.postMessage.mock.calls[0][0].id);
    expect(new Set(ids).size).toBe(2);
  });

  it('sends the active locale to the worker for number and date formatting', () => {
    void workerPdfGenerator.generateInvoice({ kind: 'single', settlement, merchant });

    const { intlLocale } = workers[0].postMessage.mock.calls[0][0].payload;
    expect(Object.values(intlLocales)).toContain(intlLocale);
  });
});
