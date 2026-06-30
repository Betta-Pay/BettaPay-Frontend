export type Role = 'merchant' | 'admin';

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
