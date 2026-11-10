// RFC 4180 compliant CSV utilities used when exporting tables for download.
//
// We always wrap text fields in double quotes so embedded commas, newlines
// and unicode characters survive a round-trip through spreadsheet tools,
// and we double any embedded `"` character to escape it cleanly. Numeric
// fields are emitted raw (without quotes) to keep them arithmetic-friendly
// in Excel / Google Sheets.
//
// We also prepend a UTF-8 BOM ("\ufeff") to the output so that Excel — which
// otherwise guesses based on system locale — recognises the file as UTF-8
// and renders non-ASCII characters (e.g. ₦ in NGN amounts) correctly.

export interface CSVColumn<T = Record<string, unknown>> {
  header: string;
  key: keyof T | ((item: T) => string | number | null | undefined);
}

/**
 * Leading characters that spreadsheet software (Excel, LibreOffice Calc,
 * Google Sheets) interprets as formula or DDE command triggers.
 */
export const CSV_FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'] as const;

const CSV_FORMULA_TRIGGER_REGEX = /^[=+\-@\t\r]/;

/**
 * Neutralizes CSV / DDE formula injection by prefixing strings that start with
 * `=`, `+`, `-`, `@`, `\t`, or `\r` with a leading single quote (`'`).
 */
export function sanitizeCsvFormula(value: string): string {
  if (!value) return value;
  if (CSV_FORMULA_TRIGGER_REGEX.test(value)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Escapes a grid value for CSV storage following RFC 4180 rules.
 * Handles commas, double quotes, carriage return / line feeds, and formula injection.
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = typeof value === 'string' ? sanitizeCsvFormula(value) : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const BOM = '\ufeff';

/**
 * Escape a single CSV field for safe inclusion in a comma-separated value stream.
 */
export function escapeCsvField(value: unknown): string {
  const raw = value == null ? '' : String(value);
  const str = typeof value === 'string' ? sanitizeCsvFormula(raw) : raw;
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Build a fully-formed CSV string from a header row and array of rows.
 */
export function buildCsv(headers: string, rows: string[]): string {
  return BOM + headers + rows.join('\n');
}

/**
 * Generates a UTF-8 CSV string with BOM for Excel compatibility.
 */
export function generateCSV<T = Record<string, unknown>>(data: T[], columns: CSVColumn<T>[]): string {
  const headers = columns.map(col => escapeCSVValue(col.header)).join(',');
  const rows = data.map(item =>
    columns
      .map(col => {
        const val = typeof col.key === 'function' ? col.key(item) : (item as Record<string, unknown>)[col.key as string];
        return escapeCSVValue(val);
      })
      .join(',')
  );

  return BOM + [headers, ...rows].join('\r\n');
}

