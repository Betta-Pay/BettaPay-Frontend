export const SETTINGS_SECTIONS = ["fees", "authPolicy", "rateLimits", "maintenance"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export interface FeesSettings {
  defaultBps: number;
  capUsdc: number;
  minFeeUsdc: number;
}
export interface AuthPolicySettings {
  ipScoreThreshold: number;
  lockoutMaxFailures: number;
  lockoutMinutes: number;
}
export interface RateLimitSettings {
  globalRequestsPerMinute: number;
  burst: number;
  windowSeconds: number;
}
export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  readOnlyMode: boolean;
}

export interface SettingsValues {
  fees: FeesSettings;
  authPolicy: AuthPolicySettings;
  rateLimits: RateLimitSettings;
  maintenance: MaintenanceSettings;
}

export interface SectionMeta {
  version: number;
  updatedAt: string | null;
}

export type SettingsSnapshot = {
  [K in SettingsSection]: SettingsValues[K] & SectionMeta;
};
