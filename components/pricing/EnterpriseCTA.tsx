import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EnterpriseCTA() {
  return (
    <div className="rounded-2xl border border-border bg-muted p-10 lg:p-14 text-center">
      <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
        Need something different?
      </h2>
      <p className="mt-3 text-muted-foreground max-w-xl mx-auto leading-relaxed">
        High-volume platforms get custom fee structures, instant settlement, dedicated support,
        and contractual SLAs. Talk to our sales team about a plan built around your business.
      </p>
      <Link href="/contact?subject=enterprise-pricing" className="inline-block mt-8">
        <Button className="h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl">
          Contact Sales
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </Link>
    </div>
  );
}
