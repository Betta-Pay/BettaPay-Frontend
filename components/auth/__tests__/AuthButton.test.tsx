import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthButton } from '@/components/auth/AuthButton';

describe('AuthButton — Maintain width when showing spinner (#889)', () => {
  it('renders normally when isLoading is false', () => {
    render(<AuthButton>Sign In</AuthButton>);

    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(screen.getByTestId('auth-button-label')).not.toHaveClass(
      'opacity-0'
    );
    expect(screen.queryByTestId('auth-button-spinner')).not.toBeInTheDocument();
  });

  it('keeps label in DOM with opacity-0, overlays centered spinner, and sets disabled and aria-busy="true" when isLoading={true}', () => {
    render(<AuthButton isLoading={true}>Sign In</AuthButton>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    // Label remains in DOM with opacity-0 so button width never collapses
    const label = screen.getByTestId('auth-button-label');
    expect(label).toHaveTextContent('Sign In');
    expect(label).toHaveClass('opacity-0');

    // Spinner overlay is centered via absolute inset-0
    const spinner = screen.getByTestId('auth-button-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('absolute', 'inset-0');
  });
});
