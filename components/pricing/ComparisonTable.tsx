import { Check, Minus } from 'lucide-react';

type CellValue = string | boolean;

interface FeatureRow {
  feature: string;
  starter: CellValue;
  growth: CellValue;
  enterprise: CellValue;
}

const FEATURE_ROWS: FeatureRow[] = [
  { feature: 'Transaction fee', starter: '1.5% + $0.10', growth: '1.0% + $0.05', enterprise: 'Custom' },
  { feature: 'Monthly volume included', starter: 'Pay per transaction', growth: '$10,000', enterprise: 'Unlimited' },
  { feature: 'Settlement speed', starter: 'Standard (T+1)', growth: 'Priority (same day)', enterprise: 'Instant' },
  { feature: 'Support level', starter: 'Email', growth: 'Priority', enterprise: 'Dedicated' },
  { feature: 'Webhooks', starter: false, growth: true, enterprise: true },
  { feature: 'API rate limits', starter: '60 req/min', growth: '300 req/min', enterprise: 'Custom' },
  { feature: 'Custom branding', starter: false, growth: true, enterprise: true },
  { feature: 'Multi-user access', starter: false, growth: false, enterprise: true },
  { feature: 'Audit logs', starter: false, growth: false, enterprise: true },
  { feature: 'Uptime SLA', starter: false, growth: false, enterprise: true },
  { feature: 'Dedicated account manager', starter: false, growth: false, enterprise: true },
];

function Cell({ value }: { value: CellValue }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check aria-label="Included" className="w-4 h-4 text-primary mx-auto" />
    ) : (
      <Minus aria-label="Not included" className="w-4 h-4 text-muted-foreground/40 mx-auto" />
    );
  }
  return <span className="text-sm text-foreground">{value}</span>;
}

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-left">
        <caption className="sr-only">Feature comparison across BettaPay pricing tiers</caption>
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th scope="col" className="p-4 text-sm font-semibold text-foreground w-1/3">
              Features
            </th>
            <th scope="col" className="p-4 text-sm font-semibold text-foreground text-center">
              Starter
            </th>
            <th scope="col" className="p-4 text-sm font-semibold text-primary text-center">
              Growth
            </th>
            <th scope="col" className="p-4 text-sm font-semibold text-foreground text-center">
              Enterprise
            </th>
          </tr>
        </thead>
        <tbody>
          {FEATURE_ROWS.map((row) => (
            <tr key={row.feature} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
              <th scope="row" className="p-4 text-sm font-medium text-muted-foreground">
                {row.feature}
              </th>
              <td className="p-4 text-center"><Cell value={row.starter} /></td>
              <td className="p-4 text-center bg-primary/[0.03]"><Cell value={row.growth} /></td>
              <td className="p-4 text-center"><Cell value={row.enterprise} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
