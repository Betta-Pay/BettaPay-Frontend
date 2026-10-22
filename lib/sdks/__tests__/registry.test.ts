import { SDKS } from '@/lib/sdks';
import { resolveSdkRelease, resolveAllSdkReleases } from '../registry';

const sdk = (id: string) => SDKS.find((s) => s.id === id)!;
const respond = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: async () => body } as Response);

describe('SDK registry versions', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('falls back to the planned version, unreleased, when the package is not published', async () => {
    global.fetch = jest.fn(() => respond({}, false)) as unknown as typeof fetch;
    const release = await resolveSdkRelease(sdk('typescript'));
    expect(release).toMatchObject({ version: '0.1.0', source: 'fallback', status: 'coming-soon', registry: 'npm' });
  });

  it('falls back when the registry is unreachable', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    const release = await resolveSdkRelease(sdk('go'));
    expect(release.source).toBe('fallback');
    expect(release.status).toBe('coming-soon');
  });

  it('reports a published version when the registry returns one', async () => {
    global.fetch = jest.fn(() => respond({ version: '1.4.2' })) as unknown as typeof fetch;
    expect(await resolveSdkRelease(sdk('typescript'))).toMatchObject({
      version: '1.4.2',
      source: 'registry',
      status: 'published',
    });
  });

  it.each([
    ['python', { info: { version: '2.0.1' } }, '2.0.1'],
    ['php', { packages: { 'bettapay/sdk': [{ version: 'v3.1.0' }] } }, '3.1.0'],
    ['go', { Version: 'v0.9.0' }, '0.9.0'],
    ['rust', { crate: { max_version: '0.3.0' } }, '0.3.0'],
  ])('parses the %s registry payload', async (id, body, expected) => {
    global.fetch = jest.fn(() => respond(body)) as unknown as typeof fetch;
    expect((await resolveSdkRelease(sdk(id))).version).toBe(expected);
  });

  it('resolves every SDK', async () => {
    global.fetch = jest.fn(() => respond({}, false)) as unknown as typeof fetch;
    expect(await resolveAllSdkReleases()).toHaveLength(SDKS.length);
  });
});
