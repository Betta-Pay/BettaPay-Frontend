import { render, screen } from '@testing-library/react';

import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../card';

describe('Card', () => {
  it('renders the header, title, description, and action sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Payment details</CardTitle>
          <CardDescription>Review the payment details before continuing.</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
      </Card>
    );

    expect(screen.getByText('Payment details')).toBeInTheDocument();
    expect(screen.getByText('Review the payment details before continuing.')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Payment details').closest('[data-slot="card-header"]')).toBeInTheDocument();
  });

  it('renders content and footer sections', () => {
    render(
      <Card>
        <CardContent>Body content</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>
    );

    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByText('Footer content')).toBeInTheDocument();
    expect(screen.getByText('Body content').closest('[data-slot="card-content"]')).toBeInTheDocument();
    expect(screen.getByText('Footer content').closest('[data-slot="card-footer"]')).toBeInTheDocument();
  });

  it('applies the card data attributes and size prop', () => {
    render(<Card size="sm" data-testid="payment-card" />);

    const card = screen.getByTestId('payment-card');

    expect(card).toHaveAttribute('data-slot', 'card');
    expect(card).toHaveAttribute('data-size', 'sm');
  });

  it('renders title with the correct semantic element', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle as="h3">Account overview</CardTitle>
        </CardHeader>
      </Card>
    );

    const title = screen.getByRole('heading', { level: 3, name: /account overview/i });

    expect(title).toHaveAttribute('data-slot', 'card-title');
  });
});
