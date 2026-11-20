"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, RefreshCcw, ScrollText, Search, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button, Input, Skeleton } from "@/components/ui";
import { EmptyState } from "@/components/shared";
import { PageHeader } from "@/components/shared/PageHeader";
import { AuditRow } from "@/components/admin/audit/AuditRow";
import {
  ENTITY_TYPES,
  FILTER_KEYS,
  KNOWN_ACTIONS,
  apiQueryString,
  readFilters,
  writeFilters,
  type FilterKey,
  type UrlFilters,
} from "@/lib/audit/query";
import type { AuditPage } from "@/lib/audit/types";

const PAGE_SIZE = 25;
const DEBOUNCE_MS = 300;

async function fetchPage(filters: UrlFilters, cursor: string | null, signal?: AbortSignal): Promise<AuditPage> {
  const qs = apiQueryString(filters, { limit: PAGE_SIZE, cursor: cursor ?? undefined });
  const res = await fetch(`/api/admin/audit?${qs}`, { cache: "no-store", signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

const labelCls = "text-xs font-medium text-muted-foreground";

function AuditExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL is the source of truth for filters, so a reload, a shared link and
  // the back button all restore the same view.
  const urlFilters = useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const urlKey = writeFilters(urlFilters);

  // Text inputs keep local state so typing is not fighting the URL; they are
  // pushed to the URL after a short pause.
  const [draft, setDraft] = useState<UrlFilters>(urlFilters);
  const lastPushed = useRef(urlKey);
  useEffect(() => {
    // External navigation (back/forward, a link with filters) resets the form.
    if (urlKey !== lastPushed.current) {
      lastPushed.current = urlKey;
      setDraft(urlFilters);
    }
  }, [urlKey, urlFilters]);

  const push = useCallback(
    (next: UrlFilters) => {
      const qs = writeFilters(next);
      lastPushed.current = qs;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const setField = (key: FilterKey, value: string, immediate: boolean) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (immediate) push(next);
  };

  const draftKey = writeFilters(draft);
  useEffect(() => {
    if (draftKey === urlKey) return;
    const t = setTimeout(() => push(draft), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [draft, draftKey, urlKey, push]);

  const query = useInfiniteQuery<AuditPage, Error, { pages: AuditPage[] }, unknown[], string | null>({
    queryKey: ["admin", "audit", urlKey],
    queryFn: ({ pageParam, signal }) => fetchPage(urlFilters, pageParam, signal),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });

  // Rows are keyed by id, so a row that shifts between pages after a refetch is
  // shown once rather than twice.
  const rows = useMemo(() => {
    const seen = new Set<string>();
    return (query.data?.pages ?? []).flatMap((p) => p.data).filter((e) => (seen.has(e.id) ? false : seen.add(e.id)));
  }, [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;
  const activeCount = FILTER_KEYS.filter((k) => urlFilters[k]).length;

  const csvHref = `/api/admin/audit?${apiQueryString(urlFilters, { format: "csv" })}`;
  const reset = () => {
    setDraft({});
    push({});
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        preTitle="Platform"
        title="Audit log"
        description="Every privileged change, with who made it, from where, and exactly what changed."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}>
              <RefreshCcw className={`mr-1.5 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </Button>
            <a
              href={csvHref}
              download
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </a>
          </div>
        }
      />

      <form
        role="search"
        aria-label="Filter audit log"
        className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          push(draft);
        }}
      >
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="audit-q" className={labelCls}>Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="audit-q" className="pl-9" placeholder="Action, entity, actor, IP, or anything in the changes" value={draft.q ?? ""} onChange={(e) => setField("q", e.target.value, false)} />
          </div>
        </div>
        <div>
          <label htmlFor="audit-entity" className={labelCls}>Entity type</label>
          <select id="audit-entity" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" value={draft.entityType ?? ""} onChange={(e) => setField("entityType", e.target.value, true)}>
            <option value="">All types</option>
            {ENTITY_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        <div>
          <label htmlFor="audit-action" className={labelCls}>Action</label>
          <Input id="audit-action" list="audit-actions" placeholder="SETTINGS_UPDATE or KYB_*" value={draft.action ?? ""} onChange={(e) => setField("action", e.target.value, false)} />
          <datalist id="audit-actions">{KNOWN_ACTIONS.map((a) => (<option key={a} value={a} />))}</datalist>
        </div>
        <div>
          <label htmlFor="audit-actor" className={labelCls}>Actor</label>
          <Input id="audit-actor" placeholder="admin" value={draft.actor ?? ""} onChange={(e) => setField("actor", e.target.value, false)} />
        </div>
        <div>
          <label htmlFor="audit-ip" className={labelCls}>IP address</label>
          <Input id="audit-ip" className="font-mono" placeholder="102.89." value={draft.ip ?? ""} onChange={(e) => setField("ip", e.target.value, false)} />
        </div>
        <div>
          <label htmlFor="audit-from" className={labelCls}>From</label>
          <Input id="audit-from" type="date" value={draft.from ?? ""} max={draft.to || undefined} onChange={(e) => setField("from", e.target.value, true)} />
        </div>
        <div>
          <label htmlFor="audit-to" className={labelCls}>To</label>
          <Input id="audit-to" type="date" value={draft.to ?? ""} min={draft.from || undefined} onChange={(e) => setField("to", e.target.value, true)} />
        </div>
        <div className="flex items-end">
          {activeCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              <X className="mr-1 h-4 w-4" aria-hidden="true" />
              Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
            </Button>
          )}
        </div>
      </form>

      {query.isError && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Couldn&apos;t load the audit log</AlertTitle>
          <AlertDescription>
            <p>{query.error.message}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void query.refetch()}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      {query.isLoading ? (
        <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading audit log">
          {[0, 1, 2, 3].map((i) => (<Skeleton key={i} className="h-16 w-full rounded-xl" />))}
        </div>
      ) : !query.isError && rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={activeCount ? "No events match these filters" : "No audit events yet"}
          description={activeCount ? "Widen the date range or clear a filter." : "Privileged changes will appear here."}
          action={activeCount ? { label: "Clear filters", onClick: reset } : undefined}
        />
      ) : (
        !query.isError && (
          <section aria-label="Audit events" aria-busy={query.isFetching && query.isPlaceholderData}>
            <p role="status" className="mb-2 text-sm text-muted-foreground">
              Showing {rows.length} of {total} event{total === 1 ? "" : "s"}
            </p>
            <ol className="space-y-2">
              {rows.map((entry) => (<AuditRow key={entry.id} entry={entry} />))}
            </ol>
            {query.hasNextPage && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                  {query.isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </section>
        )
      )}
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <AuditExplorer />
    </Suspense>
  );
}
