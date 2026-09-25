import {
  LayoutDashboard,
  Link as LinkIcon,
  ListOrdered,
  Wallet,
  RefreshCcw,
  Settings,
  Code2,
  Building2,
} from "lucide-react";
import type { NavItem } from "./types";

export const merchantNavItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, labelKey: "navigation.overview", shortLabel: "Dashboard", shortLabelKey: "navigation.dashboard" },
  { href: "/payments", label: "Payments", icon: LinkIcon, labelKey: "navigation.payments" },
  { href: "/transactions", label: "Transactions", icon: ListOrdered, shortLabel: "History", labelKey: "navigation.transactions", shortLabelKey: "navigation.history" },
  { href: "/settlement", label: "Settlement", icon: Building2, labelKey: "navigation.settlement" },
  { href: "/wallet", label: "Wallet", icon: Wallet, labelKey: "navigation.wallet" },
  { href: "/fx", label: "FX Rates", icon: RefreshCcw, labelKey: "navigation.fxRates" },
  { href: "/developers", label: "Developers", icon: Code2, labelKey: "navigation.developers" },
  { href: "/settings", label: "Settings", icon: Settings, labelKey: "navigation.settings" },
];
