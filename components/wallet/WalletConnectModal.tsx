"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, CheckCircle2, AlertTriangle, Copy, RefreshCw, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import {
  getWalletConnectClient,
  resetWalletConnectClient,
  WalletConnectStatus,
  WalletConnectSession,
} from '@/lib/stellar/walletconnect';

// ─── Copy-to-clipboard helper ─────────────────────────────────────────────────

function useCopyUri(uri: string) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }, [uri]);
  return { copied, copy };
}

// ─── Status copy map ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<WalletConnectStatus, string> = {
  idle: '',
  connecting: 'Waiting for wallet to scan…',
  reconnecting: 'Reconnecting to the relay…',
  approving: 'Approving session…',
  connected: 'Wallet connected',
  signing: 'Waiting for signature in wallet…',
  disconnected: 'Disconnected',
  error: 'Connection failed',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface WalletConnectModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called with the Stellar G-address once the session is established */
  onConnected: (session: WalletConnectSession) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WalletConnectModal({
  open,
  onOpenChange,
  onConnected,
}: WalletConnectModalProps) {
  const [uri, setUri] = useState<string>('');
  const [status, setStatus] = useState<WalletConnectStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusDetail, setStatusDetail] = useState<string>('');
  const { copied, copy } = useCopyUri(uri);

  // Track whether this modal instance started the connection so we don't
  // attempt to start it twice on Strict Mode double-mount.
  const startedRef = useRef(false);
  // Guard against stale session callbacks after the modal is closed.
  const closedRef = useRef(false);

  const startConnection = useCallback(async () => {
    startedRef.current = true;
    closedRef.current = false;
    setUri('');
    setErrorMsg('');
    setStatusDetail('');
    setStatus('idle');

    // Always get a fresh client so keys/topics are rotated
    resetWalletConnectClient();
    const client = getWalletConnectClient();

    client.onStatus((s, detail) => {
      if (closedRef.current) return;
      setStatus(s);
      setStatusDetail(detail ?? '');
      if (s === 'error') setErrorMsg(detail ?? 'Unknown error');
    });

    client.onSession((session) => {
      if (closedRef.current) return;
      // Brief pause so the user sees the "connected" tick before the modal closes
      setTimeout(() => {
        if (closedRef.current) return;
        onOpenChange(false);
        onConnected(session);
      }, 800);
    });

    try {
      const wcUri = await client.connect();
      setUri(wcUri);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start WalletConnect');
    }
  }, [onOpenChange, onConnected]);

  // Start a connection whenever the modal opens
  useEffect(() => {
    if (!open) {
      closedRef.current = true;
      startedRef.current = false;
      return;
    }
    closedRef.current = false;
    if (startedRef.current) return;
    void startConnection();
  }, [open, startConnection]);

  // Tear down the WebSocket when the modal is closed without completing
  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) {
        closedRef.current = true;
        resetWalletConnectClient();
        setUri('');
        setStatus('idle');
        setErrorMsg('');
        setStatusDetail('');
        startedRef.current = false;
      }
      onOpenChange(v);
    },
    [onOpenChange],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const showQr =
    uri &&
    status !== 'connected' &&
    status !== 'error' &&
    status !== 'reconnecting';
  const showSpinner =
    status === 'approving' ||
    status === 'signing' ||
    status === 'reconnecting' ||
    (status === 'connecting' && !uri);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect with WalletConnect</DialogTitle>
          <DialogDescription className="sr-only">
            Scan the QR code with your Stellar mobile wallet to connect.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2" aria-live="polite">
          {/* QR code */}
          {showQr && (
            <div className="flex flex-col items-center gap-3 w-full">
              <p className="text-sm text-muted-foreground text-center">
                Scan with your Stellar mobile wallet (Lobstr, Solar, or any
                WalletConnect v2 compatible wallet).
              </p>

              <div
                className="rounded-xl border border-border bg-white p-3 shadow-sm"
                role="img"
                aria-label="WalletConnect QR code"
              >
                <QRCodeSVG
                  value={uri}
                  size={220}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Copy URI button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={copy}
                aria-label="Copy WalletConnect URI to clipboard"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy URI
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Spinner overlay for approving / signing states */}
          {showSpinner && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground text-center">
                {status === 'reconnecting' && statusDetail
                  ? statusDetail
                  : STATUS_LABEL[status]}
              </p>
            </div>
          )}

          {/* Connected confirmation */}
          {status === 'connected' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-10 h-10 text-success" />
              <p className="text-sm font-medium text-center">
                {STATUS_LABEL.connected}
              </p>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="w-full rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Connection failed</p>
                  {errorMsg && (
                    <p className="text-destructive/80 mt-1 break-words">{errorMsg}</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={startConnection}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Try again
              </Button>
            </div>
          )}

          {/* Status label while waiting (connecting + URI already shown via QR) */}
          {status === 'connecting' && uri && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {STATUS_LABEL.connecting}
            </p>
          )}
        </div>

        {/* Footer cancel */}
        <div className="pt-1">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => handleOpenChange(false)}
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
