"use client";

import { useEffect, useMemo } from "react";
import { useWalletStore } from "@/lib/store/walletStore";
import { WalletModalErrorBoundary } from "./WalletModalErrorBoundary";
import { X } from "lucide-react";

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

  const handleFreighterClick = async () => {
    clearConnectError();
    try {
      await connect("freighter");
    } catch (e) {
      console.error("Freighter connection failed", e);
    }
  };

  const handleWalletConnectClick = async () => {
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
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 mb-3 space-y-2">
          <div className="font-semibold text-amber-950 flex items-center gap-1.5">
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
              className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-[11px] font-medium transition-colors inline-block"
            >
              Get Freighter
            </a>
            <button
              type="button"
              onClick={handleFreighterClick}
              className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded text-[11px] font-medium transition-colors"
            >
              Freighter updated — retry
            </button>
          </div>
        </div>
      );
    }

    if (type === 'cancelled') {
      return (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 mb-3 space-y-2">
          <div className="font-semibold text-rose-950">Freighter Access Denied or Cancelled</div>
          <p>
            The connection request was declined or permission was missing in Freighter. If you just enabled access in your extension popup, click retry to connect without reloading.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleFreighterClick}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-medium transition-colors shadow-sm"
            >
              Freighter updated — retry
            </button>
          </div>
        </div>
      );
    }

    if (type === 'network_mismatch') {
      return (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 mb-3 space-y-2">
          <div className="font-semibold text-amber-950">Network Mismatch</div>
          <p>
            App expects <strong className="font-semibold">{expectedNetwork || 'Testnet'}</strong>, but Freighter is set to <strong className="font-semibold">{freighterNetwork || 'Mainnet'}</strong>. Please switch network in your Freighter extension popup and retry.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleFreighterClick}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-medium transition-colors"
            >
              Freighter updated — retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 mb-3 space-y-2">
        <div className="font-semibold text-red-950">Freighter Connection Error</div>
        <p>{message || 'An unexpected error occurred while connecting to Freighter.'}</p>
        <div className="pt-1">
          <button
            type="button"
            onClick={handleFreighterClick}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-medium transition-colors"
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
        className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700"
      >
        <span>Freighter Wallet</span>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
          Stellar
        </span>
      </button>

      <button
        type="button"
        onClick={handleWalletConnectClick}
        className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700"
      >
        <span>WalletConnect</span>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
          Universal
        </span>
      </button>
    </div>
  );
}

export function WalletModal({ isOpen = true, onClose, onConnectWallet }: WalletModalProps) {
export function WalletModal({ isOpen, onClose, onConnected }: WalletModalProps) {
  const walletModalOpen = useWalletStore((s) => s.walletModalOpen);
  const setWalletModalOpen = useWalletStore((s) => s.setWalletModalOpen);
  const address = useWalletStore((s) => s.address);

  useEffect(() => {
    if (isOpen !== undefined && isOpen !== walletModalOpen) {
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
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            Connect Wallet
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-500 mb-4">
            Select a secure provider endpoint to synchronize your ledger state.
          </p>

          <WalletModalErrorBoundary onRetry={() => {}}>
            <WalletConnectOptions />
          </WalletModalErrorBoundary>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
