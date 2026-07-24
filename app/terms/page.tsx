import type { Metadata } from 'next';
import Header from '@/components/layout';
import Footer from '@/components/layout';
import Link from 'next/link';
import { FileText, ExternalLink, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | BettaPay',
  description: 'Terms and conditions governing the use of BettaPay platform, merchant payment infrastructure, APIs, and SEP-24 settlement services.',
};

const sections = [
  { id: 'acceptance-of-terms', title: '1. Acceptance of Terms' },
  { id: 'description-of-services', title: '2. Description of Services' },
  { id: 'merchant-obligations', title: '3. Merchant Obligations' },
  { id: 'fees-and-payment', title: '4. Fees & Payment' },
  { id: 'intellectual-property', title: '5. Intellectual Property' },
  { id: 'confidentiality', title: '6. Confidentiality' },
  { id: 'term-and-termination', title: '7. Term & Termination' },
  { id: 'warranty-disclaimer', title: '8. Warranty Disclaimer' },
  { id: 'limitation-of-liability', title: '9. Limitation of Liability' },
  { id: 'indemnification', title: '10. Indemnification' },
  { id: 'governing-law', title: '11. Governing Law' },
  { id: 'dispute-resolution', title: '12. Dispute Resolution' },
  { id: 'general-provisions', title: '13. General Provisions' },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* Hero Header */}
      <div className="bg-muted/40 border-b border-border py-12 md:py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <FileText className="w-3.5 h-3.5" />
            Merchant Agreement
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
            Please read these terms carefully before accessing or using BettaPay payment links, APIs, and settlement infrastructure.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border/60 pt-4">
            <span>Last Updated: July 23, 2026</span>
            <span>•</span>
            <span>Version 3.1</span>
            <span>•</span>
            <Link href="/privacy" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
              Privacy Policy <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* TOC Sidebar */}
          <aside className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-24 p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Table of Contents
              </h2>
              <nav aria-label="Table of contents">
                <ul className="space-y-2 text-xs font-medium">
                  {sections.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-muted-foreground hover:text-primary transition-colors block py-1 border-l-2 border-transparent hover:border-primary pl-3"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="pt-4 border-t border-border/60">
                <p className="text-xs text-muted-foreground">Legal inquiries?</p>
                <a
                  href="mailto:legal@bettapay.io"
                  className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1.5 mt-1"
                >
                  <Mail className="w-3.5 h-3.5" /> Contact Legal Team
                </a>
              </div>
            </div>
          </aside>

          {/* Policy Text Body */}
          <article className="lg:col-span-8 space-y-12 leading-relaxed text-foreground">
            
            <section id="acceptance-of-terms" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                1. Acceptance of Terms
              </h2>
              <p className="text-muted-foreground">
                By creating a merchant account, accessing our APIs, or utilizing BettaPay payment infrastructure, you (&quot;Merchant&quot; or &quot;User&quot;) agree to be legally bound by these Terms of Service. If you are entering into this agreement on behalf of a corporate entity, you represent that you possess full authority to bind such entity.
              </p>
            </section>

            <section id="description-of-services" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                2. Description of Services
              </h2>
              <p className="text-muted-foreground">
                BettaPay provides non-custodial digital payment gateway software, checkout interfaces, payment link generators, and SEP-24 Stellar anchor routing services. Our platform enables merchants to accept digital assets (including USDC and XLM) and automatically trigger fiat conversions into local currency bank accounts. BettaPay does not directly hold merchant funds or operate as a fractional reserve bank.
              </p>
            </section>

            <section id="merchant-obligations" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                3. Merchant Obligations
              </h2>
              <p className="text-muted-foreground">
                As a merchant utilizing our platform, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide accurate, complete, and verifiable KYC business identification data during onboarding.</li>
                <li>Comply with all applicable trade laws, export controls, and Anti-Money Laundering (AML) regulations.</li>
                <li>Refrain from using BettaPay for prohibited activities, including illegal gambling, unauthorized pharmaceuticals, counterfeit goods, or deceptive marketing.</li>
                <li>Maintain the strict security of your API keys, webhook signing secrets, and non-custodial wallet credentials.</li>
              </ul>
            </section>

            <section id="fees-and-payment" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                4. Fees & Payment
              </h2>
              <p className="text-muted-foreground">
                BettaPay charges transaction processing fees as specified in your merchant agreement or public pricing schedule. Platform fees and partner SEP-24 anchor conversion markups are deducted automatically at the moment of payment settlement. All fee schedules are transparently displayed prior to transaction execution.
              </p>
            </section>

            <section id="intellectual-property" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                5. Intellectual Property
              </h2>
              <p className="text-muted-foreground">
                All patents, trademarks, service marks, software codebases, documentation, logos, and UI designs associated with BettaPay remain the exclusive property of BettaPay Technologies Inc. Subject to compliance with these terms, we grant merchants a limited, revocable, non-exclusive license to integrate our APIs and display checkout badges.
              </p>
            </section>

            <section id="confidentiality" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                6. Confidentiality
              </h2>
              <p className="text-muted-foreground">
                Each party agrees to safeguard non-public information, proprietary source code, security credentials, and commercial terms disclosed by the other party with the same degree of care used for its own confidential assets.
              </p>
            </section>

            <section id="term-and-termination" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                7. Term & Termination
              </h2>
              <p className="text-muted-foreground">
                This agreement commences upon account registration and continues until terminated. Either party may terminate this agreement at any time with 30 days written notice. BettaPay reserves the right to immediately suspend or terminate account access in cases of suspected fraud, regulatory mandate, or material breach of terms.
              </p>
            </section>

            <section id="warranty-disclaimer" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                8. Warranty Disclaimer
              </h2>
              <p className="text-muted-foreground uppercase text-xs tracking-wider bg-muted/30 p-4 rounded-xl border border-border/50">
                The services, APIs, and payment links are provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee uninterrupted blockchain network connectivity.
              </p>
            </section>

            <section id="limitation-of-liability" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                9. Limitation of Liability
              </h2>
              <p className="text-muted-foreground">
                To the maximum extent permitted by law, BettaPay Technologies Inc. shall not be liable for indirect, incidental, punitive, or consequential damages, loss of profits, blockchain network congestion losses, or unauthorized key compromises. Our cumulative aggregate liability shall not exceed the fees paid by merchant to BettaPay in the preceding 6-month period.
              </p>
            </section>

            <section id="indemnification" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                10. Indemnification
              </h2>
              <p className="text-muted-foreground">
                Merchant agrees to defend, indemnify, and hold harmless BettaPay, its directors, officers, employees, and anchor partners against any third-party claims, damages, liabilities, or expenses arising from merchant&apos;s breach of these terms, illegal sales activity, or violation of consumer protection laws.
              </p>
            </section>

            <section id="governing-law" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                11. Governing Law
              </h2>
              <p className="text-muted-foreground">
                These terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without giving effect to conflicts of law principles.
              </p>
            </section>

            <section id="dispute-resolution" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                12. Dispute Resolution
              </h2>
              <p className="text-muted-foreground">
                Any controversy or claim arising out of or relating to this agreement shall be submitted to binding arbitration under the rules of the Lagos Court of Arbitration. Arbitral proceedings shall take place in English, and the award rendered shall be final and enforceable in any court of competent jurisdiction.
              </p>
            </section>

            <section id="general-provisions" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                13. General Provisions
              </h2>
              <p className="text-muted-foreground">
                If any provision of these terms is deemed unenforceable, the remaining provisions shall remain in full force. Failure to enforce any right does not constitute a waiver. These terms, together with our <Link href="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>, constitute the entire agreement between the parties.
              </p>
            </section>

          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
