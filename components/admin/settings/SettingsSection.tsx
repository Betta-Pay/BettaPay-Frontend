"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, CardTitle, Input, Toggle } from "@/components/ui";
import { useNotify } from "@/lib/hooks/useNotify";
import { fieldErrors, sectionSchemas } from "@/lib/settings/schema";
import { SettingsSaveError, useSaveSection } from "@/lib/settings/client";
import type { SettingsSection as SectionKey, SettingsValues } from "@/lib/settings/types";

export type FieldConfig =
  | { key: string; label: string; type: "number"; help?: string; step?: string }
  | { key: string; label: string; type: "text"; help?: string }
  | { key: string; label: string; type: "bool"; help?: string };

type Draft = Record<string, string | boolean>;

const draftKey = (section: SectionKey) => `bp:admin:settings:draft:${section}`;

function toDraft(values: Record<string, unknown>, fields: FieldConfig[]): Draft {
  const d: Draft = {};
  for (const f of fields) {
    const v = values[f.key];
    d[f.key] = f.type === "bool" ? Boolean(v) : String(v ?? "");
  }
  return d;
}

function fromDraft(draft: Draft, fields: FieldConfig[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = draft[f.key];
    out[f.key] = f.type === "number" ? (v === "" ? NaN : Number(v)) : v;
  }
  return out;
}

function readStored(section: SectionKey): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(draftKey(section));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeStored(section: SectionKey, draft: Draft | null) {
  try {
    if (draft) window.sessionStorage.setItem(draftKey(section), JSON.stringify(draft));
    else window.sessionStorage.removeItem(draftKey(section));
  } catch {
    // Storage unavailable: dirty state just won't survive a reload.
  }
}

interface Props<K extends SectionKey> {
  section: K;
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: FieldConfig[];
  /** Server values for this section (without version metadata). */
  server: SettingsValues[K];
  updatedAt: string | null;
  simulateFailure: boolean;
  onDirtyChange: (section: K, dirty: boolean) => void;
  /** Maintenance-style sections ask before saving when this returns text. */
  confirmMessage?: (draft: Record<string, unknown>, server: SettingsValues[K]) => string | null;
}

export function SettingsSectionCard<K extends SectionKey>({
  section,
  title,
  description,
  icon,
  fields,
  server,
  updatedAt,
  simulateFailure,
  onDirtyChange,
  confirmMessage,
}: Props<K>) {
  const notify = useNotify();
  const save = useSaveSection<K>();
  const serverDraft = useMemo(() => toDraft(server as unknown as Record<string, unknown>, fields), [server, fields]);

  const [draft, setDraft] = useState<Draft>(serverDraft);
  const [restored, setRestored] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore an unsaved draft once after mount.
  useEffect(() => {
    const stored = readStored(section);
    if (stored && JSON.stringify(stored) !== JSON.stringify(serverDraft)) {
      setDraft({ ...serverDraft, ...stored });
      setRestored(true);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(serverDraft);

  // When the server value changes (after save/refetch) and there is no local edit, follow it.
  useEffect(() => {
    // Skipped until the stored draft has been restored, or it would be overwritten.
    if (!hydrated) return;
    if (!dirty) setDraft(serverDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverDraft]);

  useEffect(() => {
    if (!hydrated) return;
    onDirtyChange(section, dirty);
    writeStored(section, dirty ? draft : null);
  }, [dirty, draft, hydrated, onDirtyChange, section]);

  const set = (key: string, value: string | boolean) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!(key in e)) return e;
      const { [key]: _drop, ...rest } = e;
      return rest;
    });
  };

  const reset = useCallback(() => {
    setDraft(serverDraft);
    setErrors({});
    setRestored(false);
    setPendingConfirm(null);
  }, [serverDraft]);

  const commit = (values: SettingsValues[K]) => {
    save.mutate(
      { section, values, simulateFailure },
      {
        onSuccess: () => {
          setRestored(false);
          notify.success(`${title} saved`);
        },
        onError: (err) => {
          if (err instanceof SettingsSaveError && Object.keys(err.fields).length) setErrors(err.fields);
          notify.error(`Couldn't save ${title.toLowerCase()}: ${err.message}. Your previous value was restored.`);
        },
      },
    );
  };

  const submit = (confirmed = false) => {
    const values = fromDraft(draft, fields);
    const parsed = sectionSchemas[section].safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const warning = confirmMessage?.(parsed.data as Record<string, unknown>, server);
    if (warning && !confirmed) {
      setPendingConfirm(warning);
      return;
    }
    setPendingConfirm(null);
    // The optimistic update replaces `server`; keep the typed draft in sync with it.
    commit(parsed.data as SettingsValues[K]);
  };

  return (
    <Card className="border border-border bg-card shadow-sm" data-testid={`settings-${section}`}>
      <CardHeader>
        <div className="flex items-start gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">{icon}</div>
          <div className="flex-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {title}
              {dirty && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Unsaved changes</span>}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            {updatedAt && <p className="text-[11px] text-muted-foreground mt-1">Last saved {new Date(updatedAt).toLocaleString()}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {restored && (
          <p role="status" className="text-xs text-muted-foreground">
            Unsaved changes restored from your last visit.
          </p>
        )}
        {fields.map((f) => {
          const id = `${section}-${f.key}`;
          const err = errors[f.key];
          if (f.type === "bool") {
            return (
              <div key={f.key} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                </div>
                <Toggle checked={Boolean(draft[f.key])} label={f.label} onClick={() => set(f.key, !draft[f.key])} />
              </div>
            );
          }
          return (
            <div key={f.key}>
              <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
                {f.label}
              </label>
              <Input
                id={id}
                type={f.type === "number" ? "number" : "text"}
                inputMode={f.type === "number" ? "decimal" : undefined}
                step={f.type === "number" ? f.step ?? "1" : undefined}
                value={String(draft[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                aria-invalid={err ? true : undefined}
                aria-describedby={err ? `${id}-error` : f.help ? `${id}-help` : undefined}
              />
              {err ? (
                <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
                  {err}
                </p>
              ) : (
                f.help && (
                  <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">
                    {f.help}
                  </p>
                )
              )}
            </div>
          );
        })}

        {pendingConfirm && (
          <Alert variant="warning">
            <AlertTriangle aria-hidden="true" />
            <AlertDescription>
              <p>{pendingConfirm}</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" onClick={() => submit(true)}>
                  Confirm and save
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setPendingConfirm(null)}>
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => submit()} disabled={!dirty || save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={reset} disabled={!dirty || save.isPending}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
