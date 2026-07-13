import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Construction } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact | BettaPay',
  description: 'Get in touch with the BettaPay team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Construction className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Contact Us</h1>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Have questions or want to partner with us? Reach out to the BettaPay team.
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
