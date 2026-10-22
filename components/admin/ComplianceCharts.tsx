'use client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
export interface FailedLogin { id: string; ip: string; merchantId?: string | null; createdAt: string }
export default function ComplianceCharts({ events }: { events: FailedLogin[] }) {
  const days = new Map<string, number>(); const ips = new Map<string, number>();
  for (const event of events) {
    const date = event.createdAt.slice(0, 10);
    days.set(date, (days.get(date) || 0) + 1); ips.set(event.ip, (ips.get(event.ip) || 0) + 1);
  }
  const trend = [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
  const perIp = [...ips].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([ip, count]) => ({ ip, count }));
  if (!events.length) return <p>No failed login events in this window.</p>;
  return <div className="grid gap-6 lg:grid-cols-2"><section aria-label="Failed logins over time"><h3>Failed logins by day (UTC)</h3><ResponsiveContainer width="100%" height={240}><LineChart data={trend} accessibilityLayer><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="count" stroke="var(--primary)" /></LineChart></ResponsiveContainer></section>
    <section aria-label="Failed logins per IP"><h3>Failed logins by IP (top 20)</h3><ResponsiveContainer width="100%" height={240}><BarChart data={perIp} accessibilityLayer><XAxis dataKey="ip" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="var(--primary)" /></BarChart></ResponsiveContainer></section></div>;
}
