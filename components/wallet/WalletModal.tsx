"use client";

import React, { useCallback } from 'react';
import { ExternalLink, AlertTriangle, Info, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { Button } from '@/components/ui';
import { useWalletStore } from '@/lib/store/walletStore';
import { useNotify } from '@/lib/hooks/useNotify';

const FREIGHTER_URL = 'https://freighter.app';

function ConnectErrorAlert({ connectError, onRetry }: { connectError: NonNullable<ReturnType<typeof useWalletStore.getState>['connectError']>; onRetry: () => void }) {
  switch (connectError.type) {
    case 'not_installed':
      return (
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-300">Please install Freighter browser extension</p>
              <p className="text-orange-700 dark:text-orange-400 mt-1">
                <a
                  href={FREIGHTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-orange-900 inline-flex items-center gap-1"
                >
                  Download Freighter <ExternalLink className="w-3 h-3" />
                </a>
                {' '} to connect your Stellar wallet.
              </p>
            </div>
          </div>
        </div>
      );
    case 'cancelled':
      return (
        <div className="rounded-lg border border-muted bg-muted/50 p-3 text-sm">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">Connection cancelled. Click <strong>Connect with Freighter</strong> to try again.</p>
          </div>
        </div>
      );
    case 'network_mismatch':
      return (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-300">Network mismatch</p>
              <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                Please switch Freighter to <strong>{connectError.expectedNetwork}</strong> (currently set to <strong>{connectError.freighterNetwork}</strong>).
              </p>
            </div>
          </div>
        </div>
      );
    case 'generic':
    default:
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-destructive">Connection failed</p>
              <p className="text-destructive/80 mt-1 break-words">{connectError.message}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 min-h-[44px] px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={onRetry}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
  }
}

export function WalletModal({ open, onOpenChange, onConnected }: { open: boolean; onOpenChange: (v: boolean) => void; onConnected?: (address: string) => void }) {
  const { success } = useNotify();
  const connect = useWalletStore((s) => s.connect);
  const connectError = useWalletStore((s) => s.connectError);
  const clearConnectError = useWalletStore((s) => s.clearConnectError);

  const handleFreighter = useCallback(async () => {
    try {
      await connect('freighter');
      const address = useWalletStore.getState().address;
      if (address) {
        success('Connected with Freighter');
        onOpenChange(false);
        onConnected?.(address);
      }
    } catch {
      // Error state is captured in the store
    }
  }, [connect, onOpenChange, onConnected, success]);

  const handleWalletConnect = useCallback(async () => {
    try {
      await connect('walletconnect');
      const address = useWalletStore.getState().address;
      if (address) {
        success('Connected (WalletConnect placeholder)');
        onOpenChange(false);
        onConnected?.(address);
      }
    } catch {
      // Error state is captured in the store
    }
  }, [connect, onOpenChange, onConnected, success]);

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) clearConnectError();
    onOpenChange(v);
  }, [clearConnectError, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a Wallet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {connectError && (
            <ConnectErrorAlert
              connectError={connectError}
              onRetry={handleFreighter}
            />
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={handleFreighter} className="w-full">
              Connect with Freighter
            </Button>
            <Button variant="outline" onClick={handleWalletConnect} className="w-full">
              WalletConnect (experimental)
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Freighter is the recommended browser extension for Stellar. WalletConnect support is experimental and requires a compatible wallet — currently this is a lightweight placeholder for manual key entry.
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
