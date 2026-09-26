import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useKybDocumentUpload } from '../useKybDocumentUpload';

const upload = jest.fn();
const validateKybFile = jest.fn();

jest.mock('../api', () => ({
  useUploadKybDocument: () => ({ upload, isUploading: false, progress: 0, error: null }),
}));

jest.mock('../validation', () => ({
  isImageMime: (type: string) => type.startsWith('image/'),
  validateKybFile: (file: File) => validateKybFile(file),
}));

function changeEvent(file?: File) {
  const target = { files: file ? [file] : [], value: 'C:\\fakepath\\x' };
  return { target } as unknown as React.ChangeEvent<HTMLInputElement>;
}

describe('useKybDocumentUpload', () => {
  beforeEach(() => {
    upload.mockReset().mockResolvedValue(undefined);
    validateKybFile.mockReset().mockReturnValue(null);
  });

  it('uploads a valid file with the slot type and records its name', async () => {
    const { result } = renderHook(() =>
      useKybDocumentUpload({ merchantId: 'm1', type: 'certificate_of_incorporation', simulateReject: true }),
    );
    const file = new File(['%PDF'], 'cert.pdf', { type: 'application/pdf' });
    const event = changeEvent(file);

    await act(() => result.current.onFileChange(event));

    expect(upload).toHaveBeenCalledWith({ type: 'certificate_of_incorporation', file, simulateReject: true });
    expect(result.current.previewName).toBe('cert.pdf');
    expect(result.current.rejection).toBeNull();
    expect(event.target.value).toBe('');
  });

  it('stops at client-side validation and does not upload', async () => {
    const rejection = { code: 'too_large', message: 'File is too large' };
    validateKybFile.mockReturnValue(rejection);
    const { result } = renderHook(() => useKybDocumentUpload({ merchantId: 'm1', type: 'certificate_of_incorporation' }));

    await act(() => result.current.onFileChange(changeEvent(new File(['x'], 'big.pdf'))));

    expect(upload).not.toHaveBeenCalled();
    expect(result.current.rejection).toEqual(rejection);
    expect(result.current.previewName).toBeNull();
  });

  it('swallows upload failures so the caller only reads `error`', async () => {
    upload.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useKybDocumentUpload({ merchantId: 'm1', type: 'certificate_of_incorporation' }));

    await expect(
      act(() => result.current.onFileChange(changeEvent(new File(['x'], 'a.pdf')))),
    ).resolves.toBeUndefined();
  });

  it('ignores an empty selection', async () => {
    const { result } = renderHook(() => useKybDocumentUpload({ merchantId: 'm1', type: 'certificate_of_incorporation' }));
    await act(() => result.current.onFileChange(changeEvent()));
    expect(validateKybFile).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('pick clears a previous rejection and opens the picker', async () => {
    validateKybFile.mockReturnValue({ code: 'unsupported_type', message: 'nope' });
    const { result } = renderHook(() => useKybDocumentUpload({ merchantId: 'm1', type: 'certificate_of_incorporation' }));
    await act(() => result.current.onFileChange(changeEvent(new File(['x'], 'a.exe'))));

    const click = jest.fn();
    (result.current.inputRef as React.MutableRefObject<unknown>).current = { click };
    act(() => result.current.pick());

    expect(click).toHaveBeenCalled();
    expect(result.current.rejection).toBeNull();
  });
});
