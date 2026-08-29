'use client';

/**
 * Client data layer for merchant KYB.
 *
 * `useMerchantKyb`      — the merchant's own verification profile + documents.
 * `useUploadKybDocument` — a multipart upload that reports byte progress so the
 *                          UI can render a real progress bar, not a spinner.
 *
 * Both talk to the same-origin Next API routes under
 * `/api/merchants/:id/kyb`, matching how `useKybMerchants` calls the admin
 * routes.
 */

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosProgressEvent } from 'axios';
import { apiClient } from '@/lib/api/axios';
import { getErrorMessage } from '@/lib/utils/apiError';
import type { KybDocType, KybDocument, MerchantKyb } from './types';
import { emptyMerchantKyb } from './types';

export const kybQueryKeys = {
  profile: (merchantId?: string) => ['merchant', merchantId ?? null, 'kyb'] as const,
};

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export interface UseMerchantKybResult {
  data: MerchantKyb;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMerchantKyb(merchantId: string | undefined): UseMerchantKybResult {
  const query = useQuery<MerchantKyb, Error>({
    queryKey: kybQueryKeys.profile(merchantId),
    enabled: Boolean(merchantId),
    queryFn: async () => {
      const res = await apiClient.get(`/api/merchants/${merchantId}/kyb`);
      return unwrap<MerchantKyb>(res.data);
    },
  });

  return {
    data: query.data ?? emptyMerchantKyb(merchantId ?? 'unknown'),
    isLoading: query.isLoading,
    error: query.isError ? getErrorMessage(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
  };
}

export interface UploadKybDocumentVars {
  type: KybDocType;
  file: File;
  /** Dev/demo affordance forwarded to the API to force a rejection. */
  simulateReject?: boolean;
}

export interface UploadKybDocumentResult {
  document: KybDocument | null;
  kyb: MerchantKyb;
}

/**
 * Upload one document. `progress` is 0–100 for the file currently uploading;
 * it resets to 0 when a new upload starts and holds at 100 once the bytes are
 * sent (the server response may still be pending).
 */
export function useUploadKybDocument(merchantId: string | undefined) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [activeType, setActiveType] = useState<KybDocType | null>(null);

  const mutation = useMutation<UploadKybDocumentResult, Error, UploadKybDocumentVars>({
    mutationFn: async ({ type, file, simulateReject }) => {
      setActiveType(type);
      setProgress(0);

      const form = new FormData();
      form.append('type', type);
      form.append('file', file);
      if (simulateReject) form.append('simulate', 'reject');

      const res = await apiClient.post(
        `/api/merchants/${merchantId}/kyb/documents`,
        form,
        {
          // Let the browser set `multipart/form-data` with its boundary — the
          // shared client defaults to `application/json`, which would break the
          // multipart parse if it stuck.
          headers: { 'Content-Type': undefined },
          onUploadProgress: (event: AxiosProgressEvent) => {
            if (!event.total) return;
            setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          },
        },
      );
      return unwrap<UploadKybDocumentResult>(res.data);
    },
    onSuccess: (result) => {
      setProgress(100);
      queryClient.setQueryData(kybQueryKeys.profile(merchantId), result.kyb);
      void queryClient.invalidateQueries({ queryKey: kybQueryKeys.profile(merchantId) });
    },
    onError: () => {
      setProgress(0);
    },
    onSettled: () => {
      setActiveType(null);
    },
  });

  const upload = useCallback(
    (vars: UploadKybDocumentVars) => mutation.mutateAsync(vars),
    [mutation],
  );

  return {
    upload,
    isUploading: mutation.isPending,
    progress,
    activeType,
    error: mutation.isError ? getErrorMessage(mutation.error) : null,
    reset: mutation.reset,
  };
}
