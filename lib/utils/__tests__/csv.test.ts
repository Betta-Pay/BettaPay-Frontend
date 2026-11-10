import {
  buildCsv,
  escapeCsvField,
  generateCSV,
  sanitizeCsvFormula,
} from '@/lib/utils/csv';

describe('escapeCsvField', () => {
  it('wraps plain string values in double quotes', () => {
    expect(escapeCsvField('hello')).toBe('"hello"');
  });

  it('doubles embedded `"` characters before wrapping (RFC 4180)', () => {
    // Payer addresses are unlikely to contain quotes, but anything that does
    // (e.g. malformed input `"foo"`) must not break downstream parsers.
    expect(escapeCsvField('she said "hi"')).toBe('"she said ""hi"""');
  });

  it('escapes values that look like CSV injection attempts', () => {
    // =cmd|'/c calc'!A1 — should be prefixed with a single quote and safely quoted.
    const escaped = escapeCsvField('=cmd|"/c calc"!A1');
    expect(escaped.startsWith('"')).toBe(true);
    expect(escaped).toBe('"\'=cmd|""/c calc""!A1"');
  });

  it('prefixes formula triggers (=, +, -, @, tab, cr) with a single quote', () => {
    expect(sanitizeCsvFormula('=1+1')).toBe("'=1+1");
    expect(sanitizeCsvFormula('+SUM(A1:A2)')).toBe("'+SUM(A1:A2)");
    expect(sanitizeCsvFormula('-2+3')).toBe("'-2+3");
    expect(sanitizeCsvFormula('@SUM(1,2)')).toBe("'@SUM(1,2)");
    expect(sanitizeCsvFormula('\t=1+1')).toBe("'\t=1+1");
    expect(escapeCsvField('=1+1')).toBe('"\'=1+1"');
  });

  it('returns an empty quoted string for null or undefined', () => {
    expect(escapeCsvField(null)).toBe('""');
    expect(escapeCsvField(undefined)).toBe('""');
  });

  it('preserves comma, newline, and unicode characters', () => {
    expect(escapeCsvField('a,b\nc')).toBe('"a,b\nc"');
    expect(escapeCsvField('₦1,550')).toBe('"₦1,550"');
  });

  it('coerces non-string primitives by String() coercion', () => {
    expect(escapeCsvField(0)).toBe('"0"');
    expect(escapeCsvField(false)).toBe('"false"');
  });
});

describe('buildCsv', () => {
  it('prepends a UTF-8 BOM to the output so Excel detects encoding', () => {
    const out = buildCsv('a,b\n', ['"1","2"']);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out).toBe('\ufeffa,b\n"1","2"');
  });

  it('joins all provided rows with the configured line separator', () => {
    const out = buildCsv('h\n', ['"a"', '"b"', '"c"']);
    expect(out).toBe('\ufeffh\n"a"\n"b"\n"c"');
  });

  it('produces an empty body when no rows are given', () => {
    expect(buildCsv('h\n', [])).toBe('\ufeffh\n');
  });
});

describe('generateCSV formula sanitization (#911)', () => {
  it('sanitizes string cells starting with formula triggers while leaving numbers intact', () => {
    const rows = [{ memo: '=1+1', cmd: '=cmd|"/c calc"!A0', amount: -42 }];
    const csv = generateCSV(rows, [
      { header: 'Memo', key: 'memo' },
      { header: 'Command', key: 'cmd' },
      { header: 'Amount', key: 'amount' },
    ]);

    expect(csv).toContain("'=1+1");
    expect(csv).toContain('"\'=cmd|""/c calc""!A0"');
    expect(csv).toContain(',-42');
  });
});
