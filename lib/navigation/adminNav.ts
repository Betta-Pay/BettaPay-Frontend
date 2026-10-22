import {
  BarChart3,
  Users,
  ListOrdered,
  Anchor,
  RefreshCcw,
  ShieldAlert,
  Settings,
  ScrollText,
  PackageCheck,
  Fingerprint,
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
  { href: "/audit", label: "Audit Log", icon: ScrollText },
  { href: "/batches", label: "Batches", icon: PackageCheck },
  { href: "/security/ip-scores", label: "IP Scores", icon: Fingerprint },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];
