"use client";

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotify } from '@/lib/hooks/useNotify';
import { buildCsv, escapeCsvField } from '@/lib/utils/csv';

/**
 * Serialize a single CSV cell.
 *
 * Numbers and booleans are emitted raw (unquoted) so spreadsheet tools keep
 * them arithmetic-friendly; formula-triggering characters (=, +, -, @, \t, \r)
 * in string values are prefixed with a single quote to neutralize formula injection;
 * every other value goes through `escapeCsvField`, which quotes it and doubles
 * embedded quotes so commas, newlines and unicode characters survive a round-trip
 * through Excel / Google Sheets.
 */
export function serializeCell(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  let str = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return escapeCsvField(str);
}

/** Yield to the main thread so a large export never freezes the tab. */
function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function triggerDownload(csv: string, filename: string): void {
  // The BOM added by buildCsv() makes Excel recognise the file as UTF-8, so
  // non-ASCII characters (e.g. ₦ in NGN amounts) render without the user
  // having to pick an encoding manually.
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

interface ExportMenuProps {
  /**
   * Base filename — the date is appended automatically.
   * e.g. `"transactions"` → `bettapay_transactions_2026-08-21.csv`.
   */
  filename: string;
  /** Column headers, one per column, in display order. */
  headers: string[];
  /**
   * The dataset to export. Callers MUST pass the full filtered/sorted list —
   * never the visible page slice — so the download matches what the filters
   * show. Each row is an array of cell values matching `headers`.
   */
  rows: unknown[][];
  /** Disables the button entirely (e.g. while offline). */
  disabled?: boolean;
  /** Button label. Defaults to "Export CSV". */
  label?: string;
  /**
   * Datasets with at least this many rows are serialized asynchronously in
   * chunks (yielding between chunks) so the tab stays responsive, and the
   * button shows a "Preparing…" state while the file is being built.
   */
  largeExportThreshold?: number;
  /** Rows serialized per chunk before yielding to the main thread. */
  chunkSize?: number;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  className?: string;
  id?: string;
}

/**
 * ExportMenu — a drop-in CSV export control for list views.
 *
 * It builds the CSV client-side using the RFC 4180 helpers in
 * `lib/utils/csv` (quoting, escaping, UTF-8 BOM for Excel), exports the
 * complete dataset passed via `rows` (not just the first page), shows a
 * "Preparing…" state and yields between chunks for large exports so the tab
 * never freezes, and reports the outcome with a toast.
 */
export function ExportMenu({
  filename,
  headers,
  rows,
  disabled = false,
  label = 'Export CSV',
  largeExportThreshold = 1000,
  chunkSize = 250,
  variant = 'outline',
  size = 'default',
  className,
  id,
}: ExportMenuProps) {
  const notify = useNotify();
  const [isPreparing, setIsPreparing] = useState(false);

  const handleExport = async () => {
    if (rows.length === 0) {
      notify.error('Nothing to export');
      return;
    }

    setIsPreparing(true);
    try {
      const headersLine = `${headers.map(escapeCsvField).join(',')}\n`;

      let serializedRows: string[];
      if (rows.length >= largeExportThreshold) {
        // Large export: serialize in chunks, yielding between chunks so the
        // main thread can keep painting / responding while the file builds.
        serializedRows = [];
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          for (const row of chunk) {
            serializedRows.push(row.map(serializeCell).join(','));
          }
          await yieldToMainThread();
        }
      } else {
        serializedRows = rows.map((row) => row.map(serializeCell).join(','));
      }

      const csv = buildCsv(headersLine, serializedRows);
      const date = new Date().toISOString().slice(0, 10);
      triggerDownload(csv, `bettapay_${filename}_${date}.csv`);
      notify.success(`Exported ${rows.length} rows`);
    } catch {
      notify.error('Failed to export CSV');
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <Button
      id={id}
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || isPreparing}
      aria-disabled={disabled || isPreparing}
      aria-busy={isPreparing || undefined}
      onClick={() => {
        void handleExport();
      }}
    >
      {isPreparing ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Download aria-hidden="true" />
      )}
      {isPreparing ? 'Preparing…' : label}
    </Button>
  );
}
