/**
 * Landing page feature definitions.
 *
 * Each entry maps to an i18n key under `landing.features.<key>` for the title
 * and description, and carries the Lucide icon component to render.
 *
 * To add a feature: add a named import from `lucide-react` below and a new
 * entry to `landingFeatures`. Importing the icon by name (rather than looking
 * it up from the whole `lucide-react` namespace at runtime) keeps the public
 * landing bundle from shipping the entire icon set.
 */

import type { LucideIcon } from 'lucide-react';
import { Zap, Globe, Coins } from 'lucide-react';

export type LandingFeature = {
  /** Lucide icon component rendered in the feature card. */
  icon: LucideIcon;
  /** i18n key suffix used under `landing.features.<key>.title` / `.description`. */
  titleKey: string;
  /** i18n key suffix used under `landing.features.<key>.description`. */
  descriptionKey: string;
  /** Optional link target (e.g. "/docs"). */
  link?: string;
};

/** Ordered list of features shown in the landing page features section. */
export const landingFeatures: LandingFeature[] = [
  {
    icon: Zap,
    titleKey: 'settlement',
    descriptionKey: 'settlement',
    link: '/docs',
  },
  {
    icon: Globe,
    titleKey: 'offRamps',
    descriptionKey: 'offRamps',
    link: '/fiat-settlements',
  },
  {
    icon: Coins,
    titleKey: 'fees',
    descriptionKey: 'fees',
  },
];
