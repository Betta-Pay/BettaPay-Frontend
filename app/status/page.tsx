"use client";

import Header from "@/components/layout";
import Footer from "@/components/layout";
import { OverallBanner } from "@/components/status/OverallBanner";
import { ComponentStatusGrid } from "@/components/status/ComponentStatus";
import { IncidentTimeline } from "@/components/status/IncidentTimeline";
import { SubscribeForm } from "@/components/status/SubscribeForm";
import {
  mockComponents,
  mockIncidents,
  getOverallStatus,
} from "@/lib/status/data";

export default function StatusPage() {
  const overall = getOverallStatus(mockComponents);

  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              System Status
            </h1>
            <p className="text-muted-foreground">
              Real-time monitoring and incident history for all BettaPay
              services.
            </p>
          </div>

          <OverallBanner status={overall.level} label={overall.label} />

          <section aria-labelledby="components-heading">
            <h2
              id="components-heading"
              className="text-lg font-semibold text-foreground mb-4"
            >
              Services
            </h2>
            <ComponentStatusGrid components={mockComponents} />
          </section>

          <section aria-labelledby="incidents-heading">
            <h2
              id="incidents-heading"
              className="text-lg font-semibold text-foreground mb-4"
            >
              Incident History
            </h2>
            <IncidentTimeline incidents={mockIncidents} />
          </section>

          <section aria-labelledby="subscribe-heading" className="space-y-3">
            <h2
              id="subscribe-heading"
              className="text-lg font-semibold text-foreground"
            >
              Subscribe to Updates
            </h2>
            <SubscribeForm />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
