import { SDKS, type SDKDefinition } from '@/lib/sdks';

/**
 * Latest published version of each SDK, read from its package registry.
 *
 * None of the SDKs are published yet, so every lookup is expected to miss
 * today. A miss is reported honestly: the version falls back to the one in
 * `lib/sdks.ts`, `source` is `"fallback"` and `status` stays `"coming-soon"`.
 * The moment a registry returns a version, `status` flips to `"published"`
 * with no code change.
 */
export interface SdkRelease {
  id: string;
  version: string;
  source: 'registry' | 'fallback';
  status: SDKDefinition['status'];
  registry: string;
}

interface RegistryLookup {
  label: string;
  url: string;
  parse: (body: unknown) => string | null;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

export const REGISTRY_LOOKUPS: Record<string, RegistryLookup> = {
  typescript: {
    label: 'npm',
    url: 'https://registry.npmjs.org/@bettapay%2Fsdk/latest',
    parse: (body) => str(asRecord(body).version),
  },
  python: {
    label: 'PyPI',
    url: 'https://pypi.org/pypi/bettapay/json',
    parse: (body) => str(asRecord(asRecord(body).info).version),
  },
  php: {
    label: 'Packagist',
    url: 'https://repo.packagist.org/p2/bettapay/sdk.json',
    parse: (body) => {
      const versions = asRecord(asRecord(body).packages)['bettapay/sdk'];
      return Array.isArray(versions) ? str(asRecord(versions[0]).version) : null;
    },
  },
  go: {
    label: 'Go proxy',
    url: 'https://proxy.golang.org/github.com/betta-pay/bettapay-go/@latest',
    parse: (body) => str(asRecord(body).Version),
  },
  rust: {
    label: 'crates.io',
    url: 'https://crates.io/api/v1/crates/bettapay',
    parse: (body) => str(asRecord(asRecord(body).crate).max_version),
  },
};

const LOOKUP_TIMEOUT_MS = 4000;
const REVALIDATE_SECONDS = 60 * 60;

const stripV = (version: string) => version.replace(/^v/, '');

export async function resolveSdkRelease(sdk: SDKDefinition): Promise<SdkRelease> {
  const lookup = REGISTRY_LOOKUPS[sdk.id];
  const fallback: SdkRelease = {
    id: sdk.id,
    version: sdk.version,
    source: 'fallback',
    status: 'coming-soon',
    registry: lookup?.label ?? 'registry',
  };
  if (!lookup) return fallback;

  try {
    const res = await fetch(lookup.url, {
      headers: { accept: 'application/json', 'user-agent': 'bettapay-frontend/sdk-registry' },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return fallback;
    const version = lookup.parse(await res.json());
    if (!version) return fallback;
    return { ...fallback, version: stripV(version), source: 'registry', status: 'published' };
  } catch {
    return fallback;
  }
}

export async function resolveAllSdkReleases(): Promise<SdkRelease[]> {
  return Promise.all(SDKS.map(resolveSdkRelease));
}
