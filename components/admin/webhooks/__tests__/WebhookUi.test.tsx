import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryStatusBadge } from '../DeliveryStatusBadge';
import { UrlValidator } from '../DevTools';

describe('DeliveryStatusBadge', () => {
  it('labels a 2xx as delivered and shows the code', () => {
    render(<DeliveryStatusBadge status="delivered" statusCode={200} />);
    expect(screen.getByText(/Delivered · 200/)).toBeInTheDocument();
  });

  it('labels failures in text (not colour alone), including no-response timeouts', () => {
    const { rerender } = render(<DeliveryStatusBadge status="failed" statusCode={500} />);
    expect(screen.getByText(/Failed · 500/)).toBeInTheDocument();
    rerender(<DeliveryStatusBadge status="failed" statusCode={null} />);
    expect(screen.getByText(/Failed · —/)).toBeInTheDocument();
    rerender(<DeliveryStatusBadge status="dead" statusCode={503} />);
    expect(screen.getByText(/Dead · 503/)).toBeInTheDocument();
  });
});

describe('UrlValidator', () => {
  it('flags private targets and accepts public https', async () => {
    const user = userEvent.setup();
    render(<UrlValidator />);
    const input = screen.getByLabelText('Target URL');

    await user.type(input, 'https://169.254.169.254/latest');
    expect(screen.getByRole('status')).toHaveTextContent(/blocked/i);

    await user.clear(input);
    await user.type(input, 'https://hooks.example.com/bp');
    expect(screen.getByRole('status')).toHaveTextContent(/looks good/i);
  });
});
