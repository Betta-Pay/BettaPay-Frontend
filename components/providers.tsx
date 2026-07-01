"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useSessionTimeout } from "@/lib/hooks/useSessionTimeout";
import { useSessionCheck } from "@/lib/hooks/useSessionCheck";
import { useCrossTabAuth } from "@/lib/hooks/useCrossTabAuth";
import { SessionTimeoutModal } from "@/components/SessionTimeoutModal";
import { OfflineBanner } from "@/components/ui/offline-banner";

export function Providers({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  useSessionCheck();
  useCrossTabAuth();

  const handleTimeout = useCallback(() => {
    logout();
    window.location.href = "/auth/login";
  }, [logout]);

  const { showWarning, secondsRemaining, dismissWarning } = useSessionTimeout({
    onTimeout: handleTimeout,
  });

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
      <OfflineBanner />
      {children}
      {isAuthenticated && (
        <SessionTimeoutModal
          open={showWarning}
          secondsRemaining={secondsRemaining}
          onDismiss={dismissWarning}
        />
      )}
    </ThemeProvider>
  );
}
