import {
  fileInputAccept,
  formatBytes,
  isImageMime,
  MAX_FILE_SIZE_BYTES,
  validateKybFile,
} from '../validation';

function makeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateKybFile', () => {
  it('accepts a PDF within the size limit', () => {
    expect(validateKybFile(makeFile('doc.pdf', 'application/pdf', 1024))).toBeNull();
  });

  it('accepts a JPEG and a PNG', () => {
    expect(validateKybFile(makeFile('id.jpg', 'image/jpeg', 2048))).toBeNull();
    expect(validateKybFile(makeFile('id.png', 'image/png', 2048))).toBeNull();
  });

  it('rejects an unsupported type', () => {
    const result = validateKybFile(makeFile('sheet.xlsx', 'application/vnd.ms-excel', 1024));
    expect(result?.code).toBe('unsupported_type');
  });

  it('rejects an empty file', () => {
    expect(validateKybFile(makeFile('doc.pdf', 'application/pdf', 0))?.code).toBe('empty');
  });

  it('rejects a file over the size limit', () => {
    const result = validateKybFile(
      makeFile('big.pdf', 'application/pdf', MAX_FILE_SIZE_BYTES + 1),
    );
    expect(result?.code).toBe('too_large');
  });

  it('falls back to the extension when the browser reports no MIME type', () => {
    expect(validateKybFile(makeFile('doc.pdf', '', 1024))).toBeNull();
    expect(validateKybFile(makeFile('doc.bin', '', 1024))?.code).toBe('unsupported_type');
  });
});

describe('helpers', () => {
  it('formatBytes renders human-readable sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB');
  });

  it('fileInputAccept lists both MIME types and extensions', () => {
    const accept = fileInputAccept();
    expect(accept).toContain('application/pdf');
    expect(accept).toContain('.png');
  });

  it('isImageMime is true only for jpeg/png', () => {
    expect(isImageMime('image/png')).toBe(true);
    expect(isImageMime('application/pdf')).toBe(false);
  });
});
