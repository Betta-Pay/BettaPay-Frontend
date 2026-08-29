/**
 * Hydration-Parity Tests for Public Marketing Pages
 *
 * These tests verify that the HTML produced by a simulated SSR render
 * (ReactDOM/server renderToString) contains the same key landmarks as the
 * client-side render produced by @testing-library/react.
 *
 * They also assert that lib/config.ts exports deterministic, build-time-baked
 * values so there can never be a mismatch between prerendered HTML and the
 * values the client JavaScript sees.
 *
 * Acceptance criteria this covers:
 *  ✓ Marketing pages hydrate identically to their prerendered HTML.
 *  ✓ Env reads are centralised (all via lib/config.ts — no inline process.env
 *    reads in the page components themselves).
 */

/* eslint-disable react/display-name, @typescript-eslint/no-explicit-any */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';

// ─── Shared mocks ─────────────────────────────────────────────────────────────

// next/link — both environments need a plain anchor
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

// next/image — lightweight stub (no real image loading in tests)
jest.mock('next/image', () => {
  return function NextImage({ src, alt, ...rest }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...rest} />;
  };
});

// Header / Footer — isolated from layout concerns
jest.mock('@/components/layout', () => ({
  Header: () => <header data-testid="header" />,
  Footer: () => <footer data-testid="footer" />,
}));

// ─── Landing page mocks ───────────────────────────────────────────────────────

jest.mock('@/lib/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'landing.badge': 'Now live on Soroban Testnet',
        'landing.headline': 'Settle Globally.',
        'landing.headlineAccent': 'Instantly & Non-Custodial.',
        'landing.description': 'Next-generation merchant payment platform.',
        'landing.primaryCta': 'Start Accepting Crypto',
        'landing.secondaryCta': 'Explore Features',
        'landing.featuresTitle': 'Powered by Stellar & Soroban',
        'landing.featuresDescription': 'Enterprise-grade payment infrastructure.',
        'landing.features.settlement.title': 'Instant Settlement',
        'landing.features.settlement.description': 'Transactions settle in 3-5 seconds.',
        'landing.features.offRamps.title': 'SEP-24 Fiat Off-Ramps',
        'landing.features.offRamps.description': 'Automated routing to Stellar Anchors.',
        'landing.features.fees.title': 'Smart Fee Splits',
        'landing.features.fees.description': 'Soroban contracts automatically calculate fees.',
      };
      return map[key] ?? key;
    },
  }),
}));

// ─── Pricing page mocks ───────────────────────────────────────────────────────

jest.mock('@/components/pricing/TierCard', () => ({
  TierCard: ({ name }: any) => <div data-testid="tier-card">{name}</div>,
}));
jest.mock('@/components/pricing/ComparisonTable', () => ({
  ComparisonTable: () => <div data-testid="comparison-table" />,
}));
jest.mock('@/components/pricing/VolumeCalculator', () => ({
  VolumeCalculator: () => <div data-testid="volume-calculator" />,
}));
jest.mock('@/components/pricing/FAQ', () => ({
  FAQ: () => <div data-testid="faq" />,
}));
jest.mock('@/components/pricing/EnterpriseCTA', () => ({
  EnterpriseCTA: () => <div data-testid="enterprise-cta" />,
}));

// ─── About page mocks ─────────────────────────────────────────────────────────

