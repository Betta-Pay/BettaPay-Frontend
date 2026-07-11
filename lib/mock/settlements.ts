export interface Settlement {
  id: string;
  amount: number;
  amountNgn: number;
  status: string;
  date: string;
  bank: string;
  accountNo: string;
  txHash?: string;
}

export const mockSettlements: Settlement[] = [
  { id: 'stl_01', amount: 12450.00, amountNgn: 19297500, status: 'completed', date: '2024-01-10', bank: 'GTBank', accountNo: '012****567', txHash: '0x1234567890abcdef1234567890abcdef12345678' },
  { id: 'stl_02', amount: 8200.50, amountNgn: 12710775, status: 'pending', date: '2024-01-12', bank: 'First Bank', accountNo: '302****814', txHash: '0xabcdef1234567890abcdef1234567890abcdef12' },
  { id: 'stl_03', amount: 5000.00, amountNgn: 7750000, status: 'completed', date: '2024-01-08', bank: 'GTBank', accountNo: '012****567' },
];
