"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Banknote,
  ChevronRight,
  Download,
  Receipt,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

const mockSettlements = [
  { id: 'stl_01', amount: 12450.00, amountNgn: 19297500, status: 'completed', date: '2024-01-10', bank: 'GTBank', accountNo: '012****567' },
  { id: 'stl_02', amount: 8200.50, amountNgn: 12710775, status: 'pending', date: '2024-01-12', bank: 'First Bank', accountNo: '302****814' },
  { id: 'stl_03', amount: 5000.00, amountNgn: 7750000, status: 'completed', date: '2024-01-08', bank: 'GTBank', accountNo: '012****567' },
];

export default function SettlementPage() {
  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-amber-500 uppercase mb-1">Finance</p>
          <h1 className="text-3xl font-bold text-slate-900">Settlement</h1>
          <p className="text-slate-400 text-sm mt-1">
            Convert your USDC balance to Nigerian Naira and settle to your bank account.
          </p>
        </div>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl h-10 px-5 text-sm shadow-sm shadow-amber-200">
          <Banknote className="w-4 h-4 mr-2" />
          Initiate Settlement
        </Button>
      </div>

      {/* Balance summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-slate-200 bg-white shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent pointer-events-none" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available to Settle</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-2xl font-bold text-slate-900"><CurrencyDisplay amount={12450.00} /></p>
            <p className="text-xs text-slate-400 mt-1">≈ ₦19,297,500</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Settlement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900"><CurrencyDisplay amount={8200.50} /></p>
            <p className="text-xs text-amber-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Processing</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Settled (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900"><CurrencyDisplay amount={38750.00} /></p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> All completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Settlement history */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Settlement History</CardTitle>
            <CardDescription>All your past USDC → NGN conversions</CardDescription>
          </div>
          <Button variant="outline" className="border-slate-200 text-slate-600 rounded-xl text-xs h-8 px-3">
            <Download className="w-3 h-3 mr-1.5" /> Export
          </Button>
        </CardHeader>
        <CardContent>
          {mockSettlements.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No settlements yet"
              description="Your USDC → NGN conversion history will appear here once you initiate a settlement."
            />
          ) : (
            <div className="space-y-3">
              {mockSettlements.map((s) => (
                <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{s.bank} · {s.accountNo}</p>
                    <p className="text-xs text-slate-400">{s.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900"><CurrencyDisplay amount={s.amount} /></p>
                    <p className="text-xs text-slate-400">₦{s.amountNgn.toLocaleString()}</p>
                  </div>
                  <StatusBadge status={s.status as 'completed' | 'pending' | 'failed'} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank account config notice */}
      <Card className="border border-amber-200 bg-amber-50/50">
        <CardContent className="flex items-start gap-4 p-5">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Bank account not configured</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Add your Nigerian bank account in Settings to enable automatic settlements.
            </p>
          </div>
          <Button variant="ghost" className="text-amber-700 hover:bg-amber-100 rounded-xl text-xs h-8 px-3 flex-shrink-0">
            Go to Settings <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
