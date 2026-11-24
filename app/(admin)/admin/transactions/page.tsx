'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAdminTransactions, type AdminTransaction } from '@/lib/hooks/useAdminTransactions';
import { TransactionDrawer } from '@/components/transactions/TransactionDrawer';
import { AdminAccess, AdminState, useAdminOnline } from '@/components/admin/AdminAccess';
import { Button } from '@/components/ui/button';
import { useDebounceValue } from 'usehooks-ts';

const TEXT_FILTERS = ['merchantId', 'status', 'asset', 'batchId'] as const;
type TextFilter = (typeof TEXT_FILTERS)[number];
type TextDrafts = Record<TextFilter, string>;
const EMPTY_DRAFTS: TextDrafts = { merchantId: '', status: '', asset: '', batchId: '' };
const FILTER_DEBOUNCE_MS = 300;
function draftsFromParams(params: { get(key: string): string | null }): TextDrafts {
  return {
    merchantId: params.get('merchantId') || '', status: params.get('status') || '',
    asset: params.get('asset') || '', batchId: params.get('batchId') || '',
  };
}

const columns: ColumnDef<AdminTransaction>[] = [
  { accessorKey: 'id', header: 'Transaction', enableSorting: false },
  { accessorKey: 'kind', header: 'Kind', enableSorting: false },
  { accessorKey: 'merchantId', header: 'Merchant' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'asset', header: 'Asset' },
  { accessorKey: 'amountUsdc', header: 'Amount (USDC)' },
  { accessorKey: 'createdAt', header: 'Date', cell: c => new Date(c.getValue<string>()).toLocaleString() },
];
function Ledger() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const online = useAdminOnline();
  const [selected, setSelected] = useState<AdminTransaction | null>(null);
  const [pollMs, setPollMs] = useState(15000);
  const [drafts, setDrafts] = useState<TextDrafts>(() => draftsFromParams(params));
  const [debouncedMerchantId] = useDebounceValue(drafts.merchantId, FILTER_DEBOUNCE_MS);
  const [debouncedStatus] = useDebounceValue(drafts.status, FILTER_DEBOUNCE_MS);
  const [debouncedAsset] = useDebounceValue(drafts.asset, FILTER_DEBOUNCE_MS);
  const [debouncedBatchId] = useDebounceValue(drafts.batchId, FILTER_DEBOUNCE_MS);
  // Latest query string the URL should hold. Mutations compose on this rather than on `params`,
  // which can still describe a router.replace that has not committed yet.
  const intendedUrl = useRef(params.toString());
  // Query strings we asked the router to apply that have not echoed back via useSearchParams.
  const pendingWrites = useRef<string[]>([]);
  // Last settled debounced values, so one field's commit never rewrites a sibling's older value.
  const settledDrafts = useRef<TextDrafts | null>(null);
  const filters = useMemo(() => {
    const values: Record<string, string> = {};
    for (const key of ['status', 'asset', 'merchantId', 'from', 'to', 'batchId', 'sort', 'order']) {
      const value = params.get(key); if (value) values[key] = value;
    }
    return values;
  }, [params]);
  const query = useAdminTransactions(filters, pollMs);
  function replaceParams(next: URLSearchParams) {
    const search = next.toString();
    if (search === intendedUrl.current) return;
    intendedUrl.current = search;
    if (search !== params.toString() && pendingWrites.current[pendingWrites.current.length - 1] !== search) pendingWrites.current.push(search);
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(intendedUrl.current);
    Object.entries(values).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
    replaceParams(next);
  }
  function clearFilters() {
    setDrafts({ ...EMPTY_DRAFTS });
    replaceParams(new URLSearchParams());
  }
  const paramsString = params.toString();
  useEffect(() => {
    // External navigation (back/forward, shared links) is authoritative. Writes we made that have
    // not echoed back yet are our own; ignore them so drafts keep newer keystrokes.
    const echo = pendingWrites.current.indexOf(paramsString);
    if (echo !== -1) { pendingWrites.current.splice(0, echo + 1); return; }
    pendingWrites.current = [];
    intendedUrl.current = paramsString;
    setDrafts(draftsFromParams(new URLSearchParams(paramsString)));
  }, [paramsString]);
  useEffect(() => {
    // Commit only the text filters that just settled; sort, dates and every other param are kept.
    const next = new URLSearchParams(intendedUrl.current);
    const debounced: TextDrafts = { merchantId: debouncedMerchantId, status: debouncedStatus, asset: debouncedAsset, batchId: debouncedBatchId };
    const settled = settledDrafts.current;
    settledDrafts.current = debounced;
    if (!settled) return;
    let changed = false;
    for (const key of TEXT_FILTERS) {
      if (settled[key] === debounced[key]) continue;
      const value = debounced[key];
      if (value) { if (next.get(key) !== value) { next.set(key, value); changed = true; } }
      else if (next.has(key)) { next.delete(key); changed = true; }
    }
    if (changed) replaceParams(next);
    // Only settled debounced values trigger this write; the URL is read from `intendedUrl`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMerchantId, debouncedStatus, debouncedAsset, debouncedBatchId]);
  const sorting: SortingState = [{ id: filters.sort || 'createdAt', desc: filters.order !== 'asc' }];
  const table = useReactTable({ data: query.transactions, columns, getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(), manualSorting: true, state: { sorting },
    onSortingChange: updater => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      update({ sort: next[0]?.id || 'createdAt', order: next[0]?.desc === false ? 'asc' : 'desc' });
    },
  });
  const parent = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const virtual = useVirtualizer({ count: rows.length, getScrollElement: () => parent.current, estimateSize: () => 64, overscan: 10, getItemKey: i => rows[i].id });
  return <AdminAccess><main className="space-y-5"><h1 className="text-2xl font-bold">Platform transactions</h1>
    <div className="flex flex-wrap gap-3">{['merchantId', 'status', 'asset', 'batchId'].map(k => <label key={k}>{({ merchantId: 'Merchant ID', status: 'Status', asset: 'Asset', batchId: 'Settlement batch' } as Record<string, string>)[k]}<input className="block rounded border bg-background p-2" value={drafts[k as TextFilter]} onChange={e => setDrafts(d => ({ ...d, [k as TextFilter]: e.target.value }))} /></label>)}
      {['from', 'to'].map(k => <label key={k}>{k === 'from' ? 'From (UTC)' : 'Through (UTC)'}<input className="block rounded border bg-background p-2" type="date" value={filters[k]?.slice(0, 10) || ''} onChange={e => update({ [k]: e.target.value ? `${e.target.value}T${k === 'from' ? '00:00:00.000' : '23:59:59.999'}Z` : '' })} /></label>)}
      <label>Refresh interval<select className="block rounded border bg-background p-2" value={pollMs} onChange={e => setPollMs(Number(e.target.value))}><option value={0}>Paused</option><option value={15000}>15 seconds</option><option value={30000}>30 seconds</option><option value={60000}>1 minute</option></select></label>
      <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
    </div>
    <AdminState loading={query.isLoading} error={query.error} empty={!rows.length} retry={() => void query.refetch()} />
    <div className="overflow-x-auto"><div role="table" aria-label="Platform ledger" aria-rowcount={rows.length + 1} className="min-w-[800px]">
      <div role="rowgroup">{table.getHeaderGroups().map(group => <div role="row" className="grid grid-cols-7 border-b" key={group.id}>{group.headers.map(h => <div role="columnheader" aria-sort={h.column.getIsSorted() === 'asc' ? 'ascending' : h.column.getIsSorted() === 'desc' ? 'descending' : 'none'} className="p-2" key={h.id}><button disabled={!h.column.getCanSort()} onClick={h.column.getToggleSortingHandler()}>{flexRender(h.column.columnDef.header, h.getContext())}{h.column.getIsSorted() === 'asc' ? ' ↑' : h.column.getIsSorted() === 'desc' ? ' ↓' : ''}</button></div>)}</div>)}</div>
      <div ref={parent} className="h-[600px] overflow-auto" role="rowgroup"><div style={{ height: virtual.getTotalSize(), position: 'relative' }}>{virtual.getVirtualItems().map(item => {
        const row = rows[item.index];
        return <div role="row" aria-rowindex={item.index + 2} key={row.id} className="absolute left-0 top-0 grid w-full grid-cols-7 border-b" style={{ height: item.size, transform: `translateY(${item.start}px)` }}>{row.getVisibleCells().map((cell, i) => <div role="cell" className="overflow-hidden break-all p-2 text-sm" key={cell.id}>{i === 0 ? <button className="text-primary underline" onClick={() => setSelected(row.original)}>{row.original.id}</button> : flexRender(cell.column.columnDef.cell, cell.getContext())}</div>)}</div>;
      })}</div></div>
    </div>
    </div>
    {query.hasNextPage && <Button disabled={!online || query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Loading…' : 'Load more transactions'}</Button>}
    <p className="text-sm text-muted-foreground">{rows.length} loaded. Automatic refresh pauses while this tab is hidden.</p>
    <TransactionDrawer settlementBatchHref={selected?.settlementBatch ? `/admin/transactions?batchId=${encodeURIComponent(selected.settlementBatch.id)}` : undefined} transaction={selected} isOpen={!!selected} onClose={() => setSelected(null)} />
  </main></AdminAccess>;
}
export default function AdminTransactionsPage() { return <Suspense fallback={<p>Loading ledger…</p>}><Ledger /></Suspense>; }
