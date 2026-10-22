import { apiClient } from '@/lib/api/axios';
import {
  normalizeAsset,
  toCreateBody,
  toUpdateBody,
  type CreateAssetInput,
  type RawSupportedAsset,
  type SupportedAsset,
  type UpdateAssetInput,
} from './types';

interface AssetListResponse {
  data?: RawSupportedAsset[];
}

interface AssetResponse {
  data?: RawSupportedAsset;
}

/**
 * `GET /api/assets`. Returns only enabled assets unless `includeInactive` is
 * set, which the admin table needs so a disabled asset can be re-enabled.
 */
export async function fetchAssets(opts: { includeInactive?: boolean } = {}): Promise<SupportedAsset[]> {
  const res = await apiClient.get<AssetListResponse | RawSupportedAsset[]>('/api/assets', {
    params: opts.includeInactive ? { includeInactive: true } : undefined,
  });
  const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  return rows.map(normalizeAsset);
}

export async function createAsset(input: CreateAssetInput): Promise<SupportedAsset> {
  const res = await apiClient.post<AssetResponse>('/api/admin/assets', toCreateBody(input));
  return normalizeAsset(res.data?.data ?? toCreateBody(input));
}

export async function updateAsset(code: string, input: UpdateAssetInput): Promise<SupportedAsset> {
  const res = await apiClient.patch<AssetResponse>(
    `/api/admin/assets/${encodeURIComponent(code)}`,
    toUpdateBody(input),
  );
  return normalizeAsset(res.data?.data ?? { code });
}

export async function deleteAsset(code: string): Promise<void> {
  await apiClient.delete(`/api/admin/assets/${encodeURIComponent(code)}`);
}
