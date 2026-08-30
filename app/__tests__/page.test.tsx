/* eslint-disable react/display-name, @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';

// Mock translations
jest.mock('@/lib/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'landing.badge': 'Now live on Soroban Testnet',
        'landing.headline': 'Settle Globally.',
        'landing.headlineAccent': 'Instantly & Non-Custodial.',
        'landing.description': 'The next-generation merchant payment platform for African businesses.',
        'landing.primaryCta': 'Start Accepting Crypto',
        'landing.secondaryCta': 'Explore Features',
        'landing.featuresTitle': 'Powered by Stellar & Soroban',
        'landing.featuresDescription': 'Enterprise-grade payment infrastructure designed for speed, low fees, and perfect transparency.',
        'landing.features.settlement.title': 'Instant Settlement',
        'landing.features.settlement.description': 'Transactions settle in 3-5 seconds.',
        'landing.features.offRamps.title': 'SEP-24 Fiat Off-Ramps',
        'landing.features.offRamps.description': 'Automated routing to Stellar Anchors.',
        'landing.features.fees.title': 'Smart Fee Splits',
        'landing.features.fees.description': 'Soroban contracts automatically calculate and route platform fees.',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock Header and Footer to isolate the page test. The landing page
// deep-imports these (not the `@/components/layout` barrel) to keep the app
// shell out of the public bundle — see docs/bundle-analysis.md.
jest.mock('@/components/layout/Header', () => ({
  __esModule: true,
  default: () => <div data-testid="layout-component" />,
}));
jest.mock('@/components/layout/Footer', () => ({
  __esModule: true,
  default: () => <div data-testid="layout-component" />,
}));

describe('Landing Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main hero section with correct text', () => {
    render(<LandingPage />);
    expect(screen.getByText('Settle Globally.')).toBeInTheDocument();
    expect(screen.getByText('Instantly & Non-Custodial.')).toBeInTheDocument();
  });

  it('renders the "Powered by Stellar & Soroban" headline as required', () => {
    render(<LandingPage />);
    expect(screen.getByText('Powered by Stellar & Soroban')).toBeInTheDocument();
  });

  it('renders all three feature cards with translations', () => {
    render(<LandingPage />);
    
    // Feature 1
    expect(screen.getByText('Instant Settlement')).toBeInTheDocument();
    expect(screen.getByText('Transactions settle in 3-5 seconds.')).toBeInTheDocument();
    
    // Feature 2
    expect(screen.getByText('SEP-24 Fiat Off-Ramps')).toBeInTheDocument();
    expect(screen.getByText('Automated routing to Stellar Anchors.')).toBeInTheDocument();
    
    // Feature 3
    expect(screen.getByText('Smart Fee Splits')).toBeInTheDocument();
    expect(screen.getByText('Soroban contracts automatically calculate and route platform fees.')).toBeInTheDocument();
  });

  it('renders feature elements within a list structure', () => {
    render(<LandingPage />);
    // The grid div has role="list"
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();

    // Features are in listitems
    const listitems = screen.getAllByRole('listitem');
    expect(listitems).toHaveLength(3);
  });
});
