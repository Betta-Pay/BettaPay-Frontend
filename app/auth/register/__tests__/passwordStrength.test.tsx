import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RegisterPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

jest.mock('@/lib/utils/announce', () => ({
  announce: jest.fn(),
}));

describe('RegisterPage password strength meter & live checklist (#933)', () => {
  it('evaluates password rules live and keeps Create Account disabled until all rules pass', () => {
    render(<RegisterPage />);

    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitButton = screen.getByRole('button', { name: /Create Account/i });

    expect(submitButton).toBeDisabled();
    expect(screen.getByTestId('rule-length')).toHaveAttribute('data-met', 'false');
    expect(screen.getByTestId('rule-uppercase')).toHaveAttribute('data-met', 'false');
    expect(screen.getByTestId('rule-number')).toHaveAttribute('data-met', 'false');
    expect(screen.getByTestId('rule-symbol')).toHaveAttribute('data-met', 'false');

    // Weak password (only length met)
    fireEvent.change(passwordInput, { target: { value: 'abcdefgh' } });
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent('Weak');
    expect(screen.getByTestId('rule-length')).toHaveAttribute('data-met', 'true');
    expect(submitButton).toBeDisabled();

    // Medium password (length + uppercase + number)
    fireEvent.change(passwordInput, { target: { value: 'Abcdefg1' } });
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent('Medium');
    expect(screen.getByTestId('rule-uppercase')).toHaveAttribute('data-met', 'true');
    expect(screen.getByTestId('rule-number')).toHaveAttribute('data-met', 'true');
    expect(submitButton).toBeDisabled();

    // Strong password (all 4 rules met)
    fireEvent.change(passwordInput, { target: { value: 'Abcdefg1!' } });
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent('Strong');
    expect(screen.getByTestId('rule-symbol')).toHaveAttribute('data-met', 'true');
    expect(submitButton).not.toBeDisabled();
  });
});
