import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ContactForm from "@/components/contact/ContactForm";
import ContactInfo from "@/components/contact/ContactInfo";

export const metadata: Metadata = {
  title: "Contact | BettaPay",
  description: "Get in touch with the BettaPay team for pricing, support, or partnership inquiries.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col">
      <Header />

      <main id="main-content" tabIndex={-1} className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Contact Us
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              Get in Touch
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              Have questions about BettaPay? Whether you are looking for enterprise pricing, technical support, or partnership opportunities, we are here to help.
            </p>
          </div>

          {/* Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start max-w-6xl mx-auto">
            {/* Form Column (Left on desktop, stacked on mobile) */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center p-12 border border-border bg-card/40 rounded-2xl min-h-[400px]">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-muted-foreground text-sm font-medium animate-pulse">
                      Loading contact form...
                    </p>
                  </div>
                }
              >
                <ContactForm />
              </Suspense>
            </div>

            {/* Info Sidebar Column (Right on desktop, stacked on mobile) */}
            <div className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-24">
              <ContactInfo />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
