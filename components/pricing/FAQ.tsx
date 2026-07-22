import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FaqEntry {
  question: string;
  answer: string;
}

const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: 'What currencies does BettaPay support?',
    answer:
      'Merchants accept payments in USDC on the Stellar network. Settlements are paid out in Nigerian Naira (NGN) directly to your bank account via SEP-24 anchors, or you can hold your balance in USDC.',
  },
  {
    question: 'How are fees calculated?',
    answer:
      'Each transaction is charged a percentage of the amount plus a small fixed fee. On Starter that is 1.5% + $0.10 per transaction, and on Growth it is 1.0% + $0.05. Fees are deducted automatically at settlement, so there are no surprise invoices.',
  },
  {
    question: 'Are there any monthly minimums or hidden fees?',
    answer:
      'No. Starter has no monthly minimum and no setup fees. You only pay when you get paid. The Growth plan includes your first $10,000 of monthly volume, and the exchange rate applied at settlement is shown transparently before you confirm.',
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
      'On-chain payments confirm in 3 to 5 seconds. Bank settlement to NGN is next business day (T+1) on Starter, same day on Growth, and instant for Enterprise merchants.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'You do not need one. The Starter plan is pay-as-you-go with no monthly fees, so you can create an account, integrate, and test payments without any upfront commitment.',
  },
  {
    question: 'Do you support recurring payments?',
    answer:
      'You can create reusable payment links and QR codes that customers can pay any number of times. Growth and Enterprise plans include webhooks and API access so you can automate billing flows in your own product.',
  },
  {
    question: 'How do refunds work?',
    answer:
      'Since payments are non-custodial, refunds are initiated by you: send the USDC back to the customer wallet from your dashboard. Only the network fee (a fraction of a cent) applies to the refund transaction.',
  },
  {
    question: 'What support is included with each plan?',
    answer:
      'Starter includes email support. Growth adds priority support with faster response times. Enterprise merchants get a dedicated account manager and a contractual SLA.',
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
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function FAQ() {
  return (
    <div className="max-w-3xl mx-auto">
      <FaqStructuredData />
      <Accordion>
        {FAQ_ENTRIES.map((entry) => (
          <AccordionItem key={entry.question}>
            <AccordionTrigger>{entry.question}</AccordionTrigger>
            <AccordionContent>{entry.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
