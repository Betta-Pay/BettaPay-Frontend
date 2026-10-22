'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PRICING_TIERS } from '@/lib/pricing';

interface FaqEntry {
  question: string;
  answer: string;
}

// Derive fee strings from the single source of truth so the FAQ never
// drifts from what the pricing page actually shows.
function buildFaqEntries(): FaqEntry[] {
  const starter = PRICING_TIERS.find((t) => t.id === 'starter')!;
  const growth = PRICING_TIERS.find((t) => t.id === 'growth')!;
  const includedKStr = `$${(growth.volumeIncludedUsd / 1_000).toFixed(0)},000`;

  return [
    {
      question: 'What currencies does BettaPay support?',
      answer:
        'Merchants accept payments in USDC on the Stellar network. Settlements are paid out in Nigerian Naira (NGN) directly to your bank account via SEP-24 anchors, or you can hold your balance in USDC.',
    },
    {
      question: 'How are fees calculated?',
      answer:
        `Each transaction is charged a percentage of the amount plus a small fixed fee. On ${starter.name} that is ${starter.transactionFee} per transaction, and on ${growth.name} it is ${growth.transactionFee}. Fees are deducted automatically at settlement, so there are no surprise invoices.`,
    },
    {
      question: 'Are there any monthly minimums or hidden fees?',
      answer:
        `No. ${starter.name} has no monthly minimum and no setup fees. You only pay when you get paid. The ${growth.name} plan includes your first ${includedKStr} of monthly volume, and the exchange rate applied at settlement is shown transparently before you confirm.`,
    },
    {
      question: 'Can I change plans later?',
      answer:
        'Yes. You can upgrade or downgrade at any time from your dashboard settings. Plan changes take effect at the start of your next billing cycle, and there are no penalties for switching.',
    },
    {
      question: 'What about chargebacks?',
      answer:
        'There are none. BettaPay is non-custodial and payments settle on the Stellar blockchain, so transactions are final once confirmed. You never lose funds to fraudulent chargeback claims like with card processors.',
    },
    {
      question: 'How fast are settlements?',
      answer:
        `On-chain payments confirm in 3 to 5 seconds. Bank settlement to NGN is ${starter.settlementSpeed.toLowerCase()} on ${starter.name}, ${growth.settlementSpeed.toLowerCase()} on ${growth.name}, and instant for Enterprise merchants.`,
    },
    {
      question: 'Is there a free trial?',
      answer:
        `You do not need one. The ${starter.name} plan is pay-as-you-go with no monthly fees, so you can create an account, integrate, and test payments without any upfront commitment.`,
    },
    {
      question: 'Do you support recurring payments?',
      answer:
        `You can create reusable payment links and QR codes that customers can pay any number of times. ${growth.name} and Enterprise plans include webhooks and API access so you can automate billing flows in your own product.`,
    },
    {
      question: 'How do refunds work?',
      answer:
        'Since payments are non-custodial, refunds are initiated by you: send the USDC back to the customer wallet from your dashboard. Only the network fee (a fraction of a cent) applies to the refund transaction.',
    },
    {
      question: 'What support is included with each plan?',
      answer:
        `${starter.name} includes email support. ${growth.name} adds priority support with faster response times. Enterprise merchants get a dedicated account manager and a contractual SLA.`,
    },
    {
      question: 'Do I need a crypto wallet to use BettaPay?',
      answer:
        'Yes, a Stellar wallet such as Freighter. Because BettaPay is non-custodial, funds go straight to a wallet you control. Setup takes a few minutes and our onboarding guides walk you through it.',
    },
    {
      question: 'How does the exchange rate for NGN settlement work?',
      answer:
        'The USDC to NGN rate is sourced from Stellar anchors at the moment of settlement and displayed before you confirm. What you see is what you get; there is no hidden FX margin on top of the quoted rate.',
    },
  ];
}

const FAQ_ENTRIES: FaqEntry[] = buildFaqEntries();

function FaqStructuredData() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ENTRIES.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
  return (
    <script type="application/ld+json">
      {JSON.stringify(data)}
    </script>
  );
}

export function FAQ() {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim();
  const matchingEntries = useMemo(() => {
    if (!normalizedQuery) return FAQ_ENTRIES;
    const normalized = normalizedQuery.toLocaleLowerCase();
    return FAQ_ENTRIES.filter(
      ({ question, answer }) =>
        question.toLocaleLowerCase().includes(normalized) ||
        answer.toLocaleLowerCase().includes(normalized)
    );
  }, [normalizedQuery]);

  const highlightAnswer = (answer: string) => {
    if (!normalizedQuery) return answer;

    const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return answer.split(new RegExp(`(${escapedQuery})`, 'gi')).map((part, index) =>
      part.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase() ? (
        <mark key={`${part}-${index}`} className="rounded bg-primary/15 px-0.5 text-foreground">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <FaqStructuredData />
      <div className="mb-5">
        <label htmlFor="pricing-faq-search" className="sr-only">
          Search frequently asked questions
        </label>
        <Input
          id="pricing-faq-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search FAQs..."
          aria-controls="pricing-faq-results"
        />
        <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {matchingEntries.length} {matchingEntries.length === 1 ? 'question' : 'questions'}
          {normalizedQuery ? ' found' : ''}
        </p>
      </div>
      {matchingEntries.length ? (
        <Accordion id="pricing-faq-results" type="single" collapsible>
          {matchingEntries.map((entry) => (
            <AccordionItem key={entry.question} value={entry.question}>
              <AccordionTrigger>{entry.question}</AccordionTrigger>
              <AccordionContent>{highlightAnswer(entry.answer)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p id="pricing-faq-results" className="py-6 text-sm text-muted-foreground" role="status">
          No questions match “{normalizedQuery}”. Try another search.
        </p>
      )}
    </div>
  );
}
