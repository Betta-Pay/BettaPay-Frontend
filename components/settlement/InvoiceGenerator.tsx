"use client";

import { useState } from 'react';
import { Button } from '@/components/ui';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/authStore';
import type { ApiSettlement } from '@/lib/api/hooks';
import {
  downloadPdf,
  generateInvoice,
  type InvoiceData,
  type InvoiceMerchant,
} from '@/lib/services/pdfGenerator';
import { InvoicePreviewModal, type InvoicePreviewData } from './InvoicePreviewModal';

function useInvoiceMerchant(): InvoiceMerchant {
  const user = useAuthStore((s) => s.user);
  return {
    businessName: user?.businessName ?? user?.name ?? 'Merchant',
    email: user?.email,
    address: user?.address,
    registrationNumber: user?.registrationNumber,
  };
}

async function downloadInvoice(data: InvoiceData) {
  const pdf = await generateInvoice(data);
  if (pdf) downloadPdf(pdf);
}

interface InvoiceDownloadButtonProps {
  settlement: ApiSettlement;
}

/** Icon button that opens an invoice preview before downloading a PDF for a completed settlement (issue #790). */
export function InvoiceDownloadButton({ settlement }: InvoiceDownloadButtonProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const merchant = useInvoiceMerchant();

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await downloadInvoice({ kind: 'single', settlement, merchant });
      toast.success('Invoice downloaded');
      setPreviewOpen(false);
    } catch {
      toast.error('Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="min-h-[44px] min-w-[44px] rounded-lg"
        onClick={() => setPreviewOpen(true)}
        aria-label="Preview invoice"
        title="Preview invoice"
      >
        <FileDown className="w-3.5 h-3.5 text-muted-foreground" />
      </Button>
      <InvoicePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        data={{ kind: 'single', settlement } satisfies InvoicePreviewData}
        merchant={merchant}
        isDownloading={isGenerating}
        onDownload={handleDownload}
      />
    </>
  );
}

interface BatchInvoiceDownloadProps {
  settlements: ApiSettlement[];
  disabled?: boolean;
}

/** Opens an invoice preview, then downloads a single PDF with one invoice per completed settlement (issue #790). */
export function BatchInvoiceDownload({ settlements, disabled }: BatchInvoiceDownloadProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const merchant = useInvoiceMerchant();

  const completed = settlements.filter((s) => s.status.toUpperCase() === 'COMPLETED');

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await downloadInvoice({ kind: 'batch', settlements: completed, merchant });
      toast.success(`Downloaded ${completed.length} invoice${completed.length === 1 ? '' : 's'}`);
      setPreviewOpen(false);
    } catch {
      toast.error('Failed to generate invoices');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        disabled={disabled || completed.length === 0}
        aria-disabled={disabled || completed.length === 0}
        onClick={() => setPreviewOpen(true)}
        className="border-border text-muted-foreground rounded-xl text-xs h-8 px-3"
      >
        <FileDown className="w-3 h-3 mr-1.5" />
        Download Invoices
      </Button>
      <InvoicePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        data={{ kind: 'batch', settlements: completed } satisfies InvoicePreviewData}
        merchant={merchant}
        isDownloading={isGenerating}
        onDownload={handleDownload}
      />
    </>
  );
}
