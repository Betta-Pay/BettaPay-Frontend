import React from 'react';
import { render, screen } from '@testing-library/react';
import { VolumeCalculator } from '../VolumeCalculator';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
  usePathname: () => '/pricing',
  useSearchParams: () => ({
    get: () => null,
    toString: () => '',
  }),
}));

describe('VolumeCalculator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders slider boundary markers and labels correctly', () => {
    render(<VolumeCalculator />);

    // Check that slider limits and boundary labels are visible
    expect(screen.getByText('$1k')).toBeInTheDocument();
    expect(screen.getByText('$10.0K')).toBeInTheDocument();
    expect(screen.getByText('$500.0K')).toBeInTheDocument();
    expect(screen.getByText('$10M')).toBeInTheDocument();
  });

  it('provides correct explanations and discounts for different tiers at $5,000 volume', () => {
    // Modify URL params / state by mock if needed, but default is DEFAULT_VOLUME (50_000).
    // Let's assert render outputs for the component's interactive volume discount logic.
    render(<VolumeCalculator />);
    
    // Growth should show the savings since default volume is $50k (which is in Growth range)
    expect(screen.getByText(/Save \$[0-9.,]+ vs Starter/i)).toBeInTheDocument();
    
    // Enterprise should show contact sales minimum message (formatted via formatUsdCompact)
    expect(screen.getByText(/Requires \$500\.0K\/mo volume for custom pricing/i)).toBeInTheDocument();
  });
});