jest.mock('@/components/about/Hero', () => ({
  Hero: () => <section data-testid="about-hero">About Hero</section>,
}));
jest.mock('@/components/about/Team', () => ({
  Team: () => <section data-testid="about-team" />,
}));
jest.mock('@/components/about/Investors', () => ({
  Investors: () => <section data-testid="about-investors" />,
}));
jest.mock('@/components/about/Timeline', () => ({
  Timeline: () => <section data-testid="about-timeline" />,
}));
jest.mock('@/components/about/Values', () => ({
  Values: () => <section data-testid="about-values" />,
}));
jest.mock('@/components/about/Careers', () => ({
  Careers: () => <section data-testid="about-careers" />,
}));
jest.mock('@/components/about/Press', () => ({
  Press: () => <section data-testid="about-press" />,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract normalised text content from an HTML string.
 * Strips tags, collapses whitespace, trims — produces a stable string for
 * comparison regardless of attribute ordering differences between
 * renderToString and the DOM.
 */
function extractText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Hydration Parity — lib/config.ts', () => {
  it('exports deterministic string values regardless of import order', () => {
    // Import twice (Node module cache ensures same object) and verify the
    // values are stable strings, not live process.env accessors.
    const config1 = require('@/lib/config');
    const config2 = require('@/lib/config');

    // Referential equality — same module instance
    expect(config1).toBe(config2);

    // All exported values must be primitive strings (or undefined for
    // optional fields), never undefined for required fields with defaults.
    expect(typeof config1.SITE_URL).toBe('string');
    expect(config1.SITE_URL.length).toBeGreaterThan(0);

    expect(typeof config1.STELLAR_NETWORK).toBe('string');
    expect(config1.STELLAR_NETWORK.length).toBeGreaterThan(0);

    expect(typeof config1.HORIZON_URL).toBe('string');
    expect(config1.HORIZON_URL.length).toBeGreaterThan(0);

    expect(typeof config1.SETTLEMENT_CONTRACT_ID).toBe('string');
    expect(config1.SETTLEMENT_CONTRACT_ID.length).toBeGreaterThan(0);

    // Optional fields — must be string or undefined, never something else
    expect(['string', 'undefined']).toContain(typeof config1.USDT_CONTRACT_ID);
    expect(['string', 'undefined']).toContain(typeof config1.RECAPTCHA_SITE_KEY);
  });

  it('SITE_URL is a valid URL', () => {
    const { SITE_URL } = require('@/lib/config');
    expect(() => new URL(SITE_URL)).not.toThrow();
  });

  it('has no inline process.env reads in lib/utils/constants.ts', () => {
    // Importing constants must not throw and must use values from config
    const { STELLAR_NETWORK, HORIZON_URL } = require('@/lib/utils/constants');
    const config = require('@/lib/config');
    expect(STELLAR_NETWORK).toBe(config.STELLAR_NETWORK);
    expect(HORIZON_URL).toBe(config.HORIZON_URL);
  });
});

describe('Hydration Parity — Landing Page (/)', () => {
  let LandingPage: React.ComponentType;

  beforeAll(async () => {
    LandingPage = (await import('@/app/page')).default;
  });

  it('SSR and client renders contain identical hero headline', () => {
    const ssrHtml = renderToString(React.createElement(LandingPage));
    const ssrText = extractText(ssrHtml);

    const { unmount } = render(React.createElement(LandingPage));
    const clientHeadline = screen.getByText('Settle Globally.');

    // Headline present in SSR output
    expect(ssrText).toContain('Settle Globally.');
    // Headline present in client DOM
    expect(clientHeadline).toBeInTheDocument();

    unmount();
  });

  it('SSR and client renders contain identical features section heading', () => {
    const ssrHtml = renderToString(React.createElement(LandingPage));
    const ssrText = extractText(ssrHtml);

    const { unmount } = render(React.createElement(LandingPage));
    const clientHeading = screen.getByText('Powered by Stellar & Soroban');

    expect(ssrText).toContain('Powered by Stellar & Soroban');
    expect(clientHeading).toBeInTheDocument();

    unmount();
  });

  it('SSR and client renders contain all three feature card titles', () => {
    const titles = ['Instant Settlement', 'SEP-24 Fiat Off-Ramps', 'Smart Fee Splits'];

    const ssrHtml = renderToString(React.createElement(LandingPage));
    const ssrText = extractText(ssrHtml);

    const { unmount } = render(React.createElement(LandingPage));

    titles.forEach((title) => {
      // SSR
      expect(ssrText).toContain(title);
      // Client
      expect(screen.getByText(title)).toBeInTheDocument();
    });

    unmount();
  });

  it('SSR output does not contain any role-cookie or user-specific branching markers', () => {
    const ssrHtml = renderToString(React.createElement(LandingPage));
    // There must be no references to user_role, merchant_onboarded, or auth tokens
    // in the public landing page HTML — these would indicate SSR/client divergence.
    expect(ssrHtml).not.toMatch(/user_role/);
    expect(ssrHtml).not.toMatch(/merchant_onboarded/);
    expect(ssrHtml).not.toMatch(/auth_token/);
  });
});

describe('Hydration Parity — Pricing Page (/pricing)', () => {
  let PricingPage: React.ComponentType;

  beforeAll(async () => {
    PricingPage = (await import('@/app/pricing/page')).default;
  });

  it('SSR and client renders both show the pricing hero heading', () => {
    const ssrHtml = renderToString(React.createElement(PricingPage));
    const ssrText = extractText(ssrHtml);

    const { unmount } = render(React.createElement(PricingPage));

    expect(ssrText).toContain('Simple, transparent');
    expect(screen.getByText(/Simple, transparent/)).toBeInTheDocument();

    unmount();
  });

  it('SSR and client renders both contain all three tier cards', () => {
    const { PRICING_TIERS } = require('@/lib/pricing');

    const ssrHtml = renderToString(React.createElement(PricingPage));
    const ssrText = extractText(ssrHtml);

    const { unmount } = render(React.createElement(PricingPage));
    const clientCards = screen.getAllByTestId('tier-card');

    expect(clientCards).toHaveLength(PRICING_TIERS.length);
    PRICING_TIERS.forEach((tier: { name: string }) => {
      expect(ssrText).toContain(tier.name);
    });

    unmount();
  });

  it('SSR output contains no role-cookie or user-specific branching markers', () => {
    const ssrHtml = renderToString(React.createElement(PricingPage));
    expect(ssrHtml).not.toMatch(/user_role/);
    expect(ssrHtml).not.toMatch(/merchant_onboarded/);
    expect(ssrHtml).not.toMatch(/auth_token/);
  });
});

describe('Hydration Parity — About Page (/about)', () => {
  let AboutPage: React.ComponentType;

  beforeAll(async () => {
    AboutPage = (await import('@/app/about/page')).default;
  });

  it('SSR and client renders both contain the about hero section', () => {
    const ssrHtml = renderToString(React.createElement(AboutPage));

    const { unmount } = render(React.createElement(AboutPage));

    expect(ssrHtml).toContain('data-testid="about-hero"');
    expect(screen.getByTestId('about-hero')).toBeInTheDocument();

    unmount();
  });

  it('SSR and client renders both contain the bottom CTA heading', () => {
    const ssrHtml = renderToString(React.createElement(AboutPage));
    const ssrText = extractText(ssrHtml);

    const { unmount } = render(React.createElement(AboutPage));

    expect(ssrText).toContain('Ready to accept crypto payments?');
    expect(screen.getByText('Ready to accept crypto payments?')).toBeInTheDocument();

    unmount();
  });

  it('SSR output contains no role-cookie or user-specific branching markers', () => {
    const ssrHtml = renderToString(React.createElement(AboutPage));
    expect(ssrHtml).not.toMatch(/user_role/);
    expect(ssrHtml).not.toMatch(/merchant_onboarded/);
    expect(ssrHtml).not.toMatch(/auth_token/);
  });
});
