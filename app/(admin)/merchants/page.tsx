'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMerchants } from '@/lib/hooks/useMerchants';
import { adminGet } from '@/lib/admin/client';
import type { AdminMerchant } from '@/lib/admin/types';
import { AdminAccess, AdminState, useAdminAccess, useAdminOnline } from '@/components/admin/AdminAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

function MerchantsConsole() {
  const params = useSearchParams();
  const [filters, setFilters] = useState({ search: '', status: '', kycStatus: '' });
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(params.get('merchantId'));
  const [reviewerId, setReviewerId] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const allowed = useAdminAccess();
  const online = useAdminOnline();
  const query = useMerchants(filters);
  const detail = useQuery({
    queryKey: ['admin', 'merchant', detailId], enabled: allowed && !!detailId,
    queryFn: ({ signal }) => adminGet<{ data: AdminMerchant }>(`/api/admin/merchants/${encodeURIComponent(detailId!)}`, signal),
  });
  function filter(key: keyof typeof filters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value })); setSelected([]);
  }
  async function act() {
    if (!confirm) return;
    try {
      const result = await query.action.mutateAsync({ merchantIds: selected, action: confirm, ...(confirm === 'assign_reviewer' ? { reviewerId } : {}) });
      const failures = result?.results?.filter(r => !r.success) || [];
      setSelected(failures.map(r => r.id));
      setConfirm(null);
      setMessage(failures.length
        ? `${failures.length} merchant action(s) failed: ${failures.map(r => `${r.id}: ${r.error || 'Unable to apply action'}`).join('; ')}`
        : 'Merchant action completed.');
    } catch { /* Mutation error remains visible with the confirmation. */ }
  }
  return <AdminAccess><main className="space-y-6">
    <h1 className="text-2xl font-bold">Merchants</h1>
    <Link className="underline" href="/merchants/kyb">Review KYB submissions</Link>
    <div className="flex flex-wrap gap-3">
      <Input aria-label="Search merchants" placeholder="Search name or email" value={filters.search} onChange={e => filter('search', e.target.value)} />
      <label>Status <select className="rounded border bg-background p-2" value={filters.status} onChange={e => filter('status', e.target.value)}><option value="">All</option>{['active', 'suspended', 'pending'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label>KYC status <select className="rounded border bg-background p-2" value={filters.kycStatus} onChange={e => filter('kycStatus', e.target.value)}><option value="">All</option>{['unverified', 'pending', 'approved', 'rejected'].map(s => <option key={s}>{s}</option>)}</select></label>
      <Button variant="outline" onClick={() => void query.refetch()} disabled={!online}>Refresh</Button>
    </div>
    <AdminState loading={query.isLoading} error={query.error} empty={!query.merchants.length} retry={() => void query.refetch()} />
    <div className="flex flex-wrap items-center gap-3">
      <span>{selected.length} selected</span>
      <Button disabled={!online || !selected.length || query.action.isPending} onClick={() => { query.action.reset(); setConfirm('suspend'); }}>Suspend</Button>
      <Button disabled={!online || !selected.length || query.action.isPending} onClick={() => { query.action.reset(); setConfirm('activate'); }}>Activate</Button>
      <Input aria-label="KYC reviewer ID" placeholder="Reviewer ID" value={reviewerId} onChange={e => setReviewerId(e.target.value)} />
      <Button disabled={!online || !selected.length || !reviewerId.trim() || query.action.isPending} onClick={() => { query.action.reset(); setConfirm('assign_reviewer'); }}>Assign reviewer</Button>
    </div>
    <p role="status">{message}</p>
    <div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Merchant management</caption><thead><tr>{['Select', 'Merchant', 'Status', 'KYC', 'Last activity'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>
      {query.merchants.map(m => <tr key={m.id} className="border-t">
        <td className="p-3"><input type="checkbox" aria-label={`Select ${m.businessName}`} disabled={query.action.isPending || (!selected.includes(m.id) && selected.length >= 100)} checked={selected.includes(m.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, m.id] : prev.filter(id => id !== m.id))} /></td>
        <td className="p-3"><button className="text-primary underline" onClick={() => setDetailId(m.id)}>{m.businessName}</button><p>{m.contactEmail}</p></td>
        <td className="p-3">{m.status}</td><td className="p-3">{m.kycStatus}</td><td className="p-3">{m.lastActivity ? new Date(m.lastActivity).toLocaleString() : 'No activity'}</td>
      </tr>)}
    </tbody></table></div>
    {query.hasNextPage && <Button disabled={!online || query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Loading…' : 'Load more'}</Button>}
    <Dialog open={!!confirm} onOpenChange={open => { if (!open && !query.action.isPending) setConfirm(null); }}><DialogContent><DialogTitle>Confirm merchant action</DialogTitle><DialogDescription>{confirm === 'suspend' ? 'Suspension prevents selected merchants from accepting new payments.' : confirm === 'activate' ? 'Activate selected merchants.' : `Assign reviewer ${reviewerId} to selected merchants.`} This affects {selected.length} merchant(s).</DialogDescription>
      {query.action.error && <p role="alert">{query.action.error.message}</p>}
      <Button disabled={!online || query.action.isPending} onClick={() => void act()}>{query.action.isPending ? 'Saving…' : 'Confirm'}</Button>
    </DialogContent></Dialog>
    <Dialog open={!!detailId} onOpenChange={open => { if (!open) setDetailId(null); }}><DialogContent className="left-auto right-0 top-0 h-dvh max-h-dvh w-full translate-x-0 translate-y-0 overflow-y-auto rounded-none sm:max-w-lg"><DialogTitle>Merchant details</DialogTitle><DialogDescription>Profile, processing totals, and audit history.</DialogDescription>
      <AdminState loading={detail.isLoading} error={detail.error} empty={!detail.data} retry={() => void detail.refetch()} />
      {detail.data && <><dl className="space-y-2">{Object.entries({ Business: detail.data.data.businessName, Email: detail.data.data.contactEmail, Country: detail.data.data.country, Status: detail.data.data.status, KYC: detail.data.data.kycStatus, Reviewer: detail.data.data.reviewerId ?? 'Unassigned', Payments: detail.data.data.paymentCount, Settlements: detail.data.data.settlementCount, 'Last activity': detail.data.data.lastActivity ?? 'None' }).map(([k, v]) => <div key={k}><dt className="font-semibold">{k}</dt><dd>{v}</dd></div>)}</dl>
        <h2 className="font-semibold">Audit trail</h2>{!detail.data.data.auditLog?.length && <p>No audit entries.</p>}{detail.data.data.auditLog?.map(a => <article className="border-t py-2" key={a.id}><p>{a.action}</p><p>{a.reviewerEmail || a.actorId} · {new Date(a.createdAt).toLocaleString()}</p>{a.note && <p>{a.note}</p>}</article>)}
      </>}
    </DialogContent></Dialog>
  </main></AdminAccess>;
}

export default function MerchantsPage() {
  return <Suspense fallback={<p>Loading merchants…</p>}><MerchantsConsole /></Suspense>;
}
