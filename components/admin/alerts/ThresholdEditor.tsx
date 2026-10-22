"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useAlertFeed } from "@/lib/alerts/useAlertFeed";
import { useNotify } from "@/lib/hooks/useNotify";
import { validateRulePatch } from "@/lib/alerts/rules";
import { ALERT_SEVERITIES, type AlertRule, type AlertSeverity } from "@/lib/alerts/types";

interface Draft {
  enabled: boolean;
  threshold: string;
  windowMinutes: string;
  severity: AlertSeverity;
}

const toDraft = (r: AlertRule): Draft => ({
  enabled: r.enabled,
  threshold: String(r.threshold),
  windowMinutes: String(r.windowMinutes),
  severity: r.severity,
});

function RuleForm({ rule }: { rule: AlertRule }) {
  const notify = useNotify();
  const { updateRule } = useAlertFeed();
  const [draft, setDraft] = useState<Draft>(toDraft(rule));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(toDraft(rule)), [rule]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const candidate = {
      enabled: draft.enabled,
      threshold: draft.threshold.trim() === "" ? NaN : Number(draft.threshold),
      windowMinutes: draft.windowMinutes.trim() === "" ? NaN : Number(draft.windowMinutes),
      severity: draft.severity,
    };
    const result = validateRulePatch(candidate);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateRule(rule.id, result.patch);
      notify.success(`${rule.name} saved`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save rule";
      setError(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  }

  const fieldId = (name: string) => `${rule.id}-${name}`;

  return (
    <form onSubmit={save} className="space-y-3 rounded-xl border border-border p-3" aria-label={rule.name}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{rule.name}</p>
          <p className="text-xs text-muted-foreground">{rule.description}</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label htmlFor={fieldId("threshold")} className="flex flex-col gap-1 text-xs font-medium">
          Threshold ({rule.unit})
          <input
            id={fieldId("threshold")}
            inputMode="decimal"
            value={draft.threshold}
            onChange={(e) => setDraft({ ...draft, threshold: e.target.value })}
            className="h-9 rounded-lg border bg-background px-2 text-sm"
          />
        </label>
        <label htmlFor={fieldId("window")} className="flex flex-col gap-1 text-xs font-medium">
          Window (min)
          <input
            id={fieldId("window")}
            inputMode="numeric"
            value={draft.windowMinutes}
            onChange={(e) => setDraft({ ...draft, windowMinutes: e.target.value })}
            className="h-9 rounded-lg border bg-background px-2 text-sm"
          />
        </label>
        <label htmlFor={fieldId("severity")} className="flex flex-col gap-1 text-xs font-medium">
          Severity
          <select
            id={fieldId("severity")}
            value={draft.severity}
            onChange={(e) => setDraft({ ...draft, severity: e.target.value as AlertSeverity })}
            className="h-9 rounded-lg border bg-background px-2 text-sm"
          >
            {ALERT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

/** Per-rule threshold configuration for the admin alert rules. */
export function ThresholdEditor() {
  const { rules, loaded, error } = useAlertFeed();
  return (
    <Card className="border border-border bg-card shadow-sm md:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Alert thresholds</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              An alert is raised when a metric reaches its threshold within the window.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {!loaded && <p className="text-sm text-muted-foreground">Loading rules…</p>}
        {loaded && rules.length === 0 && (
          <p className="text-sm text-destructive">{error ?? "No alert rules available."}</p>
        )}
        {rules.map((rule) => (
          <RuleForm key={rule.id} rule={rule} />
        ))}
      </CardContent>
    </Card>
  );
}
