/* eslint-disable react/display-name, @typescript-eslint/no-explicit-any */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettlementPage from '@/app/(merchant)/settlement/page';

const mockMutateAsync = jest.fn();
let mockBankAccount: any = null;

jest.mock('@/lib/store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'merchant_123',
      email: 'merchant@example.com',
      name: 'Test Merchant',
    },
  }),
}));

jest.mock('@/lib/store/walletStore', () => ({
  useWalletStore: (selector: any) =>
    selector({
      network: 'testnet',
    }),
}));

jest.mock('@/lib/store/offlineStore', () => ({
  useOfflineStore: (selector: any) =>
    selector({
      isOnline: true,
    }),
}));

const mockNotify = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => mockNotify,
}));

jest.mock('@/lib/api/hooks', () => ({
  useSettlements: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useMerchantBankAccount: () => ({
    data: mockBankAccount,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateMerchantBankAccount: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

jest.mock('next/link', () => {
  return ({ children, href }: React.PropsWithChildren<{ href?: string }>) => {
    return <a href={href}>{children}</a>;
  };
});

describe('SettlementPage Bank Account Validation (Issue #1107)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBankAccount = null;
  });

  it('renders unconfigured notice and opens bank configuration dialog', () => {
    render(<SettlementPage />);

    expect(screen.getByText('Nigerian Bank Account Not Configured')).toBeInTheDocument();
    const configBtn = screen.getByRole('button', { name: /configure bank account/i });
    expect(configBtn).toBeInTheDocument();

    fireEvent.click(configBtn);

    expect(screen.getByRole('heading', { name: /configure bank account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/account holder name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bank \/ sort code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account number \/ iban/i)).toBeInTheDocument();
  });

  it('blocks submission with empty required fields and renders inline error text', async () => {
    render(<SettlementPage />);

    fireEvent.click(screen.getByRole('button', { name: /configure bank account/i }));

    const saveBtn = screen.getByRole('button', { name: /save bank account/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Account holder name is required')).toBeInTheDocument();
      expect(screen.getByText('Bank name is required')).toBeInTheDocument();
      expect(screen.getByText('Bank code / routing number is required')).toBeInTheDocument();
      expect(screen.getByText('Account number is required')).toBeInTheDocument();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('blocks malformed account number and invalid routing code with inline errors', async () => {
    render(<SettlementPage />);

    fireEvent.click(screen.getByRole('button', { name: /configure bank account/i }));

    fireEvent.change(screen.getByLabelText(/account holder name/i), {
      target: { value: 'Acme Corp' },
    });
    fireEvent.change(screen.getByLabelText(/bank name/i), {
      target: { value: 'Zenith Bank' },
    });
    fireEvent.change(screen.getByLabelText(/bank \/ sort code/i), {
      target: { value: '12' }, // invalid: must be 3-11 chars
    });
    fireEvent.change(screen.getByLabelText(/account number \/ iban/i), {
      target: { value: '123' }, // invalid: not 10 digits or valid IBAN
    });

    fireEvent.click(screen.getByRole('button', { name: /save bank account/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Bank code must be 3–11 alphanumeric characters.')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Invalid account number or IBAN format. Account numbers must be 10 digits or valid IBAN (15–34 characters).'
        )
      ).toBeInTheDocument();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('invokes the bank-account mutation cleanly on valid submission', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      bankName: 'Zenith Bank',
      bankCode: '058',
      accountNumber: '0123456789',
      accountName: 'Acme Corp',
    });

    render(<SettlementPage />);

    fireEvent.click(screen.getByRole('button', { name: /configure bank account/i }));

    fireEvent.change(screen.getByLabelText(/account holder name/i), {
      target: { value: '  Acme Corp  ' },
    });
    fireEvent.change(screen.getByLabelText(/bank name/i), {
      target: { value: '  Zenith Bank  ' },
    });
    fireEvent.change(screen.getByLabelText(/bank \/ sort code/i), {
      target: { value: '  058  ' },
    });
    fireEvent.change(screen.getByLabelText(/account number \/ iban/i), {
      target: { value: '  0123456789  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save bank account/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        bankName: 'Zenith Bank',
        bankCode: '058',
        accountNumber: '0123456789',
        accountName: 'Acme Corp',
      });
    });

    expect(mockNotify.success).toHaveBeenCalledWith(
      'Bank account details saved successfully'
    );
  });

  it('renders active bank account card and pre-fills modal when editing', () => {
    mockBankAccount = {
      bankName: 'GTBank',
      bankCode: '058',
      accountNumber: '1234567890',
      accountName: 'Acme Corp',
    };

    render(<SettlementPage />);

    expect(screen.getByText('Primary Payout Bank Account Active')).toBeInTheDocument();
    expect(screen.getByText(/GTBank · ••••7890 · Instant NIBSS/)).toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: /edit bank details/i });
    fireEvent.click(editBtn);

    expect(screen.getByLabelText(/account holder name/i)).toHaveValue('Acme Corp');
    expect(screen.getByLabelText(/bank name/i)).toHaveValue('GTBank');
    expect(screen.getByLabelText(/bank \/ sort code/i)).toHaveValue('058');
    expect(screen.getByLabelText(/account number \/ iban/i)).toHaveValue('1234567890');
  });
});
