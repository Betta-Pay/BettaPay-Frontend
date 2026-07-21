import { ChevronRight, Gauge, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Endpoint, HttpMethod } from '@/lib/docs/types';
import { buildHighlightedSamples, highlight } from '@/lib/docs/highlight';
import { SchemaTable } from './SchemaTable';
import { RequestExample } from './RequestExample';
import { ResponseBlock } from './ResponseBlock';

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  POST: 'bg-info/10 text-info',
  PATCH: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  PUT: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  DELETE: 'bg-destructive/10 text-destructive',
};

/** Native <details> disclosure — keyboard- and screen-reader-friendly for free. */
function Disclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details data-docs-disclosure open={defaultOpen} className="border-t border-border">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-semibold text-foreground">
        <ChevronRight className="docs-chevron h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {title}
      </summary>
      <div className="space-y-4 pb-5 pt-1">{children}</div>
    </details>
  );
}

/**
 * Full documentation block for a single endpoint: method badge + path + auth
 * indicator, description, rate-limit note, and collapsible Parameters, Code
 * Examples, Response and Errors sections. Highlighting happens here on the
 * server; interactive leaves (tabs, copy) are small client islands.
 */
export async function EndpointBlock({
  endpoint,
  headingLevel = 3,
}: {
  endpoint: Endpoint;
  /** 3 → appears in the right-hand TOC; 4 → excluded (for nested endpoints). */
  headingLevel?: 3 | 4;
}) {
  const samples = await buildHighlightedSamples(endpoint);
  const responseJson = JSON.stringify(endpoint.responseExample, null, 2);
  const responseHtml = await highlight(responseJson, 'json');

  const hasParams =
    (endpoint.pathParams?.length ?? 0) > 0 ||
    (endpoint.queryParams?.length ?? 0) > 0 ||
    (endpoint.requestBody?.length ?? 0) > 0;

  const Heading = headingLevel === 4 ? 'h4' : 'h3';

  return (
    <div className="scroll-mt-24 rounded-2xl border border-border bg-card/40 p-5 sm:p-6">
      {/* Title doubles as the anchor target so cross-links land on the heading. */}
      <Heading id={endpoint.id} className="scroll-mt-24 text-base font-semibold text-foreground">
        {endpoint.title}
      </Heading>

      {/* Method + path + auth indicator */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-md px-2 py-1 font-mono text-xs font-bold',
            METHOD_STYLES[endpoint.method],
          )}
        >
          {endpoint.method}
        </span>
        <code className="break-all font-mono text-sm text-foreground">{endpoint.path}</code>
        <span
          className={cn(
            'ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
            endpoint.auth
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-muted text-muted-foreground',
          )}
          title={endpoint.auth ? 'Requires a Bearer JWT' : 'No authentication required'}
        >
          {endpoint.auth ? (
            <Lock className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Unlock className="h-3 w-3" aria-hidden="true" />
          )}
          {endpoint.auth ? 'Auth required' : 'Public'}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{endpoint.description}</p>

      {endpoint.rateLimit && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium text-foreground">Rate limit:</span> {endpoint.rateLimit}
        </p>
      )}

      {/* Request headers */}
      {endpoint.requestHeaders && endpoint.requestHeaders.length > 0 && (
        <Disclosure title="Request Headers">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="bg-muted/40">
                  <th className="py-2.5 pl-4 pr-4 text-xs font-semibold text-muted-foreground">Header</th>
                  <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Value</th>
                  <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Required</th>
                  <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                {endpoint.requestHeaders.map((header) => (
                  <tr key={header.name} className="border-t border-border align-top">
                    <td className="py-2.5 pl-4 pr-4">
                      <code className="font-mono text-xs font-medium text-foreground">{header.name}</code>
                    </td>
                    <td className="py-2.5 pr-4">
                      <code className="font-mono text-xs text-primary">{header.value}</code>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {header.required ? 'Yes' : 'No'}
                    </td>
                    <td className="py-2.5 pr-4 text-xs leading-relaxed text-muted-foreground">
                      {header.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Disclosure>
      )}

      {/* Parameters / request body */}
      {hasParams && (
        <Disclosure title="Request Parameters" defaultOpen>
          {endpoint.pathParams && endpoint.pathParams.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Path</p>
              <SchemaTable fields={endpoint.pathParams} />
            </div>
          )}
          {endpoint.queryParams && endpoint.queryParams.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Query</p>
              <SchemaTable fields={endpoint.queryParams} />
            </div>
          )}
          {endpoint.requestBody && endpoint.requestBody.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Body</p>
              <SchemaTable fields={endpoint.requestBody} />
            </div>
          )}
        </Disclosure>
      )}

      {/* Code examples */}
      <Disclosure title="Code Examples" defaultOpen>
        <RequestExample samples={samples} />
      </Disclosure>

      {/* Response */}
      <Disclosure title="Response" defaultOpen>
        {endpoint.responseSchema && endpoint.responseSchema.length > 0 && (
          <SchemaTable fields={endpoint.responseSchema} />
        )}
        <ResponseBlock status={endpoint.responseStatus} html={responseHtml} code={responseJson} />
      </Disclosure>

      {/* Errors */}
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
                    <td className="py-2.5 pl-4 pr-4">
                      <code className="font-mono text-xs font-medium text-foreground">{error.status}</code>
                    </td>
                    <td className="py-2.5 pr-4">
                      <code className="font-mono text-xs text-destructive">{error.code}</code>
                    </td>
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
    </div>
  );
}
