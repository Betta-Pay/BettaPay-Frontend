import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GuideCard from "@/components/guides/GuideCard";
import { orderedGuides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Integration Guides | BettaPay",
  description:
    "Hands-on, self-contained tutorials for integrating BettaPay: accept your first payment, server-to-server APIs, webhooks, fiat settlement, and testnet testing.",
};

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container max-w-6xl py-12">
          {/* Page header */}
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Integration Guides
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
              Practical, opinionated tutorials that walk through real BettaPay
              integrations end to end — from your first payment link to
              production webhooks and fiat settlement. Each guide stands on its
              own and links to the{" "}
              <Link
                href="/docs"
                className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                API reference
              </Link>{" "}
              where you need the details.
            </p>
          </div>

          {/* Guide grid: 1 col mobile, 2 col tablet, 3 col desktop */}
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {orderedGuides.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-10 rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
            Looking for endpoint-level details? The{" "}
            <Link
              href="/docs"
              className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              API documentation
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>{" "}
            covers every request and response. These guides show you how to put
            those endpoints together.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
