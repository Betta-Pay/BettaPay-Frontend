"use client";

import { useWalletStore } from '@/lib/store/walletStore';
import { Check, Wallet } from 'lucide-react';

interface AccountPickerProps {
  onAccountSelected?: (address: string) => void;
  className?: string;
}

export function AccountPicker({ onAccountSelected, className = '' }: AccountPickerProps) {
  const address = useWalletStore((s) => s.address);
  const stellarAccounts = useWalletStore((s) => s.stellarAccounts);
  const selectAccount = useWalletStore((s) => s.selectAccount);

  if (!stellarAccounts || stellarAccounts.length <= 1) {
    return null;
  }

  const handleSelect = (account: string) => {
    selectAccount(account);
    if (onAccountSelected) {
      onAccountSelected(account);
    }
  };

  return (
    <div className={`p-4 bg-muted/40 border border-border rounded-xl space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Select Active Account</h3>
        </div>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
          {stellarAccounts.length} Accounts Presented
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        This session presented multiple Stellar accounts. Choose which account to inspect and transact with.
      </p>

      <div className="space-y-2">
        {stellarAccounts.map((acc, index) => {
          const isSelected = acc === address;
          const shortAcc = `${acc.substring(0, 8)}...${acc.slice(-6)}`;

          return (
            <button
              key={acc}
              type="button"
              onClick={() => handleSelect(acc)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border text-left text-xs font-mono transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/10 text-foreground font-semibold shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-label={`Select account ${acc}`}
              aria-pressed={isSelected}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[10px] text-muted-foreground font-sans px-1.5 py-0.5 rounded bg-muted">
                  #{index + 1}
                </span>
                <span className="truncate">{shortAcc}</span>
              </div>
              {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
