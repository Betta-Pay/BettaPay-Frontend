"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { captureException } from "@/lib/errorReporting";
import { ROUTES } from "@/lib/navigation/routes";

const buttonBase =
  "inline-flex items-center justify-center rounded-lg px-4 h-11 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ErrorBoundaryProps {
  children: ReactNode;
  pathname?: string;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  pathname?: string;
}

/**
 * Catches render errors thrown by descendant page components (e.g. a chart that
 * blows up) and shows a recoverable fallback card instead of a white screen.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    pathname: this.props.pathname,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): ErrorBoundaryState | null {
    if (props.pathname !== state.pathname) {
      return { hasError: false, pathname: props.pathname };
    }
    return null;
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error(
      "Unhandled render error caught by ErrorBoundary",
      error,
      info,
    );
    const componentStack = (info as { componentStack?: string } | null)
      ?.componentStack;
    captureException(error, { source: "boundary", componentStack });
  }

  handleReset = () => {
    // Reset the boundary so the children get a fresh render attempt.
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div
          role="alert"
          className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle
              className="h-6 w-6 text-destructive"
              aria-hidden="true"
            />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This page ran into an unexpected error. You can try again, or head
            back to your dashboard.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className={`${buttonBase} gap-2 bg-primary text-primary-foreground hover:bg-primary/80`}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try Again
            </button>
            <Link
              href={ROUTES.DASHBOARD}
              className={`${buttonBase} border border-border bg-background hover:bg-muted hover:text-foreground`}
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export function ErrorBoundaryWithRouter({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : undefined;
  return (
    <ErrorBoundary pathname={pathname} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
