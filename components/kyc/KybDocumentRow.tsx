'use client';

/**
 * Visual Document Upload Zone:
 * One KYB document slot with drag-and-drop file upload, client-side validation,
 * thumbnail preview, and real-time verification status badges.
 */

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { Progress } from '@/components/ui';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useKybDocumentUpload } from '@/lib/kyc/useKybDocumentUpload';
import { fileInputAccept, formatBytes } from '@/lib/kyc/validation';
import type { KybDocTypeMeta, KybDocument } from '@/lib/kyc/types';
import { KybDocStatusBadge } from './KybStatusBadge';
import { FileText, Upload, RotateCcw, AlertTriangle, CloudUpload } from 'lucide-react';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'] as const;
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

export function isSupportedKybFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const lowerMime = file.type.toLowerCase();
  const hasAllowedMime =
    lowerMime === '' ? hasAllowedExt : (ALLOWED_MIME_TYPES as readonly string[]).includes(lowerMime);
  return hasAllowedExt && hasAllowedMime;
}

interface Props {
  merchantId: string;
  meta: KybDocTypeMeta;
  document: KybDocument | null;
  disabled?: boolean;
  /** Demo affordance: send the next upload for a forced reviewer rejection. */
  simulateReject?: boolean;
}

export function KybDocumentRow({
  merchantId,
  meta,
  document,
  disabled,
  simulateReject,
}: Props) {
  const {
    inputRef,
    pick,
    onFileChange,
    uploadFile,
    rejection,
    previewUrl,
    previewName,
    isUploading,
    progress,
    error,
  } = useKybDocumentUpload({ merchantId, type: meta.type, simulateReject });

  const [isDragging, setIsDragging] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handlePick = useCallback(() => {
    setInlineError(null);
    pick();
  }, [pick]);

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!isSupportedKybFile(file)) {
        e.target.value = '';
        setInlineError(
          'Unsupported file format. Please upload a .pdf, .png, or .jpg file.'
        );
        return;
      }

      setInlineError(null);
      await onFileChange(e);
    },
    [onFileChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled || isUploading) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        if (!isSupportedKybFile(file)) {
          setInlineError(
            'Unsupported file format. Please upload a .pdf, .png, or .jpg file.'
          );
          return;
        }
        setInlineError(null);
        await uploadFile(file);
      }
    },
    [disabled, isUploading, uploadFile]
  );

  const showRejectionBanner = document?.status === 'rejected';
  const isBusy = isUploading || Boolean(disabled);
  const validationErrorMessage = inlineError ?? rejection?.message ?? null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "rounded-2xl border p-4 transition-all duration-200",
        validationErrorMessage
          ? "border-destructive bg-destructive/5"
          : isDragging
            ? "border-primary border-dashed bg-primary/5 shadow-[0_0_15px_rgba(240,165,0,0.15)] ring-2 ring-primary/20"
            : "border-border bg-card hover:border-border/80"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{meta.label}</p>
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                meta.required
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {meta.required ? 'Required' : 'Optional'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{meta.hint}</p>
        </div>
        {document && <KybDocStatusBadge status={document.status} />}
      </div>

      {/* Current file / preview thumbnail */}
      {(document || previewName) && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted/40 border border-border/60 p-3">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={`Preview of ${meta.label}`}
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg object-cover border border-border shadow-xs"
              unoptimized
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-card border border-border text-muted-foreground">
              <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {document?.fileName ?? previewName}
            </p>
            {document && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatBytes(document.sizeBytes)} · Uploaded{' '}
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
          <p className="text-[11px] text-muted-foreground font-mono">Uploading… {progress}%</p>
        </div>
      )}

      {/* Drag & drop helper indicator */}
      {!document && !previewName && !isUploading && (
        <div
          onClick={handlePick}
          className={cn(
            "mt-3 border border-dashed rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs font-medium",
            isDragging
              ? "border-primary text-primary bg-primary/10"
              : "border-border/70 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
          )}
        >
          <CloudUpload className="w-4 h-4 text-primary" />
          <span>Drag & drop PDF, JPG, PNG here or browse</span>
        </div>
      )}

      {/* Server error */}
      {error && !validationErrorMessage && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Rejection reason from reviewer */}
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

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={fileInputAccept()}
          className="hidden"
          onChange={handleFileInputChange}
          aria-invalid={Boolean(validationErrorMessage)}
          aria-describedby={
            validationErrorMessage ? `kyb-file-error-${meta.type}` : undefined
          }
          data-testid={`kyb-file-input-${meta.type}`}
        />
        <Button
          type="button"
          variant={document && !showRejectionBanner ? 'outline' : 'default'}
          size="sm"
          disabled={isBusy}
          onClick={handlePick}
          className={cn(
            'gap-1.5 rounded-xl h-8 text-xs font-semibold',
            !document || showRejectionBanner
              ? 'bg-primary hover:bg-primary-hover text-primary-foreground shadow-button'
              : 'border-border',
            isBusy && 'opacity-60'
          )}
        >
          {document ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Replace file
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Upload
            </>
          )}
        </Button>
      </div>

      {/* Inline client-side file validation error rendered directly beneath file input */}
      {validationErrorMessage && (
        <p
          id={`kyb-file-error-${meta.type}`}
          role="alert"
          data-testid={`kyb-file-error-${meta.type}`}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{validationErrorMessage}</span>
        </p>
      )}
    </div>
  );
}
