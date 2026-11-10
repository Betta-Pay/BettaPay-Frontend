import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthInput } from '@/components/auth/AuthInput';

describe('AuthInput — Accessible aria-live error announcements (#888)', () => {
  it('links input to its error message via aria-describedby, sets aria-invalid="true", and announces error with role="alert" and aria-live="polite"', () => {
    render(
      <AuthInput
        id="email"
        placeholder="you@company.com"
        error="Please enter a valid business email address."
      />
    );

    const input = screen.getByPlaceholderText('you@company.com');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('id', 'email-error');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveTextContent(
      'Please enter a valid business email address.'
    );
  });

  it('does not set aria-invalid or render an error alert when error prop is omitted', () => {
    render(<AuthInput id="email" placeholder="you@company.com" />);

    const input = screen.getByPlaceholderText('you@company.com');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
