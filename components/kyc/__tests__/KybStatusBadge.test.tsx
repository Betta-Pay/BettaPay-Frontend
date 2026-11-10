import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KybStatusBadge, KybDocStatusBadge } from '../KybStatusBadge';

jest.mock('lucide-react', () => ({
  CheckCircle2: () => <svg data-testid="icon-check" />,
  Clock: () => <svg data-testid="icon-clock" />,
  FileUp: () => <svg data-testid="icon-file-up" />,
  XCircle: () => <svg data-testid="icon-x" />,
  CircleDashed: () => <svg data-testid="icon-dashed" />,
}));

describe('KybStatusBadge — rejection reason tooltip', () => {
  it('shows the compliance rejection reason tooltip on hover when status is rejected', () => {
    render(
      <KybStatusBadge
        status="rejected"
        reason="Certificate of incorporation is expired. Please upload a current copy."
      />,
    );

    const badgeText = screen.getByText('Action required');
    expect(badgeText).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    const trigger = badgeText.closest('[tabindex="0"]') as HTMLElement;
    expect(trigger).not.toBeNull();

    fireEvent.mouseEnter(trigger);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent(
      'Certificate of incorporation is expired. Please upload a current copy.',
    );

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('supports keyboard focus and Escape key dismissal for accessibility', () => {
    render(
      <KybStatusBadge
        status="rejected"
        reason="Director ID scan is blurry and unreadable."
      />,
    );

    const trigger = screen.getByText('Action required').closest('[tabindex="0"]') as HTMLElement;
    expect(trigger).toHaveAttribute('tabindex', '0');

    fireEvent.focus(trigger);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Director ID scan is blurry and unreadable.');
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not render a tooltip trigger when status is approved or reason is omitted', () => {
    const { rerender } = render(
      <KybStatusBadge status="approved" reason="Should not display" />,
    );

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.getByText('Verified').closest('[tabindex="0"]')).toBeNull();

    rerender(<KybDocStatusBadge status="rejected" reason="Document signature missing" />);
    const docTrigger = screen.getByText('Rejected').closest('[tabindex="0"]') as HTMLElement;
    fireEvent.focus(docTrigger);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Document signature missing');
  });
});
