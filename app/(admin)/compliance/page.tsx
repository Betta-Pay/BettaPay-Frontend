'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAdminPolling } from '@/lib/hooks/useAdminPolling';
import { useRateLimitStore } from '@/lib/store/rateLimitStore';
import { useRateLimitCountdown } from '@/lib/hooks/useRateLimitCountdown';
import { useNow } from '@/lib/hooks/useNow';
import { AdminAccess, AdminState } from '@/components/admin/AdminAccess';
import { Button } from '@/components/ui/button';
import { buildCsv, escapeCsvField } from '@/lib/utils/csv';
import type { FailedLogin } from '@/components/admin/ComplianceCharts';
const ComplianceCharts = dynamic(() => import('@/components/admin/ComplianceCharts'), { ssr: false, loading: () => <p>Loading charts…</p> });
interface IpScore { ip: string; score: number; failedAttempts: number; retryAfterUntil: string | null }
interface Risk { merchantId: string; businessName: string; failedAuthCount: number; chargebackRate: number | null; failureRate: number; flags: string[] }
interface Suspension { id: string; merchantId: string; action: string; createdAt: string; note: string | null }
interface WebhookFailure { merchantId: string; failed: number; total: number; failureRate: number }
interface Incident { id: string; merchantId: string | null; type: string; severity: string; status: string; createdAt: string; summary: string }
interface Rows<T> { data: T[]; windowStart?: string; windowEnd?: string; truncated?: boolean }
const merchantHref = (id: string) => `/merchants?merchantId=${encodeURIComponent(id)}`;
// Prevent spreadsheet formulas while preserving ordinary exported text.
function csvCell(value: unknown) { const text = value == null ? '' : String(value); return escapeCsvField(/^[\s]*[=+\-@]/.test(text) ? `'${text}` : text); }
export default function CompliancePage() {
  const now = useNow(1000);
  useRateLimitCountdown();
  const limitedUntil = useRateLimitStore(s => s.rateLimitedUntil);
  const limitedEndpoint = useRateLimitStore(s => s.endpoint);
  const [search, setSearch] = useState(''); const [severity, setSeverity] = useState(''); const [status, setStatus] = useState('');
  const scores = useAdminPolling<Rows<IpScore>>(['admin', 'compliance', 'ip-score'], '/api/admin/auth/ip-score');
  const failed = useAdminPolling<Rows<FailedLogin>>(['admin', 'compliance', 'failed-logins'], '/api/admin/compliance/failed-logins');
  const suspensions = useAdminPolling<Rows<Suspension>>(['admin', 'compliance', 'suspensions'], '/api/admin/compliance/suspensions');
  const webhooks = useAdminPolling<Rows<WebhookFailure>>(['admin', 'compliance', 'webhook-failures'], '/api/admin/compliance/webhook-failures');
  const risks = useAdminPolling<Rows<Risk>>(['admin', 'compliance', 'risk-queue'], '/api/admin/compliance/risk-queue');
  const incidents = useAdminPolling<Rows<Incident>>(['admin', 'compliance', 'incidents'], '/api/admin/compliance/incidents');
  const visible = useMemo(() => (incidents.data?.data || []).filter(i => (!severity || i.severity === severity) && (!status || i.status === status) && `${i.id} ${i.merchantId || ''} ${i.type} ${i.summary}`.toLowerCase().includes(search.toLowerCase())), [incidents.data, severity, status, search]);
  function download() {
    const columns: (keyof Incident)[] = ['id', 'merchantId', 'type', 'severity', 'status', 'createdAt', 'summary'];
    const csv = buildCsv(columns.map(csvCell).join(',') + '\r\n', visible.map(i => columns.map(k => csvCell(i[k])).join(',')));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'compliance-incidents.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <AdminAccess><main className="space-y-8"><h1 className="text-2xl font-bold">Compliance</h1>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Merchant risk queue</h2><AdminState loading={risks.isLoading} error={risks.error} empty={!risks.data?.data.length} retry={() => void risks.refetch()} />
      <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Merchant', 'Failed auths', 'Chargebacks', 'Failure rate', 'Flags'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{risks.data?.data.map(r => <tr key={r.merchantId} className="border-t"><td className="p-2"><Link className="underline" href={merchantHref(r.merchantId)}>{r.businessName}</Link></td><td className="p-2">{r.failedAuthCount}</td><td className="p-2">{r.chargebackRate == null ? 'Unavailable' : `${r.chargebackRate}%`}</td><td className="p-2">{r.failureRate}%</td><td className="p-2">{r.flags.join(', ')}</td></tr>)}</tbody></table></div>
    </section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">IP reputation</h2>{limitedUntil > now && (!limitedEndpoint || limitedEndpoint.includes('ip-score')) && <p role="status">IP-score service Retry-After: {Math.ceil((limitedUntil - now) / 1000)}s remaining.</p>}<AdminState loading={scores.isLoading} error={scores.error} empty={!scores.data?.data.length} retry={() => void scores.refetch()} />
      <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{['IP', 'Score', 'Failed attempts', 'Retry-After window'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{scores.data?.data.map(r => <tr key={r.ip} className="border-t"><td className="p-2">{r.ip}</td><td className="p-2">{r.score}</td><td className="p-2">{r.failedAttempts}</td><td className="p-2">{r.retryAfterUntil && Date.parse(r.retryAfterUntil) > now ? `${Math.ceil((Date.parse(r.retryAfterUntil) - now) / 1000)}s · until ${new Date(r.retryAfterUntil).toLocaleString()}` : 'No active window'}</td></tr>)}</tbody></table></div>
    </section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Authentication failures</h2><AdminState loading={failed.isLoading} error={failed.error} empty={!failed.data?.data.length} retry={() => void failed.refetch()} />
      {failed.data && <><p className="text-sm">Reporting window: {failed.data.windowStart || 'Start not supplied'} – {failed.data.windowEnd || 'End not supplied'}{failed.data.truncated ? ' · Partial event window' : ''}</p><ComplianceCharts events={failed.data.data} /></>}
    </section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Suspension history</h2><AdminState loading={suspensions.isLoading} error={suspensions.error} empty={!suspensions.data?.data.length} retry={() => void suspensions.refetch()} />
      {suspensions.data?.data.map(s => <article className="rounded border p-3" key={s.id}><Link className="underline" href={merchantHref(s.merchantId)}>Merchant {s.merchantId} and audit log</Link><p>{s.action} · {new Date(s.createdAt).toLocaleString()}</p><p>{s.note}</p></article>)}
    </section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Webhook failure rates</h2><AdminState loading={webhooks.isLoading} error={webhooks.error} empty={!webhooks.data?.data.length} retry={() => void webhooks.refetch()} />
      {webhooks.data?.data.map(w => <p key={w.merchantId}><Link className="underline" href={merchantHref(w.merchantId)}>{w.merchantId}</Link>: {w.failed}/{w.total} failed ({w.failureRate}%)</p>)}
    </section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Incidents</h2><div className="flex flex-wrap gap-3"><label>Search<input className="block rounded border bg-background p-2" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Severity<select className="block rounded border bg-background p-2" value={severity} onChange={e => setSeverity(e.target.value)}><option value="">All</option>{[...new Set(incidents.data?.data.map(i => i.severity))].map(s => <option key={s}>{s}</option>)}</select></label><label>Status<select className="block rounded border bg-background p-2" value={status} onChange={e => setStatus(e.target.value)}><option value="">All</option>{[...new Set(incidents.data?.data.map(i => i.status))].map(s => <option key={s}>{s}</option>)}</select></label><Button onClick={download} disabled={!visible.length || incidents.isLoading || !!incidents.error}>Export {visible.length} visible incidents</Button></div>
      <AdminState loading={incidents.isLoading} error={incidents.error} empty={!visible.length} retry={() => void incidents.refetch()} />
      {incidents.data?.truncated && <p role="status">The backend returned a partial reporting window. Export includes only the rows shown below.</p>}
      <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Incident', 'Merchant', 'Type', 'Severity', 'Status', 'Date', 'Summary'].map(h => <th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(i => <tr key={i.id} className="border-t"><td className="p-2">{i.id}</td><td className="p-2">{i.merchantId ? <Link className="underline" href={merchantHref(i.merchantId)}>{i.merchantId}</Link> : '—'}</td><td className="p-2">{i.type}</td><td className="p-2">{i.severity}</td><td className="p-2">{i.status}</td><td className="p-2">{new Date(i.createdAt).toLocaleString()}</td><td className="p-2">{i.summary}</td></tr>)}</tbody></table></div>
    </section>
  </main></AdminAccess>;
}
