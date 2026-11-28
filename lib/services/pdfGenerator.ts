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
import { intlLocales, resolveLocale } from '@/lib/i18n/locales';
import { getActiveI18nInstance } from '@/lib/i18n/runtime';
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

/** Longest a single PDF render may run before its worker is terminated (issue #1141). */
export const PDF_WORKER_TIMEOUT_MS = 15_000;

/**
 * How long a blob URL stays valid after a download is triggered. Browsers such as
 * Safari and Firefox read the URL asynchronously, so revoking it synchronously
 * breaks the download (issue #1141).
 */
export const PDF_REVOKE_DELAY_MS = 10_000;

let nextJobId = 0;

/** Intl tag for the locale the user is viewing, e.g. `fr-FR`. */
function currentIntlLocale(): string {
  const i18n = getActiveI18nInstance();
  return intlLocales[resolveLocale(i18n.resolvedLanguage ?? i18n.language)];
}

/** Default backend: jspdf running in a Web Worker so rendering stays off the main thread. */
export const workerPdfGenerator: PdfGenerator = {
  generateInvoice(data) {
    const type: WorkerJobType = data.kind === 'single' ? 'SINGLE' : 'BATCH';
    const intlLocale = currentIntlLocale();
    const payload =
      data.kind === 'single'
        ? { settlement: data.settlement, merchant: data.merchant, intlLocale }
        : { settlements: data.settlements, merchant: data.merchant, intlLocale };

    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('@/lib/workers/pdf.worker.ts', import.meta.url));
      // A per-call id: every job already has its own worker, but a process-wide
      // counter keeps job ids unique even if that ever changes.
      const id = ++nextJobId;
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const finish = (settle: () => void) => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        worker.terminate();
        settle();
      };

      timer = setTimeout(() => {
        finish(() => reject(new Error(`PDF generation timed out after ${PDF_WORKER_TIMEOUT_MS} ms`)));
      }, PDF_WORKER_TIMEOUT_MS);

      worker.onmessage = (e) => {
        if (e.data.id !== id) return;
        finish(() => {
          if (e.data.success) {
            resolve(e.data.result ?? null);
          } else {
            reject(new Error(e.data.error));
          }
        });
      };
      worker.onerror = (err) => finish(() => reject(err));
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
  // Revoke after a delay so the browser can start reading the URL (issue #1141).
  setTimeout(() => URL.revokeObjectURL(url), PDF_REVOKE_DELAY_MS);
}
