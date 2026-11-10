import {
  trimInput,
  normalizeEmail,
  sanitizeSearchQuery,
  sanitizeFilename,
  sanitizeHtml,
  STRICT_HTML_ALLOWLIST_CONFIG,
} from '@/lib/utils/sanitize';

describe('utils/sanitize', () => {
  describe('trimInput()', () => {
    it('trims whitespace', () => {
      expect(trimInput('  hello  ')).toBe('hello');
    });
  });

  describe('normalizeEmail()', () => {
    it('trims and lowercases', () => {
      expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
    });
  });

  describe('sanitizeSearchQuery()', () => {
    it('trims and caps length', () => {
      const long = 'a'.repeat(200);
      expect(sanitizeSearchQuery(long)).toHaveLength(100);
    });
  });

  describe('sanitizeFilename()', () => {
    it('lowercases the name', () => {
      expect(sanitizeFilename('Invoice.PDF')).toBe('invoice.pdf');
    });

    it('replaces unsafe characters with hyphens', () => {
      expect(sanitizeFilename('INV-01ABC/DEF:2026')).toBe('inv-01abc-def-2026');
    });

    it('collapses consecutive hyphens', () => {
      expect(sanitizeFilename('a---b')).toBe('a-b');
    });

    it('trims leading and trailing hyphens', () => {
      expect(sanitizeFilename('-hello-')).toBe('hello');
    });

    it('preserves dots and underscores', () => {
      expect(sanitizeFilename('file_name.v2.pdf')).toBe('file_name.v2.pdf');
    });

    it('handles empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('strips path-ish characters', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('etc-passwd');
    });
  });

  describe('sanitizeHtml()', () => {
    it('configures a strict allowlist of tags and attributes', () => {
      expect(STRICT_HTML_ALLOWLIST_CONFIG.ALLOWED_TAGS).toEqual(['b', 'i', 'code', 'span']);
      expect(STRICT_HTML_ALLOWLIST_CONFIG.ALLOWED_ATTR).toEqual(['class']);
    });

    it('preserves allowed inline formatting tags and class attributes', () => {
      const input =
        'Payment failed for <code class="font-mono">USDC</code>: <b class="font-semibold">insufficient</b> <i>balance</i> <span class="text-red-500">error</span>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('strips <script>, <img>, <iframe>, and event handler attributes', () => {
      const malicious =
        'Error <script>alert(1)</script><img src=x onerror="alert(2)"><b onclick="steal()" style="color:red">detail</b>';
      expect(sanitizeHtml(malicious)).toBe('Error <b>detail</b>');
    });

    it('strips anchor tags and javascript: protocol payloads', () => {
      const malicious =
        'Click <a href="javascript:alert(document.cookie)" class="link">here</a> for details';
      expect(sanitizeHtml(malicious)).toBe('Click here for details');
    });

    it('returns empty string for empty input', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });
});
