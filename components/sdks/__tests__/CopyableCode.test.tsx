import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CopyableCode } from '../CopyableCode';
import { getAllDisplayedSnippets } from '@/lib/sdks/samples';

describe('CopyableCode', () => {
  let written: string[];

  beforeEach(() => {
    written = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn(async (text: string) => void written.push(text)) },
    });
  });

  const snippets = getAllDisplayedSnippets();

  it('covers every SDK in every language', () => {
    expect(snippets.length).toBeGreaterThan(20);
  });

  it.each(snippets.map((s) => [s.name, s.code] as const))(
    '%s: copied text equals displayed text byte-for-byte',
    async (name, code) => {
      const { container } = render(<CopyableCode code={code} label={name} />);
      const displayed = container.querySelector('pre')?.textContent;

      fireEvent.click(screen.getByRole('button', { name: `Copy ${name}` }));
      await waitFor(() => expect(written).toHaveLength(1));

      expect(displayed).toBe(code);
      expect(written[0]).toBe(displayed);
    },
  );
});
