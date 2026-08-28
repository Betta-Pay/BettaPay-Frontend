'use client';

/**
 * One KYB document slot: pick a file, validate it in the browser, preview it,
 * watch the upload progress, then see its review status. A rejected document
 * shows the reviewer's reason and a re-upload control. (Issue #458.)
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { Progress } from '@/components/ui';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUploadKybDocument } from '@/lib/kyc/api';
import {
  fileInputAccept,
  formatBytes,
  isImageMime,
  validateKybFile,
  type FileRejection,
} from '@/lib/kyc/validation';
import type { KybDocTypeMeta, KybDocument } from '@/lib/kyc/types';
import { KybDocStatusBadge } from './KybStatusBadge';
import { FileText, Upload, RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  merchantId: string;
  meta: KybDocTypeMeta;
  document: KybDocument | null;
  disabled?: boolean;
}

export function KybDocumentRow({ merchantId, meta, document, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejection, setRejection] = useState<FileRejection | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  const { upload, isUploading, progress, error } = useUploadKybDocument(merchantId);

  // Revoke the object URL when the preview changes or the row unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pick() {
    setRejection(null);
    inputRef.current?.click();
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
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

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(isImageMime(file.type) ? URL.createObjectURL(file) : null);
    setPreviewName(file.name);

    try {
      await upload({ type: meta.type, file });
    } catch {
      // The hook surfaces `error`; nothing more to do here.
    }
  }

  const showRejectionBanner = document?.status === 'rejected';
  const isBusy = isUploading || Boolean(disabled);

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{meta.label}</p>
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {meta.required ? 'Required' : 'Optional'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{meta.hint}</p>
        </div>
        {document && <KybDocStatusBadge status={document.status} />}
      </div>

      {/* Current file / preview */}
      {(document || previewName) && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/50 p-2.5">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={`Preview of ${meta.label}`}
              width={40}
              height={40}
              className="h-10 w-10 rounded object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded bg-background">
              <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {document?.fileName ?? previewName}
            </p>
            {document && (
              <p className="text-[11px] text-muted-foreground">
                {formatBytes(document.sizeBytes)} · uploaded{' '}
                {new Date(document.uploadedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="mt-3 space-y-1">
          <Progress value={progress} label={`Uploading ${meta.label}`} />
          <p className="text-[11px] text-muted-foreground">Uploading… {progress}%</p>
        </div>
      )}

      {/* Client-side validation error */}
      {rejection && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {rejection.message}
        </p>
      )}

      {/* Server error */}
      {error && !rejection && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Rejection reason from the reviewer */}
      {showRejectionBanner && (
        <Alert variant="destructive" className="mt-3">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Document rejected</AlertTitle>
          <AlertDescription>
            {document?.rejectionReason ??
              'This document was not accepted. Please upload a replacement.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-3">
        <input
          ref={inputRef}
          type="file"
          accept={fileInputAccept()}
          className="hidden"
          onChange={onFile}
          data-testid={`kyb-file-input-${meta.type}`}
        />
        <Button
          type="button"
          variant={document && !showRejectionBanner ? 'outline' : 'default'}
          size="sm"
          disabled={isBusy}
          onClick={pick}
          className={cn('gap-2', isBusy && 'opacity-60')}
        >
          {document ? (
            <>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Replace file
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
