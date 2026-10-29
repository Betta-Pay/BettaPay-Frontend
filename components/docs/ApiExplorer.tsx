"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Gauge,
  KeyRound,
  Loader2,
  Lock,
  Play,
  ShieldAlert,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SchemaTable } from "./SchemaTable";
import type { ExplorerEndpoint, ExplorerModel } from "@/lib/docs/openapi-explorer";
import type { HttpMethod, SchemaField } from "@/lib/docs/types";

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  POST: "bg-info/10 text-info",
  PATCH: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PUT: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  DELETE: "bg-destructive/10 text-destructive",
};

interface TryItResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
  url: string;
}

function paramKey(location: "path" | "query" | "header", name: string): string {
  return `${location}:${name}`;
}

function initialValues(endpoint: ExplorerEndpoint): Record<string, string> {
  const entries: Array<[string, string]> = [];
  for (const field of endpoint.pathParams) {
    entries.push([paramKey("path", field.name), field.example ?? ""]);
  }
  for (const field of endpoint.queryParams) {
    entries.push([paramKey("query", field.name), field.example ?? ""]);
  }
  for (const field of endpoint.headerParams) {
    entries.push([paramKey("header", field.name), field.example ?? ""]);
  }
  return Object.fromEntries(entries);
}

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 font-mono text-xs font-bold",
        METHOD_STYLES[method],
      )}
    >
      {method}
    </span>
  );
}

