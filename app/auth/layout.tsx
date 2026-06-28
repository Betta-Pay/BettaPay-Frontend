import { CheckCircle2 } from 'lucide-react';

const highlights = [
  'Non-custodial — you always control your funds',
  'Settle in seconds via Stellar Soroban',
  'Auto fiat off-ramp to local bank accounts',
  'Transparent on-chain fee splits',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left Pane — Form */}
      <div className="w-full lg:w-[52%] flex flex-col bg-white">
        {/* Top bar */}
        <div className="flex items-center gap-2.5 px-4 sm:px-8 py-6 border-b border-slate-100">
          <img src="/logo.png" alt="BettaPay Logo" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-bold text-slate-900 text-lg tracking-tight">BettaPay</span>
        </div>

        {/* Form content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
          <div className="w-full max-w-[420px]">
            {children}
          </div>
        </div>

        {/* Bottom note */}
        <div className="px-4 sm:px-8 py-5 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            By signing in, you agree to our{' '}
            <a href="#" className="underline hover:text-slate-600">Terms of Service</a>{' '}
            and{' '}
            <a href="#" className="underline hover:text-slate-600">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Right Pane — Flat dark, no gradients */}
      <div className="hidden lg:flex w-[48%] bg-slate-900 items-center justify-center">
        <div className="p-16 max-w-lg w-full">
          {/* Icon + brand */}
          <div className="flex items-center gap-3 mb-14">
            <img src="/logo.png" alt="BettaPay Logo" className="w-11 h-11 rounded-xl object-contain bg-slate-800" />
            <span className="text-xl font-bold text-white tracking-tight">BettaPay</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl font-bold text-white leading-snug mb-4">
            Global settlement,<br />
            <span className="text-amber-400">zero friction.</span>
          </h2>

          <p className="text-slate-400 text-base leading-relaxed mb-12">
            The next-generation payment platform for African businesses. Accept USDC, convert via SEP-24 anchors, and settle directly to your bank.
          </p>

          {/* Feature list */}
          <ul className="space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          {/* Status bar */}
          <div className="mt-14 pt-8 border-t border-slate-800 flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              System Operational
            </span>
            <span>Soroban Testnet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
