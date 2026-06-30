import { render, screen } from '@testing-library/react';

import { CurrencyDisplay } from '../CurrencyDisplay';

describe('CurrencyDisplay', () => {
  it('renders a USDC amount with decimals by default', () => {
    render(<CurrencyDisplay amount={1250} />);

    expect(screen.getByText('USDC 1,250.00')).toBeInTheDocument();
  });

  it('strips decimals when showDecimals is false for non-NGN currencies', () => {
    render(<CurrencyDisplay amount={1250} showDecimals={false} />);

    expect(screen.getByText('USDC 1,250')).toBeInTheDocument();
  });

  it('renders NGN values without forcing decimals', () => {
    render(<CurrencyDisplay amount={1250} currency="NGN" />);

    expect(screen.getByText('₦1,250')).toBeInTheDocument();
  });

  it('renders a custom currency label when provided', () => {
    render(<CurrencyDisplay amount={99.5} currency="USDT" />);

    expect(screen.getByText('USDC 99.50')).toBeInTheDocument();
  });

  it('supports custom classNames', () => {
    render(<CurrencyDisplay amount={42} className="custom-display" />);

    expect(screen.getByText('USDC 42.00')).toHaveClass('custom-display');
  });
});