function ParamInputs({
  label,
  fields,
  location,
  values,
  onChange,
}: {
  label: string;
  fields: SchemaField[];
  location: "path" | "query" | "header";
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => {
          const key = paramKey(location, field.name);
          return (
            <label key={key} className="space-y-1 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <code className="font-mono">{field.name}</code>
                {field.required ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground">(optional)</span>
                )}
              </span>
              <input
                value={values[key] ?? ""}
                onChange={(event) => onChange(key, event.target.value)}
                placeholder={field.example ?? field.type}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function TryItPanel({
  endpoint,
  baseUrl,
  apiKey,
}: {
  endpoint: ExplorerEndpoint;
  baseUrl: string;
  apiKey: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(endpoint));
  const [body, setBody] = useState(() =>
    endpoint.requestExample === undefined ? "" : JSON.stringify(endpoint.requestExample, null, 2),
  );
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<TryItResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateValue = useCallback((key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  }, []);

  const send = useCallback(async () => {
    setError(null);
    setResult(null);

    if (endpoint.auth && !apiKey.trim()) {
      setError("Add a dev API key in the Try-it configuration above to call an authenticated endpoint.");
      return;
    }

    let pathname = endpoint.path;
    for (const field of endpoint.pathParams) {
      const value = values[paramKey("path", field.name)] ?? "";
      pathname = pathname.replace(`{${field.name}}`, encodeURIComponent(value));
    }

    const query = new URLSearchParams();
    for (const field of endpoint.queryParams) {
      const value = values[paramKey("query", field.name)] ?? "";
      if (value.trim()) query.set(field.name, value);
    }

    const url = `${baseUrl.replace(/\/+$/, "")}${pathname}${query.toString() ? `?${query.toString()}` : ""}`;
    const headers: Record<string, string> = { Accept: endpoint.requestContentType };

    if (endpoint.auth) headers.Authorization = `Bearer ${apiKey.trim()}`;
    for (const field of endpoint.headerParams) {
      const value = values[paramKey("header", field.name)] ?? "";
      if (value.trim()) headers[field.name] = value;
    }

    const hasBody = body.trim().length > 0 && !["GET", "DELETE"].includes(endpoint.method);
    if (hasBody) headers["Content-Type"] = endpoint.requestContentType;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const startedAt = performance.now();
    setIsSending(true);

    try {
      const response = await fetch(url, {
        method: endpoint.method,
        headers,
        ...(hasBody ? { body } : {}),
        signal: controller.signal,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const text = await response.text();
      setResult({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: text,
        durationMs: Math.round(performance.now() - startedAt),
        url,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.name === "AbortError"
            ? "Request timed out after 30 seconds."
            : caught.message
          : "Request failed.",
      );
    } finally {
      clearTimeout(timeout);
      setIsSending(false);
    }
  }, [apiKey, baseUrl, body, endpoint, values]);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Try it</p>
          <p className="text-xs text-muted-foreground">
            Sends a real request to the API using the key configured above. Your key stays in this
            browser tab.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void send()}
          disabled={isSending}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Sending...
            </>
          ) : (
            <>
              <Play className="mr-2 h-3.5 w-3.5" /> Send request
            </>
          )}
        </button>
      </div>

      <ParamInputs
        label="Path parameters"
        fields={endpoint.pathParams}
        location="path"
        values={values}
        onChange={updateValue}
      />
      <ParamInputs
        label="Query parameters"
        fields={endpoint.queryParams}
        location="query"
        values={values}
        onChange={updateValue}
      />
      <ParamInputs
        label="Headers"
        fields={endpoint.headerParams}
        location="header"
        values={values}
        onChange={updateValue}
      />

      {!["GET", "DELETE"].includes(endpoint.method) && (
        <div className="space-y-1">
          <label htmlFor={`${endpoint.id}-body`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Request body ({endpoint.requestContentType})
          </label>
          <textarea
            id={`${endpoint.id}-body`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-xs text-muted-foreground">
            Prefilled from the OpenAPI schema. Edit it freely — the raw text is sent as-is.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {result && (
        <div className="space-y-3" data-testid={`try-it-result-${endpoint.id}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-md px-2 py-1 font-mono text-xs font-bold",
                result.status >= 200 && result.status < 300
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {result.status} {result.statusText}
            </span>
            <span className="text-xs text-muted-foreground">{result.durationMs}ms</span>
            <code className="break-all text-xs text-muted-foreground">{result.url}</code>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Response headers
            </p>
            <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
              {Object.entries(result.headers)
                .map(([name, value]) => `${name}: ${value}`)
                .join("\n") || "(none)"}
            </pre>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Raw response body
            </p>
            <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
              {result.body || "(empty body)"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="border-t border-border pt-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-sm font-semibold text-foreground">
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {title}
      </summary>
      <div className="space-y-3 pb-2 pt-2">{children}</div>
    </details>
  );
}

function EndpointCard({
  endpoint,
  baseUrl,
  apiKey,
}: {
  endpoint: ExplorerEndpoint;
  baseUrl: string;
  apiKey: string;
}) {
  const requestExample = useMemo(
    () =>
      endpoint.requestExample === undefined
        ? null
        : JSON.stringify(endpoint.requestExample, null, 2),
    [endpoint.requestExample],
  );
  const responseExample = useMemo(
    () =>
      endpoint.responseExample === undefined
        ? null
        : JSON.stringify(endpoint.responseExample, null, 2),
    [endpoint.responseExample],
  );

  return (
    <article className="scroll-mt-24 rounded-2xl border border-border bg-card/40 p-5 sm:p-6">
      <h3 id={endpoint.id} className="scroll-mt-24 text-base font-semibold text-foreground">
        {endpoint.title}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MethodBadge method={endpoint.method} />
        <code className="break-all font-mono text-sm text-foreground">{endpoint.path}</code>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
            endpoint.auth
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-muted text-muted-foreground",
          )}
          title={endpoint.auth ? "Requires a Bearer token" : "No authentication required"}
        >
          {endpoint.auth ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          {endpoint.auth ? "Auth required" : "Public"}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{endpoint.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium text-foreground">Rate limit:</span>{" "}
          {endpoint.rateLimit ?? "Not specified"}
        </span>
        {endpoint.auth && endpoint.authNote && <span>{endpoint.authNote}</span>}
      </div>

      <div className="mt-4">
        <Disclosure title="Example request (from the OpenAPI schema)" defaultOpen>
          {requestExample ? (
            <pre className="overflow-x-auto rounded-xl border border-border bg-foreground p-4 font-mono text-xs text-emerald-400">
              {requestExample}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground">
              This operation has no request body. Path and query parameters are shown below.
            </p>
          )}
        </Disclosure>

        <Disclosure
          title="Parameters & schema"
          defaultOpen={
            endpoint.pathParams.length > 0 ||
            endpoint.queryParams.length > 0 ||
            endpoint.requestBody.length > 0
          }
        >
          {endpoint.pathParams.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Path</p>
              <SchemaTable fields={endpoint.pathParams} />
            </div>
          )}
          {endpoint.queryParams.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Query</p>
              <SchemaTable fields={endpoint.queryParams} />
            </div>
          )}
          {endpoint.headerParams.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Headers</p>
              <SchemaTable fields={endpoint.headerParams} />
            </div>
          )}
          {endpoint.requestBody.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Body</p>
              <SchemaTable fields={endpoint.requestBody} />
            </div>
          )}
        </Disclosure>

        <Disclosure title={`Response (${endpoint.responseStatus})`} defaultOpen>
          {endpoint.responseSchema.length > 0 && <SchemaTable fields={endpoint.responseSchema} />}
          {responseExample && (
            <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 font-mono text-xs text-foreground">
              {responseExample}
            </pre>
          )}
        </Disclosure>

        {endpoint.errors.length > 0 && (
          <Disclosure title="Errors">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[480px] border-collapse text-left">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="py-2.5 pl-4 pr-4 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Code</th>
                    <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.errors.map((error) => (
                    <tr key={`${error.status}-${error.code}`} className="border-t border-border align-top">
                      <td className="py-2.5 pl-4 pr-4 font-mono text-xs text-foreground">{error.status}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-destructive">{error.code}</td>
                      <td className="py-2.5 pr-4 text-xs leading-relaxed text-muted-foreground">
                        {error.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Disclosure>
        )}

        <Disclosure title="Try it">
          <TryItPanel endpoint={endpoint} baseUrl={baseUrl} apiKey={apiKey} />
        </Disclosure>
      </div>
    </article>
  );
}

interface ApiExplorerProps {
  model: ExplorerModel;
}

/**
 * Interactive, OpenAPI-driven reference. The endpoint list, schemas, examples,
 * auth/rate-limit metadata and try-it forms are all derived from the bundled
 * document — this component contains no endpoint-specific wiring.
 */
export function ApiExplorer({ model }: ApiExplorerProps) {
  const [baseUrl, setBaseUrl] = useState(model.baseUrl);
  const [apiKey, setApiKey] = useState("");

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {model.title} Explorer
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{model.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Generated from the bundled OpenAPI {model.version} document · {model.endpoints.length}{" "}
          operations · {model.groups.length} groups
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card/40 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 id="api-explorer-try-it" className="text-sm font-semibold text-foreground">
            Try-it configuration
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Requests are sent directly from your browser. The key is kept in memory for this tab only
          and is never stored by BettaPay. Need a key?{" "}
          <Link href="/developers" className="text-primary underline-offset-4 hover:underline">
            Generate a sandbox key
          </Link>
          .
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">API base URL</span>
            <input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-muted px-3 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">
              API key / Bearer token
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="bp_test_..."
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-xl border border-border bg-muted px-3 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
        </div>
      </div>

      {model.groups.map((group) => (
        <section key={group.id} id={group.id} className="scroll-mt-24 space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{group.title}</h2>
            {group.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{group.description}</p>
            )}
          </div>
          <div className="space-y-5">
            {group.endpoints.map((endpoint) => (
              <EndpointCard
                key={endpoint.id}
                endpoint={endpoint}
                baseUrl={baseUrl}
                apiKey={apiKey}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
