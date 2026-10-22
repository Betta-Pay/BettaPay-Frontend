"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuditEntry } from "@/lib/audit/types";
import type { SettingsSection, SettingsSnapshot, SettingsValues } from "./types";

export const settingsKeys = {
  all: ["admin", "settings"] as const,
  history: ["admin", "settings", "history"] as const,
};

export class SettingsSaveError extends Error {
  constructor(message: string, public fields: Record<string, string> = {}) {
    super(message);
  }
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new SettingsSaveError((body as { error?: string }).error ?? `Request failed (${res.status})`, (body as { fields?: Record<string, string> }).fields);
  }
  return body as T;
}

export function useSettings() {
  return useQuery<SettingsSnapshot, Error>({
    queryKey: settingsKeys.all,
    queryFn: async () => (await json<{ data: SettingsSnapshot }>(await fetch("/api/admin/settings", { cache: "no-store" }))).data,
    staleTime: 0,
    retry: 1,
  });
}

export function useSettingsHistory() {
  return useQuery<AuditEntry[], Error>({
    queryKey: settingsKeys.history,
    queryFn: async () => (await json<{ data: AuditEntry[] }>(await fetch("/api/admin/settings/history", { cache: "no-store" }))).data,
  });
}

interface SaveVars<K extends SettingsSection> {
  section: K;
  values: SettingsValues[K];
  /** Dev only: ask the server to fail this save after the optimistic update. */
  simulateFailure?: boolean;
}

/**
 * Optimistic save. The cache shows the new value immediately; if the server
 * rejects, the previous server value is restored and the caller's `onError`
 * can toast. Either way the section is refetched so the UI ends on server truth.
 */
export function useSaveSection<K extends SettingsSection>() {
  const qc = useQueryClient();
  return useMutation<unknown, SettingsSaveError, SaveVars<K>, { previous?: SettingsSnapshot }>({
    mutationFn: async ({ section, values, simulateFailure }) =>
      json(
        await fetch(`/api/admin/settings/${section}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(simulateFailure ? { "x-simulate-failure": "1" } : {}) },
          body: JSON.stringify(values),
        }),
      ),
    onMutate: async ({ section, values }) => {
      await qc.cancelQueries({ queryKey: settingsKeys.all, exact: true });
      const previous = qc.getQueryData<SettingsSnapshot>(settingsKeys.all);
      if (previous) {
        qc.setQueryData<SettingsSnapshot>(settingsKeys.all, {
          ...previous,
          [section]: { ...previous[section], ...values, version: previous[section].version + 1 },
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(settingsKeys.all, ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
