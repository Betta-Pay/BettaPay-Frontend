import { Transaction, mockTransactions as realTransactions } from './transactions';

export type DashboardTransaction = Transaction & {
  label: string;
  amount: number;
  time: string;
  address: string;
};

export const mockTransactions: DashboardTransaction[] = realTransactions.slice(0, 5).map((tx, i) => {
  const oldData = [
    { label: 'Consulting Retainer', amount: 750, time: '2m ago' },
    { label: 'E-commerce Payment', amount: 45.5, time: '18m ago' },
    { label: 'Invoice #1042', amount: 1200, time: '1h ago' },
    { label: 'Subscription Fee', amount: 29, time: '3h ago' },
    { label: 'Freelance Project', amount: 3500, time: '5h ago' },
  ];
  return {
    ...tx,
    ...oldData[i],
    amountUsdc: oldData[i].amount,
    address: tx.payerAddress.substring(0, 4) + '...' + tx.payerAddress.substring(tx.payerAddress.length - 4),
  };
});

export interface DashboardPaymentLink {
  id: string;
  label: string;
  url: string;
  clicks: number;
  converted: number;
}

export const mockPaymentLinks: DashboardPaymentLink[] = [
  { id: 'link_01', label: 'Consulting Retainer Q3', url: 'betta.pay/pay/link_01', clicks: 24, converted: 8 },
  { id: 'link_02', label: 'E-commerce Checkout', url: 'betta.pay/pay/link_02', clicks: 112, converted: 47 },
  { id: 'link_03', label: 'Donation Campaign', url: 'betta.pay/pay/link_03', clicks: 58, converted: 19 },
];
