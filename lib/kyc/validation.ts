/**
 * Client-side validation for KYB document uploads.
 *
 * Runs before a file leaves the browser so a merchant gets an immediate,
 * specific error instead of a round trip. The API route re-checks the same
 * rules — this is a UX layer, not the security boundary.
 */

export const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MIN_FILE_SIZE_BYTES = 1;

export type FileRejectionCode = 'empty' | 'unsupported_type' | 'too_large';

export interface FileRejection {
  code: FileRejectionCode;
  message: string;
}

/** `accept` attribute value for a native file input. */
export function fileInputAccept(): string {
  return [...ACCEPTED_MIME_TYPES, ...ACCEPTED_EXTENSIONS].join(',');
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${units[exp]}`;
}

function hasAcceptedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Validate a single file. Returns `null` when the file is acceptable, or a
 * typed rejection with a human-readable message.
 */
export function validateKybFile(file: File): FileRejection | null {
  if (file.size < MIN_FILE_SIZE_BYTES) {
    return { code: 'empty', message: 'That file is empty. Choose a different file.' };
  }

  // Some browsers report an empty `type` for known extensions (e.g. dragged
  // from certain file managers), so fall back to the extension check.
  const typeOk =
    (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type) ||
    (file.type === '' && hasAcceptedExtension(file.name));
  if (!typeOk) {
    return {
      code: 'unsupported_type',
      message: 'Unsupported file type. Upload a PDF, JPG, or PNG.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      code: 'too_large',
      message: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(
        MAX_FILE_SIZE_BYTES,
      )}.`,
    };
  }

  return null;
}

/** Whether a MIME type can be shown inline as an image preview. */
export function isImageMime(mime: string): boolean {
  return mime === 'image/jpeg' || mime === 'image/png';
}
