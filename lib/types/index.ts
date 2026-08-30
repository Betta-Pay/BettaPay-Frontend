export type Role = 'merchant' | 'admin';

export type BusinessType = 'individual' | 'sole_proprietor' | 'llc' | 'corporation';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
  businessName?: string;
  kybStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  address?: string;
  registrationNumber?: string;
}

export type AuthSessionStatus = 'active' | 'revoked' | 'expired';

export interface AuthSession {
  id: string;
  device: string;
  ipAddress: string;
  lastActivityAt: string;
  expiresAt: string;
  status: AuthSessionStatus;
  isCurrent: boolean;
  revokedAt?: string | null;
}

export interface AuthSessionsResponse {
  active: AuthSession[];
  history: AuthSession[];
}

export interface AuthLoginResponse {
  ok: boolean;
  revokedSessionCount?: number;
}

export interface AssetBalance {
  assetCode: string;
  balance: string;
  assetIssuer?: string;
  usdEquivalent?: number;
}

export interface MerchantProfile {
  businessName: string;
  businessType: BusinessType;
  country: string;
  industry: string;
  websiteUrl: string | null;
  contactEmail: string;
  phoneNumber: string | null;
  logoUrl: string | null;
}

export interface MerchantBankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode?: string;
}

// ─── Anchor types ─────────────────────────────────────────────────────────────

export type KycLevel = 'basic' | 'intermediate' | 'advanced';

export interface Anchor {
  id: string;
  name: string;
  code: string;
  currency: string;
  country: string;
  flag: string;
  kycLevels: KycLevel[];
  settlementTime: string;
  websiteUrl: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AnchorHealthStatus = 'healthy' | 'degraded' | 'unreachable' | 'unchecked';

export interface AnchorHealth {
  anchorId: string;
  status: AnchorHealthStatus;
  latencyMs: number | null;
  checkedAt: string;
  errorMessage?: string;
}

export interface AnchorSettlementStats {
  anchorId: string;
  totalVolumeUsdc: number;
  settlementCount: number;
  failureCount: number;
  failureRate: number;
  lastSettlementAt: string | null;
  periodDays: number;
}

export interface AnchorWithHealth extends Anchor {
  health: AnchorHealth | null;
  stats: AnchorSettlementStats | null;
}
