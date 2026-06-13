"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  RefreshCcw,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/authStore';

const mockTxHistory = [
  { id: 'w1', type: 'receive', label: 'Payment from link_02', amount: 45.5, time: '2h ago' },
  { id: 'w2', type: 'receive', label: 'Payment from link_01', amount: 750, time: '5h ago' },
  { id: 'w3', type: 'send', label: 'Settlement to GTBank', amount: 1200, time: 'Yesterday' },
  { id: 'w4', type: 'receive', label: 'Payment from link_03', amount: 29, time: 'Yesterday' },
];

export default function WalletPage() {
  const { user } = useAuthStore();
  const address = user?.id ?? 'GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD';
  const shortAddress = `${address.substring(0, 8)}...${address.slice(-6)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied');
  };

  return (
    <div className="space-y-8 pb-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-amber-500 uppercase mb-1">Stellar Wallet</p>
        <h1 className="text-3xl font-bold text-slate-900">My Wallet</h1>
        <p className="text-slate-400 text-sm mt-1">
          Your non-custodial Stellar wallet for receiving crypto payments.
        </p>
      </div>

      {/* Wallet Card */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full -ml-16 -mb-16 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="BettaPay Logo" className="w-8 h-8 rounded-lg object-contain bg-slate-800" />
              <span className="font-bold text-lg">BettaPay</span>
            </div>
            <span className="text-xs bg-white/10 px-3 py-1 rounded-full font-medium">Stellar Network</span>
          </div>

          <div className="mb-6">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Total Balance</p>
            <p className="text-4xl font-bold"><CurrencyDisplay amount={12450.00} /> <span className="text-lg font-normal text-white/60">USDC</span></p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/50 mb-1">Wallet Address</p>
              <p className="font-mono text-sm text-white/80">{shortAddress}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCopy} variant="ghost" className="h-8 w-8 p-0 rounded-lg bg-white/10 hover:bg-white/20 text-white">
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <a
                href={`https://stellar.expert/explorer/testnet/account/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 p-0 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Balances */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'USDC', amount: 12450.00, icon: '💵', change: '+12.4%' },
          { label: 'XLM', amount: 245.89, icon: '⭐', change: '-2.1%' },
          { label: 'NGN (Pending)', amount: 19297500, icon: '🇳🇬', change: null },
        ].map(({ label, amount, icon, change }) => (
          <Card key={label} className="border border-slate-200 bg-white shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="text-2xl">{icon}</div>
              <div className="flex-1">
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className="text-lg font-bold text-slate-900">
                  {label === 'NGN (Pending)' ? `₦${amount.toLocaleString()}` : amount.toFixed(2)}
                </p>
              </div>
              {change && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${change.startsWith('+') ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
                  {change}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction history */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Wallet Activity</CardTitle>
            <CardDescription>Recent on-chain transactions</CardDescription>
          </div>
          <Button variant="ghost" className="text-xs text-slate-500 h-7 px-2 rounded-lg">
            <RefreshCcw className="w-3 h-3 mr-1.5" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockTxHistory.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'receive' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  {tx.type === 'receive'
                    ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    : <ArrowUpRight className="w-4 h-4 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{tx.label}</p>
                  <p className="text-xs text-slate-400">{tx.time}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'receive' ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(2)} USDC
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
