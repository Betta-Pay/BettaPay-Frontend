import { act, fireEvent, render, screen } from '@testing-library/react';
import { RequestExample } from '../RequestExample';
import type { HighlightedSample } from '@/lib/docs/types';

// The sanitizer dependency is not installed in this workspace, so render raw HTML instead.
jest.mock('@/components/shared/SafeHtmlRenderer', () => ({
  SafeHtmlRenderer: ({ html, className }: { html: string; className?: string }) => (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

const SAMPLES: HighlightedSample[] = [
  {
    language: 'curl',
    label: 'cURL',
    grammar: 'bash',
    code: 'curl https://api.bettapay.com/v1/payments -H "Authorization: Bearer sk_test"',
    html: '<pre><code>curl https://api.bettapay.com/v1/payments</code></pre>',
  },
  {
    language: 'node',
    label: 'Node',
    grammar: 'typescript',
    code: 'await bettapay.payments.list({ limit: 3 });',
    html: '<pre><code>await bettapay.payments.list()</code></pre>',
  },
];

describe('RequestExample copy to clipboard', () => {
  let writeText: jest.Mock;

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('copies the raw snippet verbatim from the hovering button and shows Copied!', async () => {
    render(<RequestExample samples={SAMPLES} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy cURL snippet' }));
    await act(async () => {});

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(SAMPLES[0].code);
    expect(screen.getByText('Copied!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });

  it('copies the snippet of the selected tab after switching languages', async () => {
    render(<RequestExample samples={SAMPLES} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Node' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Node snippet' }));
    await act(async () => {});

    expect(writeText).toHaveBeenCalledWith(SAMPLES[1].code);
  });

  it('keeps the header copy button working alongside the hovering one', async () => {
    render(<RequestExample samples={SAMPLES} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy cURL example' }));
    await act(async () => {});

    expect(writeText).toHaveBeenCalledWith(SAMPLES[0].code);
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });
});
