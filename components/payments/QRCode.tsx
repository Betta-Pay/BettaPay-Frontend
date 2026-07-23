"use client";

import { useRef, useCallback, useState, memo } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, Printer, Share2, Copy, Check, QrCode as QrCodeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotify } from "@/lib/hooks/useNotify";

export interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  level?: "L" | "M" | "Q" | "H";
  includeMargin?: boolean;
  bgColor?: string;
  fgColor?: string;
  title?: string;
  filename?: string;
}

/**
 * Reusable QRCode Component
 * Renders a high-contrast, accessible QR code using qrcode.react
 */
export const QRCode = memo(function QRCode({
  value,
  size = 200,
  className,
  level = "M",
  includeMargin = true,
  bgColor = "#FFFFFF",
  fgColor = "#000000",
  title,
}: QRCodeProps) {
  if (!value) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-muted/40 border border-border rounded-xl text-muted-foreground p-4 text-center",
          className
        )}
        style={{ width: size, height: size }}
        role="img"
        aria-label={title || "Empty QR Code"}
      >
        <QrCodeIcon className="w-10 h-10 mb-2 opacity-40" />
        <span className="text-xs">No link provided</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center p-3 bg-white border border-border rounded-xl shadow-sm overflow-hidden",
        className
      )}
      role="img"
      aria-label={title ? `QR code for ${title}` : `QR code for ${value}`}
    >
      <QRCodeCanvas
        value={value}
        size={size}
        level={level}
        includeMargin={includeMargin}
        bgColor={bgColor}
        fgColor={fgColor}
        role="presentation"
        aria-hidden="true"
      />
    </div>
  );
});

export interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  title?: string;
  subtitle?: string;
  amountUsdc?: number | string | null;
}

/**
 * QRCodeModal Component
 * Full-featured modal for viewing, downloading, printing, and sharing payment link QR codes.
 */
export function QRCodeModal({
  open,
  onOpenChange,
  value,
  title = "Payment Link QR Code",
  subtitle = "Scan with any smartphone or crypto wallet to pay",
  amountUsdc,
}: QRCodeModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const notify = useNotify();
  const [copied, setCopied] = useState(false);

  // Helper to trigger high-res PNG download
  const handleDownloadPNG = useCallback(() => {
    try {
      const canvas = containerRef.current?.querySelector("canvas");
      if (!canvas) {
        notify.error("Unable to generate QR image");
        return;
      }

      // Create high-res scaled canvas for crisp downloading & printing
      const scale = 4;
      const exportCanvas = document.createElement("canvas");
      const size = canvas.width * scale;
      exportCanvas.width = size;
      exportCanvas.height = size;

      const ctx = exportCanvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // White background padding
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(canvas, 0, 0, size, size);

        const dataUrl = exportCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        const sanitizedTitle = (title || "payment")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-");
        a.href = dataUrl;
        a.download = `qrcode-${sanitizedTitle}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        notify.success("QR Code downloaded as PNG");
      }
    } catch (err) {
      console.error("Failed to download QR code PNG", err);
      notify.error("Failed to download QR code");
    }
  }, [title, notify]);

  // Helper to trigger SVG download
  const handleDownloadSVG = useCallback(() => {
    try {
      const svg = containerRef.current?.querySelector("svg");
      if (!svg) {
        notify.error("SVG QR code unavailable");
        return;
      }
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const a = document.createElement("a");
      const sanitizedTitle = (title || "payment")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
      a.href = svgUrl;
      a.download = `qrcode-${sanitizedTitle}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(svgUrl);
      notify.success("QR Code downloaded as SVG");
    } catch (err) {
      console.error("Failed to download QR code SVG", err);
      notify.error("Failed to download SVG");
    }
  }, [title, notify]);

  // Helper to copy payment link to clipboard
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      notify.success("Payment link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Failed to copy link");
    }
  }, [value, notify]);

  // Helper to trigger native Web Share or fallback copy
  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: title || "Payment Link",
          text: `Pay using this BettaPay link: ${title}`,
          url: value,
        });
        notify.success("Shared successfully");
      } catch (err) {
        // Ignore user cancel error
        if ((err as Error)?.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  }, [title, value, notify, handleCopyLink]);

  // Helper to print QR code signage
  const handlePrint = useCallback(() => {
    const canvas = containerRef.current?.querySelector("canvas");
    const dataUrl = canvas ? canvas.toDataURL("image/png") : "";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notify.error("Please allow popups to print QR signage");
      return;
    }

    const printDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${title}</title>
          <style>
            @page { size: auto; margin: 20mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 80vh;
              text-align: center;
              color: #111;
              margin: 0;
              padding: 20px;
            }
            .card {
              border: 2px solid #e5e7eb;
              border-radius: 16px;
              padding: 40px;
              max-width: 400px;
              width: 100%;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .badge {
              display: inline-block;
              background-color: #f3f4f6;
              color: #374151;
              font-size: 12px;
              font-weight: 600;
              padding: 4px 12px;
              border-radius: 9999px;
              margin-bottom: 16px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            h1 { font-size: 24px; font-weight: 700; margin: 0 0 8px 0; color: #111827; }
            .amount { font-size: 20px; font-weight: 600; color: #059669; margin-bottom: 24px; }
            .qr-container {
              background: #ffffff;
              padding: 16px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              display: inline-block;
              margin-bottom: 24px;
            }
            .qr-container img { width: 240px; height: 240px; display: block; }
            .instructions { font-size: 14px; color: #4b5563; margin-bottom: 16px; font-weight: 500; }
            .url { font-family: monospace; font-size: 11px; color: #6b7280; word-break: break-all; margin: 0; }
            .footer { margin-top: 32px; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">BettaPay Payment</div>
            <h1>${title}</h1>
            ${amountUsdc ? `<div class="amount">${amountUsdc} USDC</div>` : ""}
            <div class="qr-container">
              <img src="${dataUrl}" alt="Payment QR Code" />
            </div>
            <p class="instructions">Scan to pay with crypto</p>
            <p class="url">${value}</p>
          </div>
          <div class="footer">Powered by BettaPay</div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printDoc);
    printWindow.document.close();
  }, [title, amountUsdc, value, notify]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md bg-card border-border/50 max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4 space-y-4" ref={containerRef}>
          {/* Main QR Display */}
          <div className="p-4 bg-white border border-border/80 rounded-2xl shadow-sm flex flex-col items-center">
            <QRCodeCanvas
              value={value}
              size={210}
              level="H"
              includeMargin
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
            {/* Hidden SVG for vector SVG download */}
            <div className="hidden">
              <QRCodeSVG
                value={value}
                size={512}
                level="H"
                includeMargin
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
          </div>

          {amountUsdc && (
            <div className="px-3 py-1 bg-success/10 text-success text-sm font-semibold rounded-full border border-success/20">
              Amount: {amountUsdc} USDC
            </div>
          )}

          {/* Truncated payment link display */}
          <div className="w-full bg-muted/50 rounded-lg p-2.5 border border-border/50 flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-muted-foreground truncate flex-1 select-all">
              {value}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCopyLink}
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              title="Copy payment link"
              aria-label="Copy payment link"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Action buttons for Download, Print, Share */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPNG}
              className="flex items-center justify-center gap-1.5 border-border/60 hover:bg-muted text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadSVG}
              className="flex items-center justify-center gap-1.5 border-border/60 hover:bg-muted text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SVG</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 border-border/60 hover:bg-muted text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 border-border/60 hover:bg-muted text-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
