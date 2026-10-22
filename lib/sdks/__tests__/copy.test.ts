import { normalizeCopiedText } from '../copy';

describe('normalizeCopiedText', () => {
  it('strips shell prompts from a command transcript, keeping output lines', () => {
    expect(normalizeCopiedText('$ npm install @bettapay/sdk\nadded 1 package')).toBe(
      'npm install @bettapay/sdk\nadded 1 package',
    );
  });

  it('strips REPL prompts and continuations', () => {
    expect(normalizeCopiedText('>>> import bettapay\n>>> for x in y:\n...     print(x)')).toBe(
      'import bettapay\nfor x in y:\n    print(x)',
    );
  });

  it('strips "> " only when every line carries it', () => {
    expect(normalizeCopiedText('> cargo add bettapay\n> cargo build')).toBe('cargo add bettapay\ncargo build');
    expect(normalizeCopiedText('> cargo add bettapay\ncargo build')).toBe('> cargo add bettapay\ncargo build');
  });

  it('leaves source code, comments and prompt-free text untouched', () => {
    const python = "print(quote.converted)\n# Output: 82521\nx = a > b";
    const go = 'fmt.Println(x)\n\t// Output: 1\n';
    for (const text of [python, go, 'npm install @bettapay/sdk', '', '\n\n']) {
      expect(normalizeCopiedText(text)).toBe(text);
    }
  });

  it('is idempotent', () => {
    const once = normalizeCopiedText('$ pip install bettapay');
    expect(normalizeCopiedText(once)).toBe(once);
  });
});
