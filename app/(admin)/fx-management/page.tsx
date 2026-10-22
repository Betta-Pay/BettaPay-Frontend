'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminPolling } from '@/lib/hooks/useAdminPolling';
import { useNow } from '@/lib/hooks/useNow';
import { adminPost } from '@/lib/admin/client';
import { AdminAccess, AdminState, useAdminOnline } from '@/components/admin/AdminAccess';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { FxRatePoint } from '@/components/charts/FxRateChart';
const FxRateChart = dynamic(() => import('@/components/charts/FxRateChart'), { ssr: false, loading: () => <p>Loading chart…</p> });
interface Rate { from: string; to: string; rate: number; updatedAt: string; source: string; deviationPct: number | null; staleAfterMs?: number; override?: { rate: number; expiresAt: string; reason: string } | null }
interface FxHealth { circuitBreaker: { state: string; reason?: string; updatedAt: string }; fallbackEvents: { id: string; from: string; to: string; source: string; reason: string; createdAt: string }[] }
export default function FxManagementPage() {
  const [pair, setPair] = useState('USDC/NGN');
  const [rate, setRate] = useState(''); const [minutes, setMinutes] = useState('30'); const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false); const [message, setMessage] = useState('');
  const [from, to] = pair.split('/');
  const now = useNow(1000); const online = useAdminOnline(); const client = useQueryClient();
  const board = useAdminPolling<{ rates: Rate[] }>(['admin', 'fx', 'rates'], '/api/admin/fx/rates');
  const health = useAdminPolling<FxHealth>(['admin', 'fx', 'health'], '/api/admin/fx/health');
  const history = useAdminPolling<{ data: FxRatePoint[] }>(['admin', 'fx', 'history', pair], `/api/admin/fx/history?${new URLSearchParams({ from, to })}`);
  const override = useMutation({
    mutationFn: (body: { from: string; to: string; rate: number; expiresAt: string; reason: string }) => adminPost('/api/admin/fx/overrides', body),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['admin', 'fx'] }); setConfirm(false); setMessage('Override saved. The backend expires it automatically.'); },
  });
  // Refresh the board at the earliest active override expiry as well as polling.
  useEffect(() => {
    const expiries = board.data?.rates.flatMap(r => r.override ? [Date.parse(r.override.expiresAt)] : []).filter(t => t > Date.now()) || [];
    if (!expiries.length) return;
    const timer = setTimeout(() => { void client.invalidateQueries({ queryKey: ['admin', 'fx'] }); }, Math.min(...expiries) - Date.now() + 50);
    return () => clearTimeout(timer);
  }, [board.data, client]);
  const valid = Number.isFinite(Number(rate)) && Number(rate) > 0 && Number(minutes) > 0 && Number(minutes) <= 1440 && !!reason.trim();
  return <AdminAccess><main className="space-y-6"><h1 className="text-2xl font-bold">FX management</h1>
    <AdminState loading={board.isLoading} error={board.error} empty={!board.data?.rates.length} retry={() => void board.refetch()} />
    <div className="grid gap-4 md:grid-cols-3">{board.data?.rates.map(r => {
      const active = r.override && Date.parse(r.override.expiresAt) > now;
      const stale = !Number.isFinite(Date.parse(r.updatedAt)) || now - Date.parse(r.updatedAt) > (r.staleAfterMs ?? 60000);
      return <button key={`${r.from}/${r.to}`} className={`rounded border p-4 text-left ${pair === `${r.from}/${r.to}` ? 'border-primary' : ''}`} onClick={() => setPair(`${r.from}/${r.to}`)}>
        <h2 className="font-semibold">{r.from}/{r.to}</h2><p className="text-2xl">{active ? r.override!.rate : r.override ? 'Refreshing expired override…' : r.rate}</p>
        <p>Deviation: {r.deviationPct == null ? 'Unavailable' : `${r.deviationPct}%`}</p><p>Source: {r.source}</p><p>Updated: {new Date(r.updatedAt).toLocaleString()}</p>
        {stale && <p role="status" className="text-amber-600">Stale rate — review before use.</p>}
        {active && <p className="font-semibold text-amber-600">Manual override · expires in {Math.ceil((Date.parse(r.override!.expiresAt) - now) / 1000)}s<br />{r.override!.reason}</p>}
        {r.override && !active && <p>Override expired. Awaiting current backend rate.</p>}
      </button>;
    })}</div>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Circuit breaker</h2>
      <AdminState loading={health.isLoading} error={health.error} empty={false} retry={() => void health.refetch()} />
      {health.data && <><p>State: {health.data.circuitBreaker.state} · {health.data.circuitBreaker.reason}</p><p>Updated: {new Date(health.data.circuitBreaker.updatedAt).toLocaleString()}</p>
        <h3 className="font-semibold">Fallback source events</h3>{health.data.fallbackEvents.length === 0 && <p>No fallback events.</p>}{health.data.fallbackEvents.map(e => <p key={e.id}>{e.from}/{e.to} · {e.source} · {e.reason} · {new Date(e.createdAt).toLocaleString()}</p>)}</>}
    </section>
    <section><h2 className="text-lg font-semibold">{pair} history</h2><AdminState loading={history.isLoading} error={history.error} empty={!history.data?.data.length} retry={() => void history.refetch()} />
      {!!history.data?.data.length && <FxRateChart data={history.data.data} pairLabel={pair} currency={to} />}
    </section>
    <form className="space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); override.reset(); if (valid) setConfirm(true); }}><h2 className="font-semibold">Manual override for {pair}</h2>
      <label className="block">Rate<input className="ml-3 rounded border bg-background p-2" required type="number" step="any" min="0" value={rate} onChange={e => setRate(e.target.value)} /></label>
      <label className="block">Expires after (minutes, maximum 1440)<input className="ml-3 rounded border bg-background p-2" required type="number" min="1" max="1440" value={minutes} onChange={e => setMinutes(e.target.value)} /></label>
      <label className="block">Reason<textarea className="block w-full rounded border bg-background p-2" required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <Button disabled={!online || !valid || override.isPending}>Review override</Button><p role="status">{message}</p>
    </form>
    <Dialog open={confirm} onOpenChange={open => { if (!override.isPending) setConfirm(open); }}><DialogContent><DialogTitle>Confirm rate override</DialogTitle><DialogDescription>Set {pair} to {rate} for {minutes} minutes. This affects payment pricing.</DialogDescription>{override.error && <p role="alert">{override.error.message}</p>}<Button disabled={!online || override.isPending || !valid} onClick={() => override.mutate({ from, to, rate: Number(rate), expiresAt: new Date(Date.now() + Number(minutes) * 60000).toISOString(), reason })}>{override.isPending ? 'Saving…' : 'Apply override'}</Button></DialogContent></Dialog>
  </main></AdminAccess>;
}
