import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GuideCard from '@/components/guides/GuideCard';

export const metadata: Metadata = {
  title: 'Integration Guides | BettaPay',
  description: 'Practical, step-by-step tutorials for integrating BettaPay payment links, APIs, webhooks, settlement, and testnet workflows.',
};

const guides = [
  {
    title: 'Accepting Your First Payment',
    description: 'Create a merchant account, configure Stellar testnet, publish a payment link, and verify a successful payment end to end.',
    href: '/guides/first-payment',
    time: '12 min',
    difficulty: 'Beginner' as const,
    tags: ['payment links', 'no-code', 'testnet'],
  },
  {
    title: 'Server-to-Server API Integration',
    description: 'Use backend code to create payment links, track lifecycle states, and reconcile BettaPay transactions safely.',
    href: '/guides/server-to-server',
    time: '18 min',
    difficulty: 'Intermediate' as const,
    tags: ['API', 'Node.js', 'reconciliation'],
  },
  {
    title: 'Webhook Handling',
    description: 'Build an idempotent webhook receiver with signature checks, replay protection, local testing, and retry-aware processing.',
    href: '/guides/webhook-handling',
    time: '16 min',
    difficulty: 'Intermediate' as const,
    tags: ['webhooks', 'security', 'events'],
  },
  {
    title: 'Fiat Settlement Configuration',
    description: 'Configure SEP-24-style fiat settlement preferences, map payout accounts, and monitor settlement status.',
    href: '/guides/fiat-settlement',
    time: '14 min',
    difficulty: 'Intermediate' as const,
    tags: ['settlement', 'SEP-24', 'operations'],
  },
  {
    title: 'Testing with Stellar Testnet',
    description: 'Run a repeatable development workflow with Freighter, Friendbot funding, Horizon checks, and safe environment separation.',
    href: '/guides/testnet-testing',
    time: '15 min',
    difficulty: 'Beginner' as const,
    tags: ['Stellar', 'Freighter', 'QA'],
  },
];

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-16">
        <section className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
              Developer tutorials
            </span>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Integration Guides</h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Practical, self-contained tutorials for the most common BettaPay integration paths. Each guide includes prerequisites,
              complete code examples, pitfalls, and next steps.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {guides.map((guide) => (
              <GuideCard key={guide.href} {...guide} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
