import { DEFAULT_SETTINGS } from "./schema";
import type { SettingsSection, SettingsSnapshot, SettingsValues } from "./types";

const g = globalThis as unknown as { __bpSettings?: SettingsSnapshot };

function initial(): SettingsSnapshot {
  const snap = {} as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingsSection[]) {
    snap[key] = { ...DEFAULT_SETTINGS[key], version: 0, updatedAt: null };
  }
  return snap as SettingsSnapshot;
}

export function getSettings(): SettingsSnapshot {
  if (!g.__bpSettings) g.__bpSettings = initial();
  return g.__bpSettings;
}

/** Strip version metadata so only editable values are diffed/audited. */
export function sectionValues<K extends SettingsSection>(section: K): SettingsValues[K] {
  const { version: _v, updatedAt: _u, ...values } = getSettings()[section];
  return values as unknown as SettingsValues[K];
}

export function saveSection<K extends SettingsSection>(section: K, values: SettingsValues[K]) {
  const snap = getSettings();
  snap[section] = {
    ...values,
    version: snap[section].version + 1,
    updatedAt: new Date().toISOString(),
  } as SettingsSnapshot[K];
  return snap[section];
}

export function resetSettings(): void {
  g.__bpSettings = initial();
}
