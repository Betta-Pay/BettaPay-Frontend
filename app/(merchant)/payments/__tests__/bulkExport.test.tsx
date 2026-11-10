import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PaymentsPage from '../page';

const mockNotifySuccess = jest.fn();

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({
    success: mockNotifySuccess,
    info: jest.fn(),
    error: jest.fn(),
  }),
}));

const sampleLinks = [
  {
    id: 'lnk_1',
    txHash: null,
    payerAddress: null,
    merchantId: 'm_1',
    amountUsdc: 250,
    amountNgn: 400000,
    fxRate: 1600,
    status: 'active',
    source: 'Retainer Link',
    createdAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'lnk_2',
    txHash: null,
    payerAddress: null,
    merchantId: 'm_1',
    amountUsdc: 500,
    amountNgn: 800000,
    fxRate: 1600,
    status: 'active',
    source: 'Enterprise Plan',
    createdAt: '2026-03-02T12:00:00.000Z',
  },
];

jest.mock('@/lib/api/hooks', () => ({
  usePayments: () => ({
    data: sampleLinks,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe('PaymentsPage bulk selection and CSV export (#929)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn(() => 'blob:mock-csv-url');
    URL.revokeObjectURL = jest.fn();
  });

  it('allows selecting individual or all payment links and exporting them to CSV', () => {
    render(<PaymentsPage />);

    const exportBtn = screen.getByRole('button', { name: /Export Selected Links/i });
    expect(exportBtn).toBeDisabled();

    // Select single link
    const firstCheckbox = screen.getByLabelText('Select Retainer Link');
    fireEvent.click(firstCheckbox);
    expect(exportBtn).not.toBeDisabled();
    expect(exportBtn).toHaveTextContent('Export Selected Links (1)');

    // Select all links
    const selectAllCheckbox = screen.getByLabelText('Select all payment links');
    fireEvent.click(selectAllCheckbox);
    expect(exportBtn).toHaveTextContent('Export Selected Links (2)');

    fireEvent.click(exportBtn);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(mockNotifySuccess).toHaveBeenCalledWith(
      expect.stringMatching(/Exported 2 payment link\(s\) to CSV/i),
    );
  });
});
