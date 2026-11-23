"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useWalletStore } from "@/lib/store/walletStore";
import { WalletConnectModal } from "./WalletConnectModal";
import { WalletModalErrorBoundary } from "./WalletModalErrorBoundary";
import {
  isWalletConnectConfigured,
  normalizeWalletNetwork,
  type WalletConnectSession,
} from "@/lib/stellar/walletconnect";

export interface WalletModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onConnectWallet?: () => void;
  onConnected?: (address: string) => void | Promise<void>;
}

function WalletConnectOptions() {
  const connect = useWalletStore((s) => s.connect);
  const connectError = useWalletStore((s) => s.connectError);
  const clearConnectError = useWalletStore((s) => s.clearConnectError);
  const walletConnectConfigured = isWalletConnectConfigured();

  const handleFreighterClick = async () => {
    clearConnectError();
    try {
      await connect("freighter");
    } catch (e) {
      console.error("Freighter connection failed", e);
    }
  };

  const handleWalletConnectClick = async () => {
    if (!isWalletConnectConfigured()) return;
    clearConnectError();
    try {
      await connect("walletconnect");
    } catch (e) {
      console.error("WalletConnect failed", e);
    }
  };

  const renderConnectError = () => {
    if (!connectError) return null;

    const { type, message, expectedNetwork, freighterNetwork } = connectError;

    if (type === 'not_installed') {
      return (
        <div className="p-3.5 bg-status-warn-bg border border-status-warn-border rounded-lg text-xs text-status-warn mb-3 space-y-2">
          <div className="font-semibold text-status-warn flex items-center gap-1.5">
            <span>Freighter Not Installed</span>
          </div>
          <p>
            The Freighter browser extension was not detected. Please install Freighter or ensure it is enabled in your browser extensions.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-status-warn text-status-warn-bg hover:bg-status-warn-bg hover:text-status-warn rounded text-[11px] font-medium transition-colors inline-block"
            >
              Get Freighter
            </a>
            <button
              type="button"
              onClick={handleFreighterClick}
              className="px-2.5 py-1 bg-card border border-status-warn-border hover:bg-status-warn-bg text-status-warn rounded text-[11px] font-medium transition-colors"
            >
              Freighter updated — retry
            </button>
          </div>
        </div>
      );
    }

    if (type === 'cancelled') {
      return (
        <div className="p-3.5 bg-status-down-bg border border-status-down-border rounded-lg text-xs text-status-down mb-3 space-y-2">
          <div className="font-semibold text-status-down">Freighter Access Denied or Cancelled</div>
          <p>
            The connection request was declined or permission was missing in Freighter. If you just enabled access in your extension popup, click retry to connect without reloading.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleFreighterClick}
              className="px-3 py-1.5 bg-status-down text-status-down-bg hover:bg-status-down-bg hover:text-status-down rounded text-xs font-medium transition-colors shadow-sm"
            >
              Freighter updated — retry
            </button>
          </div>
        </div>
      );
    }

    if (type === 'network_mismatch') {
      return (
        <div className="p-3.5 bg-status-warn-bg border border-status-warn-border rounded-lg text-xs text-status-warn mb-3 space-y-2">
          <div className="font-semibold text-status-warn">Network Mismatch</div>
          <p>
            App expects <strong className="font-semibold">{expectedNetwork || 'Testnet'}</strong>, but Freighter is set to <strong className="font-semibold">{freighterNetwork || 'Mainnet'}</strong>. Please switch network in your Freighter extension popup and retry.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleFreighterClick}
              className="px-3 py-1.5 bg-status-warn text-status-warn-bg hover:bg-status-warn-bg hover:text-status-warn rounded text-xs font-medium transition-colors"
            >
              Freighter updated — retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-3.5 bg-status-down-bg border border-status-down-border rounded-lg text-xs text-status-down mb-3 space-y-2">
        <div className="font-semibold text-status-down">Freighter Connection Error</div>
        <p>{message || 'An unexpected error occurred while connecting to Freighter.'}</p>
        <div className="pt-1">
          <button
            type="button"
            onClick={handleFreighterClick}
            className="px-3 py-1.5 bg-status-down text-status-down-bg hover:bg-status-down-bg hover:text-status-down rounded text-xs font-medium transition-colors"
          >
            Freighter updated — retry
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderConnectError()}
      <button
        type="button"
        onClick={handleFreighterClick}
        className="w-full flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-muted transition-colors font-medium text-sm text-card-foreground"
      >
        <span>Freighter Wallet</span>
        <span className="text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
          Stellar
        </span>
      </button>

      {!walletConnectConfigured && (
        <p
          id="walletconnect-configuration-notice"
          role="status"
          className="text-xs text-status-warn"
        >
          WalletConnect is unavailable. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to enable it.
        </p>
      )}
      <span
        className="block"
        title={
          walletConnectConfigured
            ? undefined
            : 'Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to enable WalletConnect.'
        }
      >
        <button
          type="button"
          onClick={handleWalletConnectClick}
          disabled={!walletConnectConfigured}
          aria-describedby={
            walletConnectConfigured ? undefined : 'walletconnect-configuration-notice'
          }
          className="w-full flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-muted transition-colors font-medium text-sm text-card-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>WalletConnect</span>
          <span className="text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
            Universal
          </span>
        </button>
      </span>
    </div>
  );
}

export function WalletModal({ isOpen = true, onClose, onConnected }: WalletModalProps) {
  const walletModalOpen = useWalletStore((s) => s.walletModalOpen);
  const walletConnectPending = useWalletStore((s) => s.walletConnectPending);
  const walletConnectConfigured = isWalletConnectConfigured();
  const network = useWalletStore((s) => s.network);
  const setWalletModalOpen = useWalletStore((s) => s.setWalletModalOpen);
  const cancelWalletConnect = useWalletStore((s) => s.cancelWalletConnect);
  const resolveWalletConnect = useWalletStore((s) => s.resolveWalletConnect);
  const address = useWalletStore((s) => s.address);

  useEffect(() => {
    if (isOpen !== walletModalOpen) {
      setWalletModalOpen(isOpen);
    }
  }, [isOpen, walletModalOpen, setWalletModalOpen]);

  useEffect(() => {
    if (address && isOpen && onConnected) {
      onConnected(address);
    }
  }, [address, isOpen, onConnected]);

  const handleClose = () => {
    setWalletModalOpen(false);
    onClose?.();
  };

  const handleWalletConnectSession = (session: WalletConnectSession) => {
    resolveWalletConnect(session);
  };

  const handleWalletConnectOpenChange = (open: boolean) => {
    if (!open) {
      cancelWalletConnect();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="w-full max-w-md bg-card text-card-foreground rounded-lg shadow-xl overflow-hidden border border-border">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              Connect Wallet
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 text-muted-foreground hover:text-card-foreground rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select a secure provider endpoint to synchronize your ledger state.
            </p>

            <WalletModalErrorBoundary onRetry={() => {}}>
              <WalletConnectOptions />
            </WalletModalErrorBoundary>
          </div>

          <div className="p-4 bg-muted border-t border-border flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-card-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Keep the WalletConnect chain aligned with the selected Stellar network. */}
      <WalletConnectModal
        open={walletConnectConfigured && walletModalOpen && walletConnectPending}
        onOpenChange={handleWalletConnectOpenChange}
        network={normalizeWalletNetwork(network)}
        onConnected={handleWalletConnectSession}
      />
    </>
  );
}
