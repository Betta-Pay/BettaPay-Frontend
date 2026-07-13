import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Construction } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Payment Links | BettaPay',
  description: 'Create and share payment links to accept crypto payments instantly.',
};

export default function PaymentsPage() {
  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Construction className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Payment Links</h1>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Create shareable payment links that let customers pay you in USDC with one click.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Coming soon
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
