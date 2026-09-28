import {
  BarChart3,
  Users,
  ListOrdered,
  Anchor,
  RefreshCcw,
  ShieldAlert,
  Settings,
} from "lucide-react";
import type { NavItem } from "./types";
import { ROUTES } from "./routes";

export const adminNavItems: NavItem[] = [
  { href: ROUTES.OVERVIEW, label: "Overview", icon: BarChart3 },
  { href: "/merchants", label: "Merchants", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/anchors", label: "Anchors", icon: Anchor },
  { href: "/fx-management", label: "FX Management", icon: RefreshCcw },
  { href: "/compliance", label: "Compliance", icon: ShieldAlert },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];
