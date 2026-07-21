export type Role = 'merchant' | 'admin';

export type BusinessType = 'individual' | 'sole_proprietor' | 'llc' | 'corporation';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  businessName?: string;
  kybStatus?: 'pending' | 'approved' | 'rejected' | 'none';
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
