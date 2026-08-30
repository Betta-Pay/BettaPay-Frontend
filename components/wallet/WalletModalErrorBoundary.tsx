"use client";

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface WalletModalErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface WalletModalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class WalletModalErrorBoundary extends Component<
  WalletModalErrorBoundaryProps,
  WalletModalErrorBoundaryState
> {
  constructor(props: WalletModalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): WalletModalErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('WalletModalErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="wallet-error-fallback space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-600">
            Failed to connect wallet or load session.
          </p>
          {this.state.error?.message && (
            <p className="font-mono text-xs text-red-500 break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            Retry Connection
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
