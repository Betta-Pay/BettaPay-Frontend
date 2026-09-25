export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
  shortLabel?: string;
  labelKey?: string;
  shortLabelKey?: string;
}
