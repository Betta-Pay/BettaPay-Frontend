"use client";

import { useState } from 'react';
import { Button } from '@/components/ui';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/authStore';
import type { ApiSettlement } from '@/lib/api/hooks';
import type { InvoiceMerchant } from '@/lib/utils/pdf';

function useInvoiceMerchant(): InvoiceMerchant {
  const user = useAuthStore((s) => s.user);
  return {
    businessName: user?.businessName ?? user?.name ?? 'Merchant',
    email: user?.email,
  };
}

interface InvoiceDownloadButtonProps {
  settlement: ApiSettlement;
}

/** Icon button that downloads a PDF invoice for a single completed settlement. */
export function InvoiceDownloadButton({ settlement }: InvoiceDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const merchant = useInvoiceMerchant();

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const { downloadSettlementInvoice } = await import('@/lib/utils/pdf');
      await downloadSettlementInvoice(settlement, merchant);
      toast.success('Invoice downloaded');
    } catch {
      toast.error('Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="min-h-[44px] min-w-[44px] rounded-lg"
      onClick={handleDownload}
      disabled={isGenerating}
      aria-label="Download invoice"
      title="Download invoice"
    >
      {isGenerating ? (
        <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
      ) : (
        <FileDown className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </Button>
  );
}

interface BatchInvoiceDownloadProps {
  settlements: ApiSettlement[];
  disabled?: boolean;
}

/** Downloads a single PDF containing one invoice per completed settlement. */
export function BatchInvoiceDownload({ settlements, disabled }: BatchInvoiceDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const merchant = useInvoiceMerchant();

  const completed = settlements.filter((s) => s.status.toUpperCase() === 'COMPLETED');

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const { downloadSettlementInvoicesBatch } = await import('@/lib/utils/pdf');
      await downloadSettlementInvoicesBatch(completed, merchant);
      toast.success(`Downloaded ${completed.length} invoice${completed.length === 1 ? '' : 's'}`);
    } catch {
      toast.error('Failed to generate invoices');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      disabled={disabled || isGenerating || completed.length === 0}
      aria-disabled={disabled || isGenerating || completed.length === 0}
      onClick={handleDownload}
      className="border-border text-muted-foreground rounded-xl text-xs h-8 px-3"
    >
      {isGenerating ? (
        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
      ) : (
        <FileDown className="w-3 h-3 mr-1.5" />
      )}
      Download Invoices
    </Button>
  );
}
