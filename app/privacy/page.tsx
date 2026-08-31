import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { Shield, ArrowRight, Mail, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | BettaPay',
  description: 'Comprehensive GDPR and NDPR compliant Privacy Policy detailing data collection, usage, rights, and security measures at BettaPay.',
};

const sections = [
  { id: 'data-controller', title: '1. Data Controller' },
  { id: 'data-collected', title: '2. Data We Collect' },
  { id: 'how-we-use-data', title: '3. How We Use Data' },
  { id: 'legal-basis', title: '4. Legal Basis for Processing' },
  { id: 'data-sharing', title: '5. Data Sharing & Third Parties' },
  { id: 'international-transfers', title: '6. International Data Transfers' },
  { id: 'data-retention', title: '7. Data Retention' },
  { id: 'your-rights', title: '8. Your Rights' },
  { id: 'cookies-tracking', title: '9. Cookies & Tracking' },
  { id: 'security-measures', title: '10. Security Measures' },
  { id: 'childrens-privacy', title: "11. Children's Privacy" },
  { id: 'changes-to-policy', title: '12. Changes to Policy' },
  { id: 'contact-us', title: '13. Contact Us (DPO)' },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      {/* Hero Header */}
      <div className="bg-muted/40 border-b border-border py-12 md:py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <Shield className="w-3.5 h-3.5" />
            Legal & Compliance
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
            BettaPay is committed to protecting your privacy and ensuring transparent handling of your data in accordance with GDPR and NDPR guidelines.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border/60 pt-4">
            <span>Last Updated: July 23, 2026</span>
            <span>•</span>
            <span>Version 2.4</span>
            <span>•</span>
            <Link href="/terms" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
              Terms of Service <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Layout with Sidebar */}
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
                <p className="text-xs text-muted-foreground">Need clarification?</p>
                <a
                  href="mailto:dpo@bettapay.io"
                  className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1.5 mt-1"
                >
                  <Mail className="w-3.5 h-3.5" /> Email DPO
                </a>
              </div>
            </div>
          </aside>

          {/* Policy Text Body */}
          <article className="lg:col-span-8 space-y-12 leading-relaxed text-foreground">
            
            <section id="data-controller" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                1. Data Controller
              </h2>
              <p className="text-muted-foreground">
                BettaPay Technologies Inc. (&quot;BettaPay&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) serves as the data controller responsible for personal information collected through our web applications, APIs, payment link infrastructure, and decentralized Stellar network integration tools.
              </p>
              <address className="not-italic text-sm bg-muted/30 p-4 rounded-xl border border-border/50 text-muted-foreground">
                <strong className="text-foreground">BettaPay Technologies Inc.</strong><br />
                Attn: Data Protection Officer (DPO)<br />
                100 Stellar Way, Financial District, Lagos, Nigeria<br />
                Email: <a href="mailto:dpo@bettapay.io" className="text-primary hover:underline font-mono">dpo@bettapay.io</a>
              </address>
            </section>

            <section id="data-collected" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                2. Data We Collect
              </h2>
              <p className="text-muted-foreground">
                We collect personal information necessary to deliver compliant non-custodial crypto-to-fiat merchant payment services:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Account & Merchant Profile Data:</strong> Full name, business registration number, email address, phone number, physical address, and bank account details for settlement.</li>
                <li><strong className="text-foreground">Identity & KYC Information:</strong> Government-issued identification documents, utility bills, and facial verification images collected during merchant onboarding.</li>
                <li><strong className="text-foreground">Blockchain & Transaction Data:</strong> Public Stellar wallet addresses, payment hashes, transaction amounts, timestamps, and destination bank account identifiers.</li>
                <li><strong className="text-foreground">Technical & Usage Data:</strong> IP addresses, browser specifications, operating system versions, access timestamps, and API key activity logs.</li>
              </ul>
            </section>

            <section id="how-we-use-data" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                3. How We Use Data
              </h2>
              <p className="text-muted-foreground">
                Your personal data is processed strictly for legitimate operational, security, and legal purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Facilitating seamless USDC and XLM crypto payments and auto-converting funds via SEP-24 anchor networks into local bank accounts.</li>
                <li>Verifying merchant identity and fulfilling Anti-Money Laundering (AML) and Know Your Customer (KYC) regulatory compliance requirements.</li>
                <li>Monitoring, detecting, and mitigating fraud, illegal transactions, and unauthorized access to payment endpoints.</li>
                <li>Sending transactional updates, webhook notifications, rate alert communications, and system security advisories.</li>
              </ul>
            </section>

            <section id="legal-basis" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                4. Legal Basis for Processing
              </h2>
              <p className="text-muted-foreground">
                Under the General Data Protection Regulation (GDPR) and Nigeria Data Protection Regulation (NDPR), we rely on legal bases including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Performance of a Contract:</strong> Processing necessary to execute merchant agreements and settle payments.</li>
                <li><strong className="text-foreground">Legal Obligations:</strong> Compliance with financial reporting, AML/CFT mandates, and statutory tax directives.</li>
                <li><strong className="text-foreground">Legitimate Interests:</strong> Improving service reliability, enhancing fraud detection, and securing platform APIs.</li>
                <li><strong className="text-foreground">Consent:</strong> Where explicitly provided for optional communications and analytics cookies.</li>
              </ul>
            </section>

            <section id="data-sharing" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                5. Data Sharing & Third Parties
              </h2>
              <p className="text-muted-foreground">
                We do not sell your personal information. We disclose data solely to authorized entities under strict confidentiality agreements:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">SEP-24 Anchors & Financial Partners:</strong> Licensed banking institutions and Stellar anchor providers for fiat liquidity and local currency disbursement.</li>
                <li><strong className="text-foreground">Identity Verification Vendors:</strong> Automated KYC verification services for document checking and watchlist screening.</li>
                <li><strong className="text-foreground">Regulatory Authorities:</strong> Law enforcement agencies or financial regulators when required by law or valid court order.</li>
              </ul>
            </section>

            <section id="international-transfers" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                6. International Data Transfers
              </h2>
              <p className="text-muted-foreground">
                As a cross-border payment platform operating over the global Stellar distributed ledger, information may be transferred across jurisdictions. We ensure adequate safeguards via Standard Contractual Clauses (SCCs) and NDPR-compliant transfer mechanisms.
              </p>
            </section>

            <section id="data-retention" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                7. Data Retention
              </h2>
              <p className="text-muted-foreground">
                We retain personal data for as long as your merchant account remains active. Account and transaction history records are maintained for a minimum of 5 years following account closure to meet statutory financial record-keeping laws.
              </p>
            </section>

            <section id="your-rights" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                8. Your Rights
              </h2>
              <p className="text-muted-foreground">
                Under GDPR and NDPR framework, you possess comprehensive rights concerning your personal information:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-border bg-card">
                  <h3 className="font-bold text-sm text-foreground mb-1">Right to Access & Rectification</h3>
                  <p className="text-xs text-muted-foreground">Request full copies of your data or update inaccurate account profile details.</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                  <h3 className="font-bold text-sm text-foreground mb-1">Right to Erasure (&quot;Right to be Forgotten&quot;)</h3>
                  <p className="text-xs text-muted-foreground">Request deletion of personal data subject to mandatory statutory financial retention laws.</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                  <h3 className="font-bold text-sm text-foreground mb-1">Right to Data Portability</h3>
                  <p className="text-xs text-muted-foreground">Obtain your payment and transaction records in structured CSV or JSON formats.</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                  <h3 className="font-bold text-sm text-foreground mb-1">Right to Object</h3>
                  <p className="text-xs text-muted-foreground">Object to automated processing or direct communications at any time.</p>
                </div>
              </div>
            </section>

            <section id="cookies-tracking" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                9. Cookies & Tracking
              </h2>
              <p className="text-muted-foreground">
                BettaPay uses essential cookies and local browser storage to maintain authenticated user sessions, store theme preferences, and secure API requests. We do not use intrusive third-party cross-site advertising trackers.
              </p>
            </section>

            <section id="security-measures" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                10. Security Measures
              </h2>
              <p className="text-muted-foreground">
                We employ enterprise-grade security protocols, including AES-256 encryption at rest, TLS 1.3 in transit, automated web application firewalls, strict non-custodial wallet separation, and regular vulnerability audits.
              </p>
            </section>

            <section id="childrens-privacy" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                11. Children&apos;s Privacy
              </h2>
              <p className="text-muted-foreground">
                BettaPay services are strictly designed for businesses and individuals aged 18 and above. We do not knowingly solicit or collect data from individuals under the age of 18.
              </p>
            </section>

            <section id="changes-to-policy" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                12. Changes to Policy
              </h2>
              <p className="text-muted-foreground">
                We may revise this Privacy Policy periodically to reflect technological, operational, or legal developments. Merchants will be notified of material changes via email or dashboard alert prior to implementation.
              </p>
            </section>

            <section id="contact-us" className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/60 pb-3">
                13. Contact Us
              </h2>
              <p className="text-muted-foreground">
                If you have questions, concerns, or requests regarding this policy or data processing practices, please contact our Data Protection Officer:
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-muted/40 border border-border">
                <div>
                  <p className="font-bold text-foreground">Data Protection Officer</p>
                  <p className="text-sm text-muted-foreground font-mono">dpo@bettapay.io</p>
                </div>
                <a
                  href="mailto:dpo@bettapay.io"
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs inline-flex items-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  Contact DPO <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </section>

          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
