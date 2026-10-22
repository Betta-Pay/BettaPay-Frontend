import type { Metadata } from "next";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { SDKPlayground } from "@/components/sdks/SDKPlayground";
import { resolveAllSdkReleases } from "@/lib/sdks/registry";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "SDKs & Libraries | BettaPay",
  description:
    "Official client libraries for integrating BettaPay. Install for TypeScript, Python, PHP, Go, and Rust.",
};

// Versions are read from the package registries and cached for an hour.
export const revalidate = 3600;

export default async function SdksPage() {
  const releases = await resolveAllSdkReleases();

  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Official SDKs
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Pick a language, copy the quickstart, and run a live quote right here.
            </p>
          </div>

          <SDKPlayground releases={releases} />

          <div className="text-center border-t pt-8">
            <p className="text-muted-foreground mb-3">
              Don&apos;t see your language?
            </p>
            <a
              href="https://docs.bettapay.com/api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              View the raw API reference
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
