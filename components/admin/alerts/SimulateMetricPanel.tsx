"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useNotify } from "@/lib/hooks/useNotify";
import { ALERT_METRICS, type AlertMetric, type AlertRule } from "@/lib/alerts/types";

interface Props {
  rules: AlertRule[];
  simulate: (metric: AlertMetric, value: number) => Promise<void>;
}

/** Development aid: push a metric sample and watch the evaluator react. */
export function SimulateMetricPanel({ rules, simulate }: Props) {
  const notify = useNotify();
  const [metric, setMetric] = useState<AlertMetric>("settlement_failure_rate");
  const [value, setValue] = useState("12");
  const [busy, setBusy] = useState(false);

  const rule = rules.find((r) => r.id === metric);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(value);
    if (value.trim() === "" || !Number.isFinite(parsed) || parsed < 0) {
      notify.error("Enter a non-negative number");
      return;
    }
    setBusy(true);
    try {
      await simulate(metric, parsed);
      notify.success(`Sample ${parsed} sent for ${rule?.name ?? metric}`);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Unable to send sample");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-dashed border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Simulate metric (development only)</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium">
            Metric
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as AlertMetric)}
              className="h-9 rounded-lg border bg-background px-2 text-sm"
            >
              {ALERT_METRICS.map((m) => (
                <option key={m} value={m}>
                  {rules.find((r) => r.id === m)?.name ?? m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Value {rule ? `(${rule.unit}, threshold ${rule.threshold})` : ""}
            <input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9 w-32 rounded-lg border bg-background px-2 text-sm"
            />
          </label>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Sending…" : "Send sample"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
