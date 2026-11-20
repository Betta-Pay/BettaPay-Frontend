import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignatureVerifier } from '../SignatureVerifier';

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

describe('SignatureVerifier', () => {
  it('verifies the generated sample signature', async () => {
    render(<SignatureVerifier />);

    fireEvent.click(screen.getByRole('button', { name: /Simulate signed webhook/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Signature verified');
    });
  });

  it('shows a mismatch with the first differing character for a tampered payload', async () => {
    render(<SignatureVerifier />);

    fireEvent.click(screen.getByRole('button', { name: /Simulate tampered payload/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Signature mismatch');
    });
    expect(screen.getByRole('status')).toHaveTextContent(/First differing character:/);
  });
});
