import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/components/ui/input', () => jest.requireActual('../input'));

import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders with the provided placeholder text', () => {
    render(<Input placeholder="Enter email" />);

    const input = screen.getByPlaceholderText(/enter email/i);

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('data-slot', 'input');
  });

  it('updates its value when the user types', async () => {
    const user = userEvent.setup();

    render(<Input aria-label="Email" />);

    const input = screen.getByLabelText(/email/i);
    await user.type(input, 'test@example.com');

    expect(input).toHaveValue('test@example.com');
  });

  it('supports the disabled state', () => {
    render(<Input aria-label="Password" disabled />);

    const input = screen.getByLabelText(/password/i);

    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed');
  });

  it('supports the aria-invalid state', () => {
    render(<Input aria-label="Amount" aria-invalid="true" />);

    const input = screen.getByLabelText(/amount/i);

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('aria-invalid:border-destructive');
  });

  it('supports a custom input type', () => {
    render(<Input aria-label="Search" type="search" />);

    expect(screen.getByLabelText(/search/i)).toHaveAttribute('type', 'search');
  });

  it('accepts a custom className', () => {
    render(<Input aria-label="Name" className="custom-input" />);

    expect(screen.getByLabelText(/name/i)).toHaveClass('custom-input');
  });
});
