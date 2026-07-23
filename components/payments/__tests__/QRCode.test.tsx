import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QRCode, QRCodeModal } from '../QRCode';
import { useNotify } from '@/lib/hooks/useNotify';

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: jest.fn(() => ({
    success: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('QRCode Component', () => {
  const testUrl = 'https://betta.pay/pay/link_123';

  it('renders QR code canvas when value is provided', () => {
    const { container } = render(<QRCode value={testUrl} size={250} className="custom-qr" />);
    
    const wrapper = screen.getByRole('img');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('custom-qr');
    expect(wrapper).toHaveAttribute('aria-label', `QR code for ${testUrl}`);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('renders title in aria-label when title prop is provided', () => {
    render(<QRCode value={testUrl} title="Consulting Fee" />);
    
    const wrapper = screen.getByRole('img');
    expect(wrapper).toHaveAttribute('aria-label', 'QR code for Consulting Fee');
  });

  it('renders fallback when value is empty', () => {
    render(<QRCode value="" size={200} />);
    
    expect(screen.getByText('No link provided')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Empty QR Code');
  });
});

describe('QRCodeModal Component', () => {
  const testUrl = 'https://betta.pay/pay/link_456';
  const testTitle = 'E-commerce Checkout';
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal dialog content when open is true', () => {
    render(
      <QRCodeModal
        open={true}
        onOpenChange={mockOnOpenChange}
        value={testUrl}
        title={testTitle}
        amountUsdc={49.99}
      />
    );

    expect(screen.getByText(testTitle)).toBeInTheDocument();
    expect(screen.getByText(testUrl)).toBeInTheDocument();
    expect(screen.getByText('Amount: 49.99 USDC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PNG/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SVG/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Share/i })).toBeInTheDocument();
  });

  it('copies link to clipboard when copy button is clicked', async () => {
    const mockSuccess = jest.fn();
    (useNotify as jest.Mock).mockReturnValue({ success: mockSuccess, error: jest.fn() });

    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <QRCodeModal
        open={true}
        onOpenChange={mockOnOpenChange}
        value={testUrl}
        title={testTitle}
      />
    );

    const copyButton = screen.getByRole('button', { name: /Copy payment link/i });
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith(testUrl);
    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith('Payment link copied to clipboard');
    });
  });

  it('calls onOpenChange with false when Close button is clicked', () => {
    render(
      <QRCodeModal
        open={true}
        onOpenChange={mockOnOpenChange}
        value={testUrl}
      />
    );

    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
