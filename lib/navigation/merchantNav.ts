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
import { ROUTES } from "./routes";

export const merchantNavItems: NavItem[] = [
  { href: ROUTES.DASHBOARD, label: "Overview", icon: LayoutDashboard },
  { href: "/payments", label: "Payments", icon: LinkIcon },
  { href: "/transactions", label: "Transactions", icon: ListOrdered, shortLabel: "History" },
  { href: "/settlement", label: "Settlement", icon: Building2 },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/fx", label: "FX Rates", icon: RefreshCcw },
  { href: "/developers", label: "Developers", icon: Code2 },
  { href: "/settings", label: "Settings", icon: Settings },
];
