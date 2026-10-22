/**
 * Webhook target URL validation (pure — safe for the browser and the server).
 *
 * Blocks non-http(s) schemes, credentials in the URL, and — unless
 * `allowPrivate` is set — loopback, private, link-local and cloud-metadata
 * hosts so a delivery can't be pointed at internal infrastructure (SSRF).
 * Hostname checks cannot see DNS rebinding; they are a first line of defence.
 */

export interface UrlValidation {
  valid: boolean;
  reason?: string;
}

function parseIPv4(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const octets = m.slice(1).map(Number);
  return octets.every((o) => o <= 255) ? octets : null;
}

function isPrivateIPv4([a, b]: number[]): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

export function isPrivateHost(rawHost: string): boolean {
  const host = rawHost.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.internal') || host.endsWith('.local')) return true;
  if (host === 'metadata.google.internal') return true;

  const v4 = parseIPv4(host);
  if (v4) return isPrivateIPv4(v4);

  if (host.includes(':')) {
    if (host === '::' || host === '::1') return true;
    if (/^f[cd]/.test(host)) return true; // fc00::/7 unique local
    if (/^fe[89ab]/.test(host)) return true; // fe80::/10 link-local
    const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) {
      const mv4 = parseIPv4(mapped[1]);
      return mv4 ? isPrivateIPv4(mv4) : true;
    }
  }
  return false;
}

export function validateWebhookUrl(
  input: string,
  opts: { allowPrivate?: boolean } = {},
): UrlValidation {
  const value = (input ?? '').trim();
  if (!value) return { valid: false, reason: 'Enter a URL.' };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { valid: false, reason: 'Not a valid URL.' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { valid: false, reason: 'Only http(s) URLs are supported.' };
  }
  if (url.username || url.password) {
    return { valid: false, reason: 'URLs with embedded credentials are not allowed.' };
  }

  const privateHost = isPrivateHost(url.hostname);
  if (privateHost && !opts.allowPrivate) {
    return { valid: false, reason: 'Private, loopback and link-local addresses are blocked.' };
  }
  if (url.protocol === 'http:' && !(privateHost && opts.allowPrivate)) {
    return { valid: false, reason: 'HTTPS is required for public endpoints.' };
  }
  return { valid: true };
}
