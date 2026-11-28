/**
 * Exercises scripts/check-locale-parity.mjs against fixture dictionaries, so
 * every failure mode and its exit code is pinned: missing keys, extra keys,
 * placeholder drift, invalid JSON, and a missing reference locale.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SCRIPT = path.join(process.cwd(), 'scripts', 'check-locale-parity.mjs');
const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeLocales(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'locale-parity-'));
  tmpDirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, `${name}.json`), content);
  }
  return dir;
}

function runCheck(dir: string) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    env: { ...process.env, I18N_LOCALES_DIR: dir },
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const reference = JSON.stringify({ a: { b: 'Hi {{name}}' }, c: 'Plain' });

describe('check-locale-parity', () => {
  it('exits 0 when every locale matches the reference', () => {
    const dir = makeLocales({
      en: reference,
      fr: JSON.stringify({ a: { b: 'Salut {{name}}' }, c: 'Simple' }),
    });

    const result = runCheck(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('All 1 locale(s) match en.json.');
  });

  it('exits 1 and names a missing nested key', () => {
    const dir = makeLocales({
      en: reference,
      fr: JSON.stringify({ a: {}, c: 'Simple' }),
    });

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing: a.b');
  });

  it('exits 1 and names an extra key the reference does not define', () => {
    const dir = makeLocales({
      en: reference,
      fr: JSON.stringify({ a: { b: 'Salut {{name}}' }, c: 'Simple', zz: 'unused' }),
    });

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('extra:   zz');
  });

  it('exits 1 when an interpolation placeholder is renamed', () => {
    const dir = makeLocales({
      en: reference,
      fr: JSON.stringify({ a: { b: 'Salut {{nom}}' }, c: 'Simple' }),
    });

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('placeholder: a.b (expected {{name}}, found {{nom}})');
  });

  it('exits 1 when a placeholder is dropped', () => {
    const dir = makeLocales({
      en: reference,
      fr: JSON.stringify({ a: { b: 'Salut' }, c: 'Simple' }),
    });

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('placeholder: a.b (expected {{name}}, found none)');
  });

  it('exits 1 and reports a dictionary that is not valid JSON', () => {
    const dir = makeLocales({ en: reference, fr: '{' });

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('fr: invalid JSON');
  });

  it('exits 2 when the reference locale is missing', () => {
    const dir = makeLocales({ fr: JSON.stringify({ c: 'Simple' }) });

    const result = runCheck(dir);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Reference locale "en.json" not found');
  });
});
