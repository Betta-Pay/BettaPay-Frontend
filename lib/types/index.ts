export type Role = 'merchant' | 'admin';

export type BusinessType = 'individual' | 'sole_proprietor' | 'llc' | 'corporation';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  businessName?: string;
  kybStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
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
