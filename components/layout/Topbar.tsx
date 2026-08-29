"use client";

import { useState, useCallback, useEffect } from "react";
import { Menu, LogOut, Settings, KeyRound, Moon, Sun, Monitor, Repeat, Search } from "lucide-react";
import { openCommandPalette } from "@/lib/command/open";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/store/authStore";
import { useWalletStore } from "@/lib/store/walletStore";
import { useRouter } from "next/navigation";
import { useNotify } from "@/lib/hooks/useNotify";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

interface TopbarProps {
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
  title?: string;
  unreadNotificationCount?: number;
}

export const Topbar = ({ onMenuClick, isMenuOpen, title, unreadNotificationCount = 0 }: TopbarProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const notify = useNotify();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    notify.success("Logged out successfully");
    router.push("/auth/login");
  }, [logout, notify, router]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDark = isMounted && resolvedTheme === "dark";

  const themeIcon = !isMounted ? null : theme === "system"
    ? <Monitor className="h-4.5 w-4.5" />
    : isDark
      ? <Sun className="h-4.5 w-4.5" />
      : <Moon className="h-4.5 w-4.5" />;

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
  const isConnected = useWalletStore((s) => s.isConnected);
  const setNetwork = useWalletStore((s) => s.setNetwork);
  const isTestnet = walletNetwork === 'testnet';
  const isDev = process.env.NODE_ENV === 'development';

  const handleToggleNetwork = useCallback(() => {
    const next = isTestnet ? 'public' : 'testnet';
    setNetwork(next);
    notify.success(`Switched to ${next === 'testnet' ? 'Testnet' : 'Mainnet'}. Balances are refreshing.`);
  }, [isTestnet, setNetwork, notify]);

  return (
    // Topbar is intentionally a plain <div> (not a <header role="banner">) so that the
    // page has exactly one banner landmark (the site <Header /> on marketing pages).
    // Screen-reader landmark navigation then lists the app header once. The merchant
    // and admin app shells keep their own navigation landmarks via sidebars and this
    // top bar region is exposed as a labelled region instead of a second banner.
    <div
      className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm shadow-muted/50"
      role="region"
      aria-label="Top bar"
    >
      <div className="flex items-center gap-4">
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
          <h1 className="text-lg font-semibold tracking-tight hidden md:block text-foreground">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3 flex-1 justify-end">
        {/* Command palette launcher (issue #459) — ⌘K also opens it globally */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Open command palette"
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Search className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Search</span>
          <kbd className="rounded border border-border px-1 py-0.5 text-[10px] leading-none">⌘K</kbd>
        </button>

        {/* Network Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/50 text-xs font-medium">
          <span
            className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-400' : 'bg-green-500'}`}
            aria-hidden="true"
          />
          <span className="text-foreground">
            {isConnected ? (isTestnet ? 'Testnet' : 'Mainnet') : 'No wallet connected'}
          </span>
          {isDev && (
            <button
              onClick={handleToggleNetwork}
              className="ml-1 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Switch to ${isTestnet ? 'Mainnet' : 'Testnet'}`}
              title={`Switch to ${isTestnet ? 'Mainnet' : 'Testnet'}`}
            >
              <Repeat className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Notifications */}
        <NotificationCenter unreadNotificationCount={unreadNotificationCount} />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Select theme"
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl min-h-[44px] min-w-[44px]"
              >
                {themeIcon}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="rounded-xl border-border">
            <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer rounded-lg">
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer rounded-lg">
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer rounded-lg">
              <Monitor className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="relative min-h-[44px] min-w-[44px] rounded-xl p-0 hover:bg-muted"
                aria-expanded={isDropdownOpen}
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
