"use client";

import { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { truncateAddress } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CopyAddressProps {
  address: string;
  showIconOnly?: boolean;
  className?: string;
  truncate?: boolean;
}

export const CopyAddress = ({
  address,
  showIconOnly = false,
  className,
  truncate = true,
}: CopyAddressProps) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      let copiedSuccessfully = false;

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(address);
          copiedSuccessfully = true;
        } catch {
          copiedSuccessfully = false;
        }
      }

      if (!copiedSuccessfully) {
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        copiedSuccessfully = document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      if (!copiedSuccessfully) {
        throw new Error('Clipboard copy was not confirmed');
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setCopied(true);
      toast.success('Address copied to clipboard');
      timerRef.current = setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to copy address');
    }
  };

  const displayAddress = truncate ? truncateAddress(address) : address;

  if (showIconOnly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              className={cn('min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground', className)}
              onClick={handleCopy}
              aria-label={`Wallet address: ${address}`}
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{address}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50 hover:bg-muted transition-colors cursor-pointer',
              className
            )}
            onClick={handleCopy}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCopy(e as unknown as React.MouseEvent);
              }
            }}
            aria-label={`Wallet address: ${address}`}
          >
            <span className="font-mono text-sm">{displayAddress}</span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>{address}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
