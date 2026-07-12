import { NextResponse, NextRequest } from 'next/server';
import { generateCsrfToken } from '@/lib/utils/csrf';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const role = req.cookies.get('user_role')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  // In production, validate the token and fetch real user data.
  // For mock/preview mode, return a session based on the cookie values.
  return NextResponse.json({
    user: {
      id: role === 'admin' ? 'admin-1' : 'GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD',
      email: role === 'admin' ? 'admin@bettapay.com' : 'merchant@bettapay.com',
      name: role === 'admin' ? 'System Admin' : 'Merchant User',
      role: role || 'merchant',
    },
    token,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body.token;
    const role = body.role || '';

    const res = NextResponse.json({ ok: true });

    // Determine environment for Secure flag
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';

    // Set HttpOnly cookie for auth token
    res.headers.set('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax${secureFlag}`);
    // Also set a non-HttpOnly role cookie so middleware/server-side can read role where needed
    res.headers.append('Set-Cookie', `user_role=${role}; Path=/; SameSite=Lax${secureFlag}`);
    // Set CSRF token cookie (non-HttpOnly so the client JS can read it for double-submit)
    const csrfToken = generateCsrfToken();
    res.headers.append('Set-Cookie', `csrf_token=${csrfToken}; Path=/; SameSite=Strict; Max-Age=86400${secureFlag}`);

    return res;
  } catch (error) {
    console.error('Failed to set session:', error);
    return NextResponse.json({ ok: false, error: 'Failed to set session' }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';
  // Clear cookies
  res.headers.set('Set-Cookie', `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`);
  res.headers.append('Set-Cookie', `user_role=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`);
  res.headers.append('Set-Cookie', `csrf_token=; Path=/; Max-Age=0; SameSite=Strict${secureFlag}`);
  return res;
}
