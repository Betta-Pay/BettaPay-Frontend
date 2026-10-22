/**
 * Supported assets, as managed by the backend `SupportedAsset` model
 * (`GET /api/assets`, `POST /api/admin/assets`, `PATCH|DELETE /api/admin/assets/:code`).
 *
 * The backend names the issuer `contractId` and the enabled flag `isActive`;
 * the UI speaks `issuer` / `enabled`. `normalizeAsset` is the only place that
 * translates, so a rename on either side is a one-line change.
 */
export interface SupportedAsset {
  code: string;
  name: string;
  /** Soroban contract id (or classic issuer) the asset is minted by. */
  issuer: string;
  decimals: number;
  enabled: boolean;
  /** ISO timestamp, or null when the list endpoint does not return one. */
  createdAt: string | null;
}

/** Wire shape. Both the backend names and the UI names are accepted. */
export interface RawSupportedAsset {
  code: string;
  name?: string;
  contractId?: string;
  issuer?: string;
  decimals?: number;
  isActive?: boolean;
  enabled?: boolean;
  createdAt?: string | null;
}

export function normalizeAsset(raw: RawSupportedAsset): SupportedAsset {
  return {
    code: raw.code,
    name: raw.name ?? raw.code,
    issuer: raw.issuer ?? raw.contractId ?? '',
    decimals: raw.decimals ?? 7,
    enabled: raw.enabled ?? raw.isActive ?? true,
    createdAt: raw.createdAt ?? null,
  };
}

export interface CreateAssetInput {
  code: string;
  name: string;
  issuer: string;
  decimals: number;
  enabled: boolean;
}

export type UpdateAssetInput = Partial<Omit<CreateAssetInput, 'code'>>;

/** UI shape -> backend body (`CreateSupportedAssetBody`). */
export function toCreateBody(input: CreateAssetInput) {
  return {
    code: input.code,
    name: input.name,
    contractId: input.issuer,
    decimals: input.decimals,
    isActive: input.enabled,
  };
}

/** UI shape -> backend body (`UpdateSupportedAssetBody`). Only sends set keys. */
export function toUpdateBody(input: UpdateAssetInput) {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.issuer !== undefined) body.contractId = input.issuer;
  if (input.decimals !== undefined) body.decimals = input.decimals;
  if (input.enabled !== undefined) body.isActive = input.enabled;
  return body;
}
