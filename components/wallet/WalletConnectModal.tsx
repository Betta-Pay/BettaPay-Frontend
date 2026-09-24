"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, CheckCircle2, AlertTriangle, Copy, RefreshCw, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import {
  getWalletConnectClient,
  isWalletConnectConfigured,
  resetWalletConnectClient,
  WalletConnectConfigError,
} from '@/lib/stellar/walletconnect';
import type {
  StellarWalletConnectNetwork,
  WalletConnectStatus,
  WalletConnectSession,
} from '@/lib/stellar/walletconnect';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';

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

type WalletConnectStatusLabelKey =
  | 'walletConnect.status.connecting'
  | 'walletConnect.status.reconnecting'
  | 'walletConnect.status.approving'
  | 'walletConnect.status.connected'
  | 'walletConnect.status.signing'
  | 'walletConnect.status.disconnected'
  | 'walletConnect.status.error';

// `idle` has no label of its own (nothing is shown in that state), so it is
// deliberately omitted here rather than mapped to an empty translation key.
const STATUS_LABEL_KEY: Record<Exclude<WalletConnectStatus, 'idle'>, WalletConnectStatusLabelKey> = {
  connecting: 'walletConnect.status.connecting',
  reconnecting: 'walletConnect.status.reconnecting',
  approving: 'walletConnect.status.approving',
  connected: 'walletConnect.status.connected',
  signing: 'walletConnect.status.signing',
  disconnected: 'walletConnect.status.disconnected',
  error: 'walletConnect.status.error',
};

interface WalletConnectModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  network: StellarWalletConnectNetwork;
  onConnected: (session: WalletConnectSession) => void;
}

export function WalletConnectModal({
  open,
  onOpenChange,
  network,
  onConnected,
}: WalletConnectModalProps) {
  const { t } = useAppTranslation();
  const [uri, setUri] = useState<string>('');
  const [status, setStatus] = useState<WalletConnectStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusDetail, setStatusDetail] = useState<string>('');
  // Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (issue #500): retrying cannot
  // help, so this gets its own state instead of the generic "Connection failed".
  const [configError, setConfigError] = useState(false);
  const { copied, copy } = useCopyUri(uri);

  const startedRef = useRef(false);
  const startedNetworkRef = useRef<StellarWalletConnectNetwork | null>(null);
  const closedRef = useRef(false);

  const startConnection = useCallback(async () => {
    const activeNetwork = network;
    startedRef.current = true;
    startedNetworkRef.current = activeNetwork;
    closedRef.current = false;
    setUri('');
    setErrorMsg('');
    setStatusDetail('');
    setStatus('idle');
    setConfigError(false);

    if (!isWalletConnectConfigured()) {
      setConfigError(true);
      return;
    }

    resetWalletConnectClient();
    const client = getWalletConnectClient(activeNetwork);

    client.onStatus((s, detail) => {
      if (closedRef.current || startedNetworkRef.current !== activeNetwork) return;
      setStatus(s);
      setStatusDetail(detail ?? '');
      if (s === 'error') setErrorMsg(detail ?? t('walletConnect.errors.unknown'));
    });

    client.onSession((session) => {
      if (closedRef.current || startedNetworkRef.current !== activeNetwork) return;
      setTimeout(() => {
        if (closedRef.current || startedNetworkRef.current !== activeNetwork) return;
        onOpenChange(false);
        onConnected(session);
      }, 800);
    });

    try {
      const wcUri = await client.connect();
      if (closedRef.current || startedNetworkRef.current !== activeNetwork) return;
      setUri(wcUri);
    } catch (err) {
      if (closedRef.current || startedNetworkRef.current !== activeNetwork) return;
      if (err instanceof WalletConnectConfigError) {
        setConfigError(true);
        return;
      }
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : t('walletConnect.errors.startFailed'));
    }
  }, [network, onOpenChange, onConnected, t]);

  useEffect(() => {
    if (!open) {
      closedRef.current = true;
      startedRef.current = false;
      startedNetworkRef.current = null;
      return;
    }
    closedRef.current = false;
    if (startedRef.current && startedNetworkRef.current === network) return;
    void startConnection();
  }, [open, network, startConnection]);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) {
        closedRef.current = true;
        getWalletConnectClient(network).abortInitialization();
        resetWalletConnectClient();
        setUri('');
        setStatus('idle');
        setErrorMsg('');
        setStatusDetail('');
        setConfigError(false);
        startedRef.current = false;
        startedNetworkRef.current = null;
      }
      onOpenChange(v);
    },
    [onOpenChange, network],
  );

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
          <DialogTitle>{t('walletConnect.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('walletConnect.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2" aria-live="polite">
          {configError && (
            <div
              role="alert"
              className="w-full rounded-lg border border-border bg-muted/50 p-4 text-sm flex items-start gap-2"
            >
              <Settings className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{t('walletConnect.notConfigured.title')}</p>
                <p className="text-muted-foreground mt-1">
                  {t('walletConnect.notConfigured.description')}
                </p>
                {process.env.NODE_ENV !== 'production' && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {t('walletConnect.notConfigured.developerHintPrefix')}{' '}
                    <code className="font-mono">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code>{' '}
                    {t('walletConnect.notConfigured.developerHintSuffix')}
                  </p>
                )}
              </div>
            </div>
          )}

          {showQr && (
            <div className="flex flex-col items-center gap-3 w-full">
              <p className="text-sm text-muted-foreground text-center">
                {t('walletConnect.scanPrompt')}
              </p>

              <div
                className="rounded-xl border border-border bg-white p-3 shadow-sm"
                role="img"
                aria-label={t('walletConnect.qrAriaLabel')}
              >
                <QRCodeSVG
                  value={uri}
                  size={220}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={copy}
                aria-label={t('walletConnect.copyAriaLabel')}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-success" />
                    {t('walletConnect.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    {t('walletConnect.copyUri')}
                  </>
                )}
              </Button>
            </div>
          )}

          {showSpinner && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground text-center">
                {status === 'reconnecting' && statusDetail
                  ? statusDetail
                  : t(STATUS_LABEL_KEY[status as Exclude<WalletConnectStatus, 'idle'>])}
              </p>
            </div>
          )}

          {status === 'connected' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-10 h-10 text-success" />
              <p className="text-sm font-medium text-center">
                {t(STATUS_LABEL_KEY.connected)}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="w-full rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-destructive">{t('walletConnect.status.error')}</p>
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
                {t('walletConnect.tryAgain')}
              </Button>
            </div>
          )}

          {status === 'connecting' && uri && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t(STATUS_LABEL_KEY.connecting)}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
