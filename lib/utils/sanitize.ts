import createDOMPurify from 'dompurify';

const SEARCH_QUERY_MAX_LENGTH = 100;

export const ALLOWED_HTML_TAGS = ['b', 'i', 'code', 'span'] as const;
export const ALLOWED_HTML_ATTR = ['class'] as const;

/**
 * Strict DOMPurify configuration for rendering HTML error messages safely.
 * Restricts markup to basic inline formatting tags (`b`, `i`, `code`, `span`)
 * and `class` attributes while stripping all scripts, event handlers, data
 * attributes, and unsafe URI schemes (`javascript:`, `data:`, `vbscript:`).
 */
export const STRICT_HTML_ALLOWLIST_CONFIG = {
  ALLOWED_TAGS: [...ALLOWED_HTML_TAGS],
  ALLOWED_ATTR: [...ALLOWED_HTML_ATTR],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  ALLOWED_URI_REGEXP: /^https?:\/\//i,
};

function getPurifier() {
  if (typeof window !== 'undefined') {
    return createDOMPurify(window);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('isomorphic-dompurify') as typeof createDOMPurify;
}

/**
 * Sanitize untrusted HTML error messages using the strict allowlist.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return String(getPurifier().sanitize(dirty, STRICT_HTML_ALLOWLIST_CONFIG));
}

export const sanitizeErrorMessageHtml = sanitizeHtml;

export function trimInput(value: string): string {
  return value.trim();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeSearchQuery(query: string): string {
  return query.trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}

/**
 * Sanitize a string for use as a filename.
 * Replaces unsafe characters with hyphens, collapses runs, and trims edges.
 * Strips path traversal segments (., ..) and joins path components with hyphens.
 */
export function sanitizeFilename(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(/[/\\]+/)
    .filter((seg) => seg !== '' && seg !== '.' && seg !== '..')
    .map((seg) =>
      seg
        .replace(/[^a-z0-9\-_.]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    )
    .filter(Boolean)
    .join('-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
