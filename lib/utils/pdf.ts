import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ApiSettlement } from '@/lib/api/hooks';

/** Platform fee applied to settlements, matches SettlementConfirmation. */
export const SETTLEMENT_FEE_PERCENT = 1;

export interface InvoiceMerchant {
  businessName: string;
  email?: string | null;
  country?: string | null;
}

export interface SettlementFees {
  gross: number;
  fee: number;
  net: number;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Derive a stable, human-readable invoice number from a settlement id. */
export function buildInvoiceNumber(settlementId: string): string {
  const suffix = settlementId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return `INV-${suffix || 'UNKNOWN'}`;
}

/** Split a gross USDC amount into platform fee and net payout. */
export function computeSettlementFees(
  amountUsdc: number,
  feePercent: number = SETTLEMENT_FEE_PERCENT
): SettlementFees {
  const gross = amountUsdc;
  const fee = gross * (feePercent / 100);
  return { gross, fee, net: gross - fee };
}

export function formatUsdc(amount: number): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export function formatNgn(amount: number): string {
  return `NGN ${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function formatInvoiceDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const BRAND_COLOR: [number, number, number] = [240, 165, 0]; // --primary #F0A500
const TEXT_DARK: [number, number, number] = [30, 41, 59];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];
const PAGE_MARGIN = 18;

let cachedLogo: string | null | undefined;

/** Load the BettaPay logo as a data URL, cached across calls. */
async function loadLogo(): Promise<string | null> {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const res = await fetch('/logo.png');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    cachedLogo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    cachedLogo = null;
  }
  return cachedLogo;
}

// ─── Invoice rendering ────────────────────────────────────────────────────────

function renderInvoicePage(
  doc: jsPDF,
  settlement: ApiSettlement,
  merchant: InvoiceMerchant,
  logo: string | null
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const right = pageWidth - PAGE_MARGIN;
  const fees = computeSettlementFees(settlement.amountUsdc);
  const rate =
    settlement.amountNgn && settlement.amountUsdc > 0
      ? settlement.amountNgn / settlement.amountUsdc
      : null;

  // Header band
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 3, 'F');

  // Logo / brand
  if (logo) {
    doc.addImage(logo, 'PNG', PAGE_MARGIN, 12, 14, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...TEXT_DARK);
    doc.text('BettaPay', PAGE_MARGIN + 17, 21.5);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...BRAND_COLOR);
    doc.text('BettaPay', PAGE_MARGIN, 21.5);
  }

  // Invoice meta (top right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...TEXT_DARK);
  doc.text('SETTLEMENT INVOICE', right, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(buildInvoiceNumber(settlement.id), right, 22, { align: 'right' });
  doc.text(formatInvoiceDate(settlement.createdAt), right, 27, { align: 'right' });

  // Merchant info
  let y = 42;
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('BILLED TO', PAGE_MARGIN, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  doc.text(merchant.businessName || 'Merchant', PAGE_MARGIN, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  let infoY = y + 10;
  if (merchant.email) {
    doc.text(merchant.email, PAGE_MARGIN, infoY);
    infoY += 4.5;
  }
  if (merchant.country) {
    doc.text(merchant.country, PAGE_MARGIN, infoY);
  }

  // Settlement status (right column)
  doc.setFontSize(8);
  doc.text('STATUS', right, y, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  doc.text(settlement.status.toUpperCase(), right, y + 5, { align: 'right' });

  // Settlement details table
  y = 68;
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Settlement Details', '']],
    body: [
      ['Settlement ID', settlement.id],
      ['Date Initiated', formatInvoiceDate(settlement.createdAt)],
      ['Bank', settlement.bankName ?? '—'],
      ['Account Number', settlement.accountNumber ?? '—'],
      ['Exchange Rate', rate ? `NGN ${rate.toLocaleString('en-NG', { maximumFractionDigits: 2 })} / USDC` : '—'],
      ['Transaction Hash', settlement.txHash ?? '—'],
    ],
    theme: 'plain',
    headStyles: {
      fontStyle: 'bold',
      fontSize: 10,
      textColor: TEXT_DARK,
      fillColor: [248, 250, 252],
    },
    bodyStyles: { fontSize: 9, textColor: TEXT_MUTED, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { textColor: TEXT_DARK },
    },
  });

  // Transaction / amount breakdown table
  const detailsEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 50;
  autoTable(doc, {
    startY: detailsEndY + 8,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Description', 'Amount']],
    body: [
      ['Gross settlement amount', formatUsdc(fees.gross)],
      [`Platform fee (${SETTLEMENT_FEE_PERCENT}%)`, `- ${formatUsdc(fees.fee)}`],
      ['Net settlement (USDC)', formatUsdc(fees.net)],
      ['Amount paid out (NGN)', settlement.amountNgn != null ? formatNgn(settlement.amountNgn) : '—'],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: BRAND_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: { fontSize: 9, textColor: TEXT_DARK, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      // Emphasize the payout rows
      if (data.section === 'body' && data.row.index >= 2) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Total banner
  const breakdownEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? detailsEndY + 50;
  const totalY = breakdownEndY + 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(pageWidth / 2, totalY, right - pageWidth / 2, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('TOTAL PAID OUT', pageWidth / 2 + 6, totalY + 8.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_DARK);
  doc.text(
    settlement.amountNgn != null ? formatNgn(settlement.amountNgn) : formatUsdc(fees.net),
    right - 6,
    totalY + 8.5,
    { align: 'right' }
  );

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(PAGE_MARGIN, pageHeight - 24, right, pageHeight - 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('BettaPay · USDC settlements for African merchants', PAGE_MARGIN, pageHeight - 18);
  doc.text(
    'This invoice was generated automatically and is valid without a signature.',
    PAGE_MARGIN,
    pageHeight - 13.5
  );
  doc.text(`Generated ${formatInvoiceDate(new Date().toISOString())}`, right, pageHeight - 18, {
    align: 'right',
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Build a single-settlement invoice PDF document. */
export async function generateSettlementInvoice(
  settlement: ApiSettlement,
  merchant: InvoiceMerchant
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  renderInvoicePage(doc, settlement, merchant, logo);
  return doc;
}

/** Generate and download an invoice for one settlement. */
export async function downloadSettlementInvoice(
  settlement: ApiSettlement,
  merchant: InvoiceMerchant
): Promise<void> {
  const doc = await generateSettlementInvoice(settlement, merchant);
  doc.save(`${buildInvoiceNumber(settlement.id)}.pdf`);
}

/** Generate one combined PDF (one invoice per page) for multiple settlements. */
export async function downloadSettlementInvoicesBatch(
  settlements: ApiSettlement[],
  merchant: InvoiceMerchant
): Promise<void> {
  if (settlements.length === 0) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  settlements.forEach((settlement, index) => {
    if (index > 0) doc.addPage();
    renderInvoicePage(doc, settlement, merchant, logo);
  });
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`bettapay-invoices-${date}.pdf`);
}
