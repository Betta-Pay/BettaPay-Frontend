import { render, screen } from '@testing-library/react';

import { PAYMENT_STATUS } from '@/lib/utils/constants';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders a success badge with the success label and green styling', () => {
    const { container } = render(<StatusBadge status={PAYMENT_STATUS.SUCCESS} />);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Success').closest('span')).toHaveClass('text-green-500');
  });

  it('renders a pending badge with the pending label and yellow styling', () => {
    const { container } = render(<StatusBadge status={PAYMENT_STATUS.PENDING} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Pending').closest('span')).toHaveClass('text-yellow-500');
  });

  it('renders a processing badge with the processing label and primary styling', () => {
    const { container } = render(<StatusBadge status={PAYMENT_STATUS.PROCESSING} />);

    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Processing').closest('span')).toHaveClass('text-primary');
  });

  it('renders a failed badge with the failed label and destructive styling', () => {
    const { container } = render(<StatusBadge status={PAYMENT_STATUS.FAILED} />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Failed').closest('span')).toHaveClass('text-destructive');
  });

  it('falls back to the provided status text when the status is unknown', () => {
    render(<StatusBadge status="custom" />);

    expect(screen.getByText('custom')).toBeInTheDocument();
    expect(screen.getByText('custom').closest('span')).toHaveClass('bg-muted');
  });

  it('adds the provided className to the badge', () => {
    render(<StatusBadge status={PAYMENT_STATUS.SUCCESS} className="custom-badge" />);

    expect(screen.getByText('Success').closest('span')).toHaveClass('custom-badge');
  });
});
