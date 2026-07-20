import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  Clock,
  User,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import GuideProgress from "@/components/guides/GuideProgress";
import GuideTOC from "@/components/guides/GuideTOC";
import {
  difficultyBadgeStyles,
  getAdjacentGuides,
  getGuide,
  type GuideMeta,
} from "@/lib/guides";

const difficultyLabel: Record<GuideMeta["difficulty"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Format an ISO date (YYYY-MM-DD) as "Jul 19, 2026" deterministically, avoiding
 * locale/timezone-driven hydration mismatches between server and client.
 */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const monthName = MONTHS[(month ?? 1) - 1] ?? "";
  return `${monthName} ${day}, ${year}`;
}

const CONTENT_ID = "guide-content";

/**
 * Article shell shared by every guide page: header (title, subtitle, difficulty,
 * author, last-updated, reading time), sticky table of contents, reading
 * progress bar, the guide body, and previous/next navigation.
 *
 * Pass the guide's `slug`; all metadata and adjacent-guide links are resolved
 * from the central manifest in lib/guides.ts.
 */
export default function GuideLayout({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const guide = getGuide(slug);
  if (!guide) {
    throw new Error(
      `GuideLayout: no guide found for slug "${slug}". Add it to lib/guides.ts.`
    );
  }
  const { prev, next } = getAdjacentGuides(slug);

  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col">
      <GuideProgress />
      <Header />

      <main className="flex-1">
        <div className="container max-w-6xl py-10">
          {/* Back to listing */}
          <Link
            href="/guides"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            All guides
          </Link>

          {/* Article header */}
          <header className="mt-6 border-b border-border pb-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  difficultyBadgeStyles[guide.difficulty]
                )}
              >
                {difficultyLabel[guide.difficulty]}
              </Badge>
              {guide.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted px-2 py-0.5 font-mono text-[0.7rem] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {guide.title}
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              {guide.subtitle}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {guide.author}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Updated {formatDate(guide.lastUpdated)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {guide.readingTime} read
              </span>
            </div>
          </header>

          {/* Body + TOC. TOC is source-first so it renders as a drawer at the
              top on mobile, and grid-placed into the right column on desktop. */}
          <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
            <aside className="mb-6 lg:mb-0 lg:col-start-2 lg:row-start-1">
              <GuideTOC containerId={CONTENT_ID} />
            </aside>

            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <article id={CONTENT_ID}>{children}</article>

              {/* Previous / Next navigation */}
              <nav className="mt-12 grid gap-4 border-t border-border pt-8 sm:grid-cols-2">
                {prev ? (
                  <Link
                    href={prev.href}
                    className="group flex flex-col rounded-xl border border-border p-4 transition-colors hover:border-primary/30 hover:bg-muted/40"
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Previous
                    </span>
                    <span className="mt-1 font-medium text-foreground group-hover:text-primary">
                      {prev.title}
                    </span>
                  </Link>
                ) : (
                  <span aria-hidden className="hidden sm:block" />
                )}
                {next ? (
                  <Link
                    href={next.href}
                    className="group flex flex-col items-end rounded-xl border border-border p-4 text-right transition-colors hover:border-primary/30 hover:bg-muted/40"
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      Next
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    <span className="mt-1 font-medium text-foreground group-hover:text-primary">
                      {next.title}
                    </span>
                  </Link>
                ) : (
                  <span aria-hidden className="hidden sm:block" />
                )}
              </nav>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
