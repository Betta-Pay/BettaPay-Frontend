"use client";

import { useCallback } from "react";
import { Menu, LogOut, Settings, KeyRound, Search, Plus } from "lucide-react";
import { openCommandPalette } from "@/lib/command/open";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/store/authStore";
import { ROUTES } from "@/lib/navigation/routes";
import { useWalletStore } from "@/lib/store/walletStore";
import { useRouter } from "next/navigation";
import { useNotify } from "@/lib/hooks/useNotify";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

const NotificationCenter = dynamic(
  () =>
    import("@/components/notifications/NotificationCenter").then(
      (mod) => mod.NotificationCenter
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-8 w-8 rounded-full" />,
  }
);

interface TopbarProps {
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
  title?: string;
  unreadNotificationCount?: number;
  /** Unread admin alerts (admin shell only); adds to the bell badge. */
  alertUnreadCount?: number;
}

export const Topbar = ({
  onMenuClick,
  isMenuOpen,
  title,
  unreadNotificationCount = 0,
  alertUnreadCount = 0,
}: TopbarProps) => {
  const { user, logout } = useAuthStore();
  const notify = useNotify();
  const router = useRouter();

  const handleLogout = useCallback(() => {
    logout();
    notify.success("Logged out successfully");
    router.push(ROUTES.LOGIN);
  }, [logout, notify, router]);

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const avatarSrc = user?.avatarUrl?.trim() || undefined;

  const walletNetwork = useWalletStore((s) => s.network);
  const setNetwork = useWalletStore((s) => s.setNetwork);
  const isTestnet = walletNetwork === "testnet";

  const handleSelectNetwork = useCallback(
    (network: "testnet" | "public") => {
      if (network === walletNetwork) return;
      setNetwork(network);
      notify.success(
        network === "testnet"
          ? "Switched to Stellar Testnet (Sandbox mode)"
          : "Switched to Stellar Mainnet (Live settlement mode)"
      );
    },
    [walletNetwork, setNetwork, notify]
  );

  return (
    // Topbar is intentionally a plain <div> (not a <header role="banner">) so that the
    // page has exactly one banner landmark (the site <Header /> on marketing pages).
    // Screen-reader landmark navigation then lists the app header once. The merchant
    // and admin app shells keep their own navigation landmarks via sidebars and this
    // top bar region is exposed as a labelled region instead of a second banner.
    <div
      className="h-16 border-b border-border bg-card flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30 shadow-xs"
      role="region"
      aria-label="Top bar"
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]"
          onClick={onMenuClick}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle mobile menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {title && (
          <h1 className="text-base sm:text-lg font-heading font-semibold tracking-tight hidden md:block text-foreground">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
        {/* Global Quick Action: Create Payment Link */}
        <Button
          onClick={() => router.push("/payments?create=true")}
          size="sm"
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold h-9 px-3 text-xs rounded-xl shadow-button transition-transform active:scale-95 flex items-center gap-1.5"
          aria-label="Create payment link"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
          <span className="hidden sm:inline">Create Link</span>
          <span className="sm:hidden">Link</span>
        </Button>

        {/* Command palette launcher (issue #459) — ⌘K also opens it globally */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="hidden md:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open command palette"
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Search className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Search</span>
          <kbd className="rounded border border-border px-1 py-0.5 text-[10px] leading-none">
            ⌘K
          </kbd>
        </button>

        {/* Global Environment & Network Pill: Distinct border-glow segmented toggle */}
        <div
          className={cn(
            "flex items-center p-0.5 rounded-full border text-xs font-medium transition-all duration-200",
            isTestnet
              ? "border-amber-500/40 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.22)]"
              : "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.22)]"
          )}
          role="group"
          aria-label="Stellar network environment"
        >
          <button
            type="button"
            onClick={() => handleSelectNetwork("testnet")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary",
              isTestnet
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={isTestnet}
            title="Stellar Testnet (Sandbox)"
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                isTestnet ? "bg-slate-950" : "bg-amber-500"
              )}
              aria-hidden="true"
            />
            <span className="hidden xs:inline">Testnet</span>
            <span className="xs:hidden">Test</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectNetwork("public")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary",
              !isTestnet
                ? "bg-emerald-500 text-slate-950 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={!isTestnet}
            title="Stellar Public (Mainnet)"
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                !isTestnet ? "bg-slate-950" : "bg-emerald-500"
              )}
              aria-hidden="true"
            />
            <span className="hidden xs:inline">Mainnet</span>
            <span className="xs:hidden">Live</span>
          </button>
        </div>

        {/* Notifications */}
        <NotificationCenter
          unreadNotificationCount={unreadNotificationCount}
          alertUnreadCount={alertUnreadCount}
        />

        <ThemeToggle />

        {/* User menu — open state is mirrored to the URL (?menu=open) so a
            refresh keeps the menu open for deep links (issue #759). */}
        <DropdownMenu urlParam="menu">
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="relative min-h-[44px] min-w-[44px] rounded-xl p-0 hover:bg-muted"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8 border border-border">
                  {avatarSrc ? (
                    <AvatarImage src={avatarSrc} alt={user?.name ?? "User"} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent
            className="w-56 border-border shadow-dropdown rounded-xl mt-1"
            align="end"
          >
            {/* `DropdownMenuLabel` (Menu.GroupLabel) requires a Menu.Group
                ancestor, so the whole menu body is wrapped in a group. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1 py-1">
                  <p className="text-sm font-semibold text-foreground leading-none">
                    {user?.name ?? "Merchant User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground mt-1">
                    {user?.email ?? "merchant@example.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-muted" />
              <DropdownMenuItem
                className="flex items-center gap-2 text-muted-foreground cursor-pointer rounded-lg"
                onClick={() => router.push("/settings")}
              >
                <Settings className="w-4 h-4" /> Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 text-muted-foreground cursor-pointer rounded-lg"
                onClick={() => router.push("/developers")}
              >
                <KeyRound className="w-4 h-4" /> API Keys
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-muted" />
              <DropdownMenuItem
                className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
