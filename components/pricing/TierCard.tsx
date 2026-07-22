import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TierCardProps {
  name: string;
  tagline: string;
  transactionFee: string;
  monthlyMinimum: string;
  volumeIncluded: string;
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
}

export function TierCard({
  name,
  tagline,
  transactionFee,
  monthlyMinimum,
  volumeIncluded,
  features,
  cta,
  highlighted = false,
}: TierCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col p-8 rounded-2xl bg-card border transition-all duration-200',
        highlighted
          ? 'border-primary shadow-lg shadow-primary/10'
          : 'border-border hover:border-primary/40 hover:shadow-md'
      )}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap">
          Most Popular
        </span>
      )}

      <h3 className="text-lg font-semibold text-foreground">{name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{tagline}</p>

      <div className="mt-6">
        <p className="text-3xl font-bold tracking-tight text-foreground">{transactionFee}</p>
        <p className="text-xs text-muted-foreground mt-1">per transaction</p>
      </div>

      <div className="mt-4 space-y-1 text-xs text-muted-foreground">
        <p>{monthlyMinimum}</p>
        <p>Volume: {volumeIncluded}</p>
      </div>

      <ul className="mt-6 space-y-3 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
            <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <Link href={cta.href} className="mt-8">
        <Button
          className={cn(
            'w-full h-11 rounded-xl font-semibold',
            highlighted
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
          )}
        >
          {cta.label}
        </Button>
      </Link>
    </div>
  );
}
