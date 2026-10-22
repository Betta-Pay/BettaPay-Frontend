"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { PLAYGROUND_FROM, PLAYGROUND_TO, type PlaygroundResult } from "@/lib/playground/quote";

type RunState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "done"; result: PlaygroundResult };

const FIELD = "rounded-lg border bg-background p-2 text-sm";

/**
 * Runs a real quote through `/api/playground/quote` and shows exactly what
 * came back: status, latency and the upstream body. If the FX service is down
 * the panel says so; it never substitutes sample data.
 */
export function TryItPanel() {
  const [from, setFrom] = useState("USDC");
  const [to, setTo] = useState("NGN");
  const [amount, setAmount] = useState("50");
  const [state, setState] = useState<RunState>({ phase: "idle" });

  const run = async () => {
    setState({ phase: "running" });
    const params = new URLSearchParams({ op: "quote", from, to, amount });
    const started = performance.now();
    try {
      const res = await fetch(`/api/playground/quote?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as Partial<PlaygroundResult>;
      setState({
        phase: "done",
        result: {
          ok: Boolean(body.ok) && res.ok,
          status: body.status ?? res.status,
          latencyMs: body.latencyMs ?? Math.round(performance.now() - started),
          request: body.request ?? `GET /api/quote?from=${from}&to=${to}&amount=${amount}`,
          data: body.data,
          error: body.error,
        },
      });
    } catch {
      setState({
        phase: "done",
        result: {
          ok: false,
          status: 0,
          latencyMs: Math.round(performance.now() - started),
          request: `GET /api/quote?from=${from}&to=${to}&amount=${amount}`,
          error: "The playground could not be reached. Check your connection and try again.",
        },
      });
    }
  };

  const result = state.phase === "done" ? state.result : null;

  return (
    <section aria-labelledby="try-it-heading" className="space-y-4 rounded-xl border p-5">
      <div>
        <h3 id="try-it-heading" className="text-base font-semibold">
          Try it
        </h3>
        <p className="text-sm text-muted-foreground">
          Runs <code className="font-mono text-xs">client.fx.quote()</code> against the live FX
          service with a sandbox key.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
      >
        <label className="flex flex-col gap-1 text-xs font-medium">
          From
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD}>
            {PLAYGROUND_FROM.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          To
          <select value={to} onChange={(e) => setTo(e.target.value)} className={FIELD}>
            {PLAYGROUND_TO.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Amount
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(FIELD, "w-28")}
          />
        </label>
        <Button type="submit" disabled={state.phase === "running"}>
          {state.phase === "running" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
          )}
          Run request
        </Button>
      </form>

      <div role="status" aria-live="polite">
        {state.phase === "running" && (
          <p className="text-sm text-muted-foreground">Requesting a quote…</p>
        )}
        {result && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-xs",
                  result.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
                )}
              >
                {result.status === 0 ? "No response" : `HTTP ${result.status}`}
              </Badge>
              <span className="text-xs text-muted-foreground">{result.latencyMs} ms</span>
              <code className="text-xs font-mono text-muted-foreground">{result.request}</code>
            </div>
            {result.error && (
              <p role="alert" className="text-sm text-destructive">
                {result.error}
              </p>
            )}
            {result.data !== undefined && (
              <pre
                aria-label="Response body"
                className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-xs font-mono"
              >
                {typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
