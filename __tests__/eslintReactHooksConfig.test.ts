/**
 * React Hooks lint rules in .eslintrc.json (issue #769).
 *
 * `next/core-web-vitals` already inherits `plugin:react-hooks/recommended`, but
 * it only reports `exhaustive-deps` as a warning — and `next lint` exits 0 when
 * there are warnings, so CI stayed green with incomplete dependency arrays
 * (the stale-closure class of bug the issue describes). These tests lock the
 * config so the rule cannot silently regress back to a warning.
 */

import { readFileSync } from 'fs';
import path from 'path';

type EslintConfig = {
  extends?: string[];
  rules?: Record<string, unknown>;
};

const config: EslintConfig = JSON.parse(
  readFileSync(path.join(process.cwd(), '.eslintrc.json'), 'utf8')
);

describe('.eslintrc.json react-hooks enforcement (issue #769)', () => {
  it('extends the react-hooks recommended ruleset', () => {
    expect(config.extends).toContain('plugin:react-hooks/recommended');
  });

  it('keeps the Next.js configs in the chain', () => {
    expect(config.extends).toEqual(
      expect.arrayContaining(['next/core-web-vitals', 'next/typescript'])
    );
  });

  it('reports an incomplete dependency array as an error so CI fails', () => {
    expect(config.rules?.['react-hooks/exhaustive-deps']).toBe('error');
  });

  it('reports conditional hook calls as an error', () => {
    expect(config.rules?.['react-hooks/rules-of-hooks']).toBe('error');
  });
});
