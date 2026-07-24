import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/components/ui/button', () => jest.requireActual('../button'));

import { Button } from '@/components/ui';

describe('Button', () => {
  it('renders a default button with accessible text', () => {
    render(<Button>Continue</Button>);

    const button = screen.getByRole('button', { name: /continue/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-slot', 'button');
    expect(button).toHaveClass('bg-primary');
  });

  it('applies the outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>);

    expect(screen.getByRole('button', { name: /outline/i })).toHaveClass('border-border');
  });

  it('applies the ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);

    expect(screen.getByRole('button', { name: /ghost/i })).toHaveClass('hover:bg-muted');
  });

  it('applies the destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);

    expect(screen.getByRole('button', { name: /delete/i })).toHaveClass('text-destructive');
  });

  it('handles button click interactions', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button', { name: /click me/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire click handlers when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    const button = screen.getByRole('button', { name: /disabled/i });

    await user.click(button);

    expect(button).toBeDisabled();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('supports aria-invalid and custom data attributes', () => {
    render(
      <Button aria-invalid="true" data-testid="custom-button">
        Invalid
      </Button>
    );

    const button = screen.getByTestId('custom-button');

    expect(button).toHaveAttribute('aria-invalid', 'true');
    expect(button).toHaveClass('aria-invalid:border-destructive');
  });
});
