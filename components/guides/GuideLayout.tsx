import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays, Clock, UserRound } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GuideProgress from './GuideProgress';
import GuideTOC, { type TocItem } from './GuideTOC';
import type { GuideDifficulty } from './GuideCard';

type GuideNav = {
  title: string;
  href: string;
};

type GuideLayoutProps = {
  title: string;
  subtitle: string;
  difficulty: GuideDifficulty;
  time: string;
  author?: string;
  updated: string;
  toc: TocItem[];
  previous?: GuideNav;
  next?: GuideNav;
  children: ReactNode;
};

const difficultyClass: Record<GuideDifficulty, string> = {
  Beginner: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  Intermediate: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  Advanced: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
};

export default function GuideLayout({
  title,
  subtitle,
  difficulty,
  time,
  author = 'BettaPay Developer Relations',
  updated,
  toc,
  previous,
  next,
  children,
}: GuideLayoutProps) {
  return (
    <div className="min-h-screen bg-card text-foreground">
      <GuideProgress />
      <Header />
      <main className="px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <Link href="/guides" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to guides
          </Link>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
            <article className="min-w-0 rounded-3xl border border-border bg-background p-6 shadow-sm md:p-10">
              <header className="border-b border-border pb-8">
                <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${difficultyClass[difficulty]}`}>{difficulty}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{time}</span>
                  <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4" />{author}</span>
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Updated {updated}</span>
                </div>
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{subtitle}</p>
              </header>
              <div className="guide-content prose prose-slate mt-8 max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:border prose-pre:border-border prose-pre:bg-muted/60 prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0">
                {children}
              </div>
              <footer className="mt-12 grid gap-4 border-t border-border pt-8 sm:grid-cols-2">
                {previous ? (
                  <Link href={previous.href} className="rounded-2xl border border-border p-4 text-sm hover:border-primary/40 hover:bg-muted">
                    <span className="mb-1 inline-flex items-center gap-2 text-muted-foreground"><ArrowLeft className="h-4 w-4" />Previous</span>
                    <strong className="block text-foreground">{previous.title}</strong>
                  </Link>
                ) : <div />}
                {next ? (
                  <Link href={next.href} className="rounded-2xl border border-border p-4 text-right text-sm hover:border-primary/40 hover:bg-muted">
                    <span className="mb-1 inline-flex items-center justify-end gap-2 text-muted-foreground">Next<ArrowRight className="h-4 w-4" /></span>
                    <strong className="block text-foreground">{next.title}</strong>
                  </Link>
                ) : null}
              </footer>
            </article>
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <GuideTOC items={toc} />
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
