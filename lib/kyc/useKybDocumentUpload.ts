'use client';

/**
 * State and side effects for one KYB document slot: file picking, client-side
 * validation, thumbnail preview and the upload itself (via
 * `useUploadKybDocument`). `KybDocumentRow` only renders what this returns.
 */

import { useCallback, useRef, useState } from 'react';
import { useUploadKybDocument } from './api';
import { isImageMime, validateKybFile, type FileRejection } from './validation';
import type { KybDocType } from './types';

export interface UseKybDocumentUploadOptions {
  merchantId: string;
  type: KybDocType;
  /** Demo affordance: send the next upload for a forced reviewer rejection. */
  simulateReject?: boolean;
}

export interface UseKybDocumentUploadResult {
  /** Attach to the hidden `<input type="file">`. */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Open the file picker. */
  pick: () => void;
  /** `onChange` handler for the file input. */
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Client-side validation failure for the last picked file. */
  rejection: FileRejection | null;
  /** Data-URL thumbnail for image files, `null` otherwise. */
  previewUrl: string | null;
  /** Name of the last accepted file. */
  previewName: string | null;
  isUploading: boolean;
  progress: number;
  /** Server-side upload error. */
  error: string | null;
}

/**
 * Read an image as a data URL. The production CSP allows `img-src data:` but
 * not `blob:`, so `URL.createObjectURL` previews would break.
 */
function readAsDataUrl(file: File, onLoad: (url: string | null) => void) {
  const reader = new FileReader();
  reader.onload = () => onLoad(typeof reader.result === 'string' ? reader.result : null);
  reader.readAsDataURL(file);
}

export function useKybDocumentUpload({
  merchantId,
  type,
  simulateReject,
}: UseKybDocumentUploadOptions): UseKybDocumentUploadResult {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejection, setRejection] = useState<FileRejection | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  const { upload, isUploading, progress, error } = useUploadKybDocument(merchantId);

  const pick = useCallback(() => {
    setRejection(null);
    inputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Allow re-selecting the same filename later.
      event.target.value = '';
      if (!file) return;

      const problem = validateKybFile(file);
      if (problem) {
        setRejection(problem);
        return;
      }
      setRejection(null);

      setPreviewUrl(null);
      setPreviewName(file.name);
      if (isImageMime(file.type)) {
        readAsDataUrl(file, setPreviewUrl);
      }

      try {
        await upload({ type, file, simulateReject });
      } catch {
        // The upload hook surfaces `error`; nothing more to do here.
      }
    },
    [upload, type, simulateReject],
  );

  return {
    inputRef,
    pick,
    onFileChange,
    rejection,
    previewUrl,
    previewName,
    isUploading,
    progress,
    error,
  };
}
