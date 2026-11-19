/**
 * __tests__/ExportMenu.test.tsx
 *
 * Unit tests for the shared `ExportMenu` CSV component:
 *  - exports exactly the rows passed (the filtered dataset)
 *  - escapes commas / quotes / newlines per RFC 4180 and emits a UTF-8 BOM
 *  - keeps numeric cells raw for spreadsheet friendliness
 *  - reports "Nothing to export" when the dataset is empty
 *  - shows a "Preparing…" state and completes for large (chunked) exports
 *  - names the downloaded file bettapay_<filename>_<date>.csv
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportMenu, serializeCell } from '@/components/shared/ExportMenu';
import { useNotify } from '@/lib/hooks/useNotify';

// ── useNotify ────────────────────────────────────────────────────────────────
jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: jest.fn(),
}));
const mockUseNotify = useNotify as jest.Mock;

// ── Browser download plumbing ────────────────────────────────────────────────
let lastBlob: Blob | null = null;
let lastAnchor: HTMLAnchorElement | null = null;
const createObjectURL = jest.fn((blob: Blob) => {
  lastBlob = blob;
  return 'blob:mock';
});
const revokeObjectURL = jest.fn();
const anchorClick = jest.fn(function (this: HTMLAnchorElement) {
  lastAnchor = this;
});

beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: revokeObjectURL });
  HTMLAnchorElement.prototype.click = anchorClick;
});

function makeNotify() {
  return {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    silent: jest.fn(),
  };
}

let notify: ReturnType<typeof makeNotify>;

beforeEach(() => {
  jest.clearAllMocks();
  lastBlob = null;
  lastAnchor = null;
  notify = makeNotify();
  mockUseNotify.mockReturnValue(notify);
});

async function readBlobText(blob: Blob): Promise<string> {
  // jsdom's Blob lacks .text()/.arrayBuffer(), and FileReader.readAsText
  // strips a leading BOM — read as an ArrayBuffer and decode manually with
  // ignoreBOM so the test can assert on the BOM itself.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(new TextDecoder('utf-8', { ignoreBOM: true }).decode(reader.result as ArrayBuffer));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('ExportMenu', () => {
  it('exports exactly the rows passed (the filtered dataset), not a page slice', async () => {
    render(
      <ExportMenu
        filename="transactions"
        headers={['Date', 'Payer', 'Status']}
        rows={[
          ['2026-08-01', 'GAAA1111', 'completed'],
          ['2026-08-02', 'GBBB2222', 'pending'],
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Exported 2 rows'));

    const text = await readBlobText(lastBlob as Blob);
    expect(text).toContain('"Date","Payer","Status"');
    expect(text).toContain('"2026-08-01","GAAA1111","completed"');
    expect(text).toContain('"2026-08-02","GBBB2222","pending"');
    expect(text.split('\n')).toHaveLength(3); // header + 2 rows, no extra rows
  });

  it('escapes commas, quotes and newlines, keeps numbers raw, and emits a UTF-8 BOM', async () => {
    render(
      <ExportMenu
        filename="payments"
        headers={['Label', 'Note', 'Amount', 'Empty']}
        rows={[[
          'Consulting, Q3',          // embedded comma
          'she said "hi"',           // embedded quotes
          'line one\nline two',      // embedded newline
          null,                      // null cell → empty string
        ]]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => expect(notify.success).toHaveBeenCalled());

    const text = await readBlobText(lastBlob as Blob);
    // BOM first so Excel detects UTF-8
    expect(text.startsWith('\ufeff')).toBe(true);
    expect(text).toContain('"Consulting, Q3"');
    expect(text).toContain('"she said ""hi"""');
    expect(text).toContain('"line one\nline two"');
    expect(text).toContain('""'); // null → empty quoted cell
  });

  it('keeps numeric cells raw so spreadsheets treat them as numbers', async () => {
    render(
      <ExportMenu
        filename="settlements"
        headers={['AmountUSDC', 'Active']}
        rows={[[1500.5, true]]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => expect(notify.success).toHaveBeenCalled());

    const text = await readBlobText(lastBlob as Blob);
    expect(text).toContain('1500.5,true');
  });

  it('downloads the file as bettapay_<filename>_<date>.csv', async () => {
    render(
      <ExportMenu
        filename="transactions"
        headers={['Date']}
        rows={[['2026-08-01']]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => expect(notify.success).toHaveBeenCalled());

    expect(lastAnchor?.download).toMatch(/^bettapay_transactions_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('shows an error toast and does not download when there is nothing to export', async () => {
    render(
      <ExportMenu
        filename="transactions"
        headers={['Date']}
        rows={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    expect(notify.error).toHaveBeenCalledWith('Nothing to export');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('shows a "Preparing…" state for large exports and completes without blocking', async () => {
    const rows = Array.from({ length: 1200 }, (_, i) => [`row-${i}`, i]);
    render(
      <ExportMenu
        filename="big"
        headers={['Name', 'Index']}
        rows={rows}
        largeExportThreshold={1000}
        chunkSize={50}
      />,
    );

    const button = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(button);

    // Chunked path: the button flips to a disabled "Preparing…" state while
    // rows are serialized asynchronously (yielding between chunks).
    await waitFor(() => expect(screen.getByText('Preparing…')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /preparing/i })).toBeDisabled();

    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Exported 1200 rows'));

    const text = await readBlobText(lastBlob as Blob);
    expect(text.split('\n')).toHaveLength(1201); // header + every row
    expect(text).toContain('"row-0",0');
    expect(text).toContain('"row-1199",1199');

    // Preparing state is cleared when done
    await waitFor(() => expect(screen.queryByText('Preparing…')).not.toBeInTheDocument());
  });

  it('does not trigger an export while disabled', async () => {
    render(
      <ExportMenu
        filename="transactions"
        headers={['Date']}
        rows={[['2026-08-01']]}
        disabled
      />,
    );

    const button = screen.getByRole('button', { name: /export csv/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  describe('formula injection neutralization', () => {
    it.each([
      ['=CMD|\'/C calc\'!A0', '"\'=CMD|\'/C calc\'!A0"'],
      ['+12345', '"\'+12345"'],
      ['-999', '"\'-999"'],
      ['@SUM(A1:B2)', '"\'@SUM(A1:B2)"'],
      ['\tindented', '"\'\tindented"'],
      ['\rcarriage', '"\'\rcarriage"'],
    ])('escapes formula prefix %s to %s in serializeCell', (input, expected) => {
      expect(serializeCell(input)).toBe(expected);
    });

    it('neutralizes formula injection characters inside rendered CSV output', async () => {
      render(
        <ExportMenu
          filename="injections"
          headers={['Formula', 'LegitNumber', 'Tabbed', 'Carriage']}
          rows={[[
            '=CMD|\'/C calc\'!A0',
            123.45,
            '\tleading-tab',
            '\rleading-cr',
          ]]}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
      await waitFor(() => expect(notify.success).toHaveBeenCalled());

      const text = await readBlobText(lastBlob as Blob);
      expect(text).toContain('"\'=CMD|\'/C calc\'!A0"');
      expect(text).toContain('123.45');
      expect(text).toContain('"\'\tleading-tab"');
      expect(text).toContain('"\'\rleading-cr"');
    });
  });

  it('displays an error toast and clears preparing state when export fails', async () => {
    createObjectURL.mockImplementationOnce(() => {
      throw new Error('Blob creation failure');
    });

    render(
      <ExportMenu
        filename="transactions"
        headers={['Date']}
        rows={[['2026-08-01']]}
      />,
    );

    const button = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(button);

    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Failed to export CSV'));
    expect(screen.queryByText('Preparing…')).not.toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });
});
