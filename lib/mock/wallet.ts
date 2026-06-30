export interface WalletTx {
  id: string;
  type: 'receive' | 'send';
  label: string;
  amount: number;
  time: string;
}

export const mockTxHistory: WalletTx[] = [
  { id: 'w1', type: 'receive', label: 'Payment from link_02', amount: 45.5, time: '2h ago' },
  { id: 'w2', type: 'receive', label: 'Payment from link_01', amount: 750, time: '5h ago' },
  { id: 'w3', type: 'send', label: 'Settlement to GTBank', amount: 1200, time: 'Yesterday' },
  { id: 'w4', type: 'receive', label: 'Payment from link_03', amount: 29, time: 'Yesterday' },
];
