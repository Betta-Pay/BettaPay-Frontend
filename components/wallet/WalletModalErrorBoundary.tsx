import React, { Component, ReactNode } from 'react';

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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("WalletModalErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="wallet-error-fallback p-4 text-center border border-red-200 rounded-lg bg-red-50 space-y-3">
          <p className="text-sm text-red-600 font-medium">
            Failed to connect wallet or load session.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-red-500 font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
          >
            Retry Connection
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
