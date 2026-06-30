export interface PaymentLink {
  id: string;
  label: string;
  type: 'open' | 'fixed';
  amount: number | null;
  currency: string;
  url: string;
  created: string;
}

export const mockLinks: PaymentLink[] = [
  { id: 'link_01', label: 'Consulting Retainer Q3', type: 'open', amount: null, currency: 'USDC', url: 'https://betta.pay/pay/link_01', created: '2023-10-25' },
  { id: 'link_02', label: 'E-commerce Checkout', type: 'fixed', amount: 45.50, currency: 'USDC', url: 'https://betta.pay/pay/link_02', created: '2023-10-24' },
  { id: 'link_03', label: 'Donation Campaign', type: 'open', amount: null, currency: 'USDC', url: 'https://betta.pay/pay/link_03', created: '2023-10-20' },
];
