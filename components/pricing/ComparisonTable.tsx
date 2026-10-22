'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

type ComparisonColumn = 'category' | 'feature' | 'bettapay' | 'paystack' | 'flutterwave' | 'stripe';
type ComparisonEntry = Record<ComparisonColumn, string>;

const COMPARISON_DATA: ComparisonEntry[] = [
  {
    category: 'Pricing',
    feature: 'Transaction fees',
    bettapay: 'Starter: 1.5% + $0.10; Growth: 1.0% + $0.05; Enterprise: custom',
    paystack: 'Nigeria local: 1.5% + ₦100 (capped at ₦2,000; ₦100 waived under ₦2,500)',
    flutterwave: 'Nigeria local: 2% per transaction',
    stripe: 'Varies by merchant country, payment method, and currency',
  },
  {
    category: 'Pricing',
    feature: 'Monthly minimum or platform fee',
    bettapay: 'No monthly minimum on Starter; Growth includes first $10,000 monthly volume',
    paystack: 'No monthly fee listed for standard transaction pricing',
    flutterwave: 'Not listed on public pricing page',
    stripe: 'No setup or monthly fees on standard pricing',
  },
  {
    category: 'Payout Speed',
    feature: 'Settlement timing',
    bettapay: 'Starter: T+1; Growth: same day; Enterprise: instant',
    paystack: 'Automatic settlement within 24 hours',
    flutterwave: 'Local payments: next business day',
    stripe: 'Varies by country and payout schedule',
  },
  {
    category: 'Payout Speed',
    feature: 'Payout destination',
    bettapay: 'Nigerian bank account in NGN, or hold balance in USDC',
    paystack: 'Bank settlement; destination and currency depend on market',
    flutterwave: 'Bank account or mobile money, depending on market',
    stripe: 'Bank account or supported payout method, depending on market',
  },
  {
    category: 'Payment Methods',
    feature: 'Payment rails',
    bettapay: 'USDC payments on the Stellar network',
    paystack: 'Cards, bank transfer, USSD, and other local channels',
    flutterwave: 'Cards, bank transfer, USSD, POS, and local methods by market',
    stripe: 'Cards, wallets, and 100+ payment methods across supported markets',
  },
  {
    category: 'Features',
    feature: 'Payment links and QR codes',
    bettapay: 'Included on Starter, Growth, and Enterprise',
    paystack: 'Payment Pages and payment links available',
    flutterwave: 'Payment links available',
    stripe: 'Payment Links available',
  },
  {
    category: 'Features',
    feature: 'Webhooks and API access',
    bettapay: 'Growth and Enterprise',
    paystack: 'API and webhooks available',
    flutterwave: 'API and webhooks available',
    stripe: 'API and webhooks available',
  },
  {
    category: 'Features',
    feature: 'Recurring payments',
    bettapay: 'Automate recurring billing with Growth and Enterprise API access',
    paystack: 'Subscriptions available',
    flutterwave: 'Payment plans available',
    stripe: 'Stripe Billing subscriptions available',
  },
];

const CATEGORIES = ['All categories', ...Array.from(new Set(COMPARISON_DATA.map((row) => row.category)))];
const COLUMNS: { key: ComparisonColumn; label: string }[] = [
  { key: 'category', label: 'Category' },
  { key: 'feature', label: 'Feature' },
  { key: 'bettapay', label: 'BettaPay' },
  { key: 'paystack', label: 'Paystack' },
  { key: 'flutterwave', label: 'Flutterwave' },
  { key: 'stripe', label: 'Stripe' },
];

const SOURCES = [
  { label: 'BettaPay pricing', href: '/pricing' },
  { label: 'Paystack pricing', href: 'https://paystack.com/pricing' },
  { label: 'Flutterwave pricing', href: 'https://flutterwave.com/ng/pricing' },
  { label: 'Stripe pricing', href: 'https://stripe.com/pricing' },
];

export function ComparisonTable() {
  const [category, setCategory] = useState('All categories');
  const [query, setQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<ComparisonColumn>('category');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return COMPARISON_DATA.filter((row) => {
      const matchesCategory = category === 'All categories' || row.category === category;
      const matchesQuery =
        !normalizedQuery || Object.values(row).some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    }).sort((left, right) => {
      const result = left[sortColumn].localeCompare(right[sortColumn], undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortDirection === 'asc' ? result : -result;
    });
  }, [category, query, sortColumn, sortDirection]);

  const sortBy = (column: ComparisonColumn) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Search comparison</span>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search features or providers..."
            aria-label="Search comparison"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 rounded-lg border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filter comparison by category"
          >
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {rows.length} of {COMPARISON_DATA.length} comparisons
      </p>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[980px] text-left">
          <caption className="sr-only">
            BettaPay pricing and features compared with Paystack, Flutterwave, and Stripe
          </caption>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {COLUMNS.map(({ key, label }) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={sortColumn === key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="p-4 text-sm font-semibold text-foreground"
                >
                  <button
                    type="button"
                    onClick={() => sortBy(key)}
                    className="inline-flex items-center gap-1.5 text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {label}
                    {sortColumn === key ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  {COLUMNS.map(({ key }) => (
                    <td
                      key={key}
                      className={`p-4 text-sm ${key === 'feature' ? 'font-medium text-foreground' : 'text-muted-foreground'} ${key === 'bettapay' ? 'bg-primary/[0.03]' : ''}`}
                    >
                      {row[key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={COLUMNS.length} className="p-8 text-center text-sm text-muted-foreground">
                  No comparisons match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Competitor prices and availability depend on country, payment method, and account terms. Check each provider&apos;s current terms before making a decision.</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          Sources:{' '}
          {SOURCES.map((source) => (
            <a
              key={source.label}
              href={source.href}
              target={source.href.startsWith('http') ? '_blank' : undefined}
              rel={source.href.startsWith('http') ? 'noreferrer' : undefined}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {source.label}
            </a>
          ))}
        </p>
      </div>
    </div>
  );
}
