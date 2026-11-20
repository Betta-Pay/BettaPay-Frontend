class MockHeaders {
  private map = new Map<string, string[]>();
  set(name: string, value: string) {
    this.map.set(name.toLowerCase(), [value]);
  }
  append(name: string, value: string) {
    const list = this.map.get(name.toLowerCase()) ?? [];
    list.push(value);
    this.map.set(name.toLowerCase(), list);
  }
  get(name: string) {
    return this.map.get(name.toLowerCase())?.[0] ?? null;
  }
  getAll(name: string) {
    return this.map.get(name.toLowerCase()) ?? [];
  }
}

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    headers: MockHeaders;
    data: unknown;
    constructor(data: unknown, init?: { status?: number }) {
      this.status = init?.status ?? 200;
      this.headers = new MockHeaders();
      this.data = data;
    }
    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }
    async json() {
      return this.data;
    }
  }
  return {
    NextResponse: MockNextResponse,
    NextRequest: class {},
  };
});

const mockVerifyCsrfRequest = jest.fn();
jest.mock('@/lib/utils/csrf', () => {
  const actual = jest.requireActual('@/lib/utils/csrf');
  return {
    ...actual,
    verifyCsrfRequest: (...args: unknown[]) => mockVerifyCsrfRequest(...args),
  };
});

import { POST, DELETE } from '../route';

describe('POST /api/auth/session', () => {
  const validToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6Im1lcmNoYW50In0.signature';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns HTTP 400 when body is malformed JSON', async () => {
    const req = {
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token in JSON')),
    } as unknown as Request;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await (res as unknown as { json: () => Promise<{ ok: boolean; error: string }> }).json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/Malformed JSON/i);
  });

  it('returns HTTP 400 when request body is not an object', async () => {
    const req = {
      json: jest.fn().mockResolvedValue('just a string'),
    } as unknown as Request;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns HTTP 400 when token is missing or not a string', async () => {
    const req = {
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Request;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await (res as unknown as { json: () => Promise<{ ok: boolean; error: string }> }).json();
    expect(body.ok).toBe(false);
  });

  it('returns HTTP 400 when token contains newline or carriage return characters', async () => {
    const reqWithNewline = {
      json: jest.fn().mockResolvedValue({ token: `${validToken}\nSet-Cookie: evil=1` }),
    } as unknown as Request;

    const resNewline = await POST(reqWithNewline);
    expect(resNewline.status).toBe(400);

    const reqWithCRLF = {
      json: jest.fn().mockResolvedValue({ token: 'header\r\n.payload.sig' }),
    } as unknown as Request;

    const resCRLF = await POST(reqWithCRLF);
    expect(resCRLF.status).toBe(400);
  });

  it('returns HTTP 400 when token does not match 3-segment JWT format', async () => {
    const req1 = {
      json: jest.fn().mockResolvedValue({ token: 'not-a-jwt' }),
    } as unknown as Request;
    expect((await POST(req1)).status).toBe(400);

    const req2 = {
      json: jest.fn().mockResolvedValue({ token: 'header.payload' }),
    } as unknown as Request;
    expect((await POST(req2)).status).toBe(400);

    const req3 = {
      json: jest.fn().mockResolvedValue({ token: 'header.payload.signature.extra' }),
    } as unknown as Request;
    expect((await POST(req3)).status).toBe(400);
  });

  it('returns HTTP 200 and sets session cookies for valid JWT token', async () => {
    const req = {
      json: jest.fn().mockResolvedValue({ token: validToken }),
    } as unknown as Request;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await (res as unknown as { json: () => Promise<{ ok: boolean; role: string }> }).json();
    expect(body.ok).toBe(true);

    const cookies = (res as unknown as { headers: MockHeaders }).headers.getAll('set-cookie');
    expect(cookies.some((c) => c.includes('auth_token='))).toBe(true);
    expect(cookies.some((c) => c.includes('user_role='))).toBe(true);
    expect(cookies.some((c) => c.includes('csrf_token='))).toBe(true);
    expect(cookies.some((c) => c.includes('csrf_sid='))).toBe(true);
  });
});

describe('DELETE /api/auth/session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns HTTP 403 when CSRF validation fails', async () => {
    mockVerifyCsrfRequest.mockResolvedValue({ ok: false, reason: 'missing-header' });

    const req = {} as unknown as Request;
    const res = await DELETE(req);

    expect(res.status).toBe(403);
    const body = await (res as unknown as { json: () => Promise<{ ok: boolean; error: string }> }).json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/CSRF/i);
  });

  it('returns HTTP 200 and clears session cookies when CSRF validation succeeds', async () => {
    mockVerifyCsrfRequest.mockResolvedValue({ ok: true });

    const req = {} as unknown as Request;
    const res = await DELETE(req);

    expect(res.status).toBe(200);
    const body = await (res as unknown as { json: () => Promise<{ ok: boolean }> }).json();
    expect(body.ok).toBe(true);

    const cookies = (res as unknown as { headers: MockHeaders }).headers.getAll('set-cookie');
    expect(cookies.some((c) => c.includes('auth_token=;') && c.includes('Max-Age=0'))).toBe(true);
    expect(cookies.some((c) => c.includes('user_role=;') && c.includes('Max-Age=0'))).toBe(true);
  });
});
