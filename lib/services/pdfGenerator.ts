/**
 * PDF generation service.
 *
 * Components ask for an invoice through `generateInvoice(data)` and never touch
 * the PDF library. Today the default backend renders with jspdf inside a Web
 * Worker (`lib/workers/pdf.worker.ts`); swapping to pdfmake or a server-side
 * renderer means providing another `PdfGenerator` via `setPdfGenerator`, with
 * no component changes.
 */

import type { ApiSettlement } from '@/lib/api/hooks';
import type { InvoiceMerchant } from '@/lib/utils/pdf';

export type { InvoiceMerchant };

export type InvoiceData =
  | { kind: 'single'; settlement: ApiSettlement; merchant: InvoiceMerchant }
  | { kind: 'batch'; settlements: ApiSettlement[]; merchant: InvoiceMerchant };

export interface GeneratedPdf {
  blob: Blob;
  filename: string;
}

export interface PdfGenerator {
  /** Resolves to `null` when there is nothing to render (e.g. an empty batch). */
  generateInvoice(data: InvoiceData): Promise<GeneratedPdf | null>;
}

type WorkerJobType = 'SINGLE' | 'BATCH';

/** Default backend: jspdf running in a Web Worker so rendering stays off the main thread. */
export const workerPdfGenerator: PdfGenerator = {
  generateInvoice(data) {
    const type: WorkerJobType = data.kind === 'single' ? 'SINGLE' : 'BATCH';
    const payload =
      data.kind === 'single'
        ? { settlement: data.settlement, merchant: data.merchant }
        : { settlements: data.settlements, merchant: data.merchant };

    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('@/lib/workers/pdf.worker.ts', import.meta.url));
      const id = Date.now();
      worker.onmessage = (e) => {
        if (e.data.id === id) {
          if (e.data.success) {
            resolve(e.data.result ?? null);
          } else {
            reject(new Error(e.data.error));
          }
          worker.terminate();
        }
      };
      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };
      worker.postMessage({ type, payload, id });
    });
  },
};

let activeGenerator: PdfGenerator = workerPdfGenerator;

/** Swap the PDF backend (e.g. pdfmake, a server endpoint, or a test double). */
export function setPdfGenerator(generator: PdfGenerator): void {
  activeGenerator = generator;
}

/** Restore the default worker-backed generator. */
export function resetPdfGenerator(): void {
  activeGenerator = workerPdfGenerator;
}

/** Render an invoice (one settlement or a batch) with the active backend. */
export function generateInvoice(data: InvoiceData): Promise<GeneratedPdf | null> {
  return activeGenerator.generateInvoice(data);
}

/** Save a generated PDF through the browser's download flow. */
export function downloadPdf({ blob, filename }: GeneratedPdf): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
