import { NextRequest, NextResponse } from 'next/server';

// Verify TOTP code during login (simplified for demo)
function verifyTOTP(code: string): boolean {
  // In a real application, use a library like 'otplib':
  // import { authenticator } from 'otplib';
  // return authenticator.verify({ token: code, secret: user.twoFactorSecret });
  
  // For demo purposes, accept any 6-digit code
  return code.length === 6 && /^\d+$/.test(code);
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }
    
    // Verify the TOTP code
    const isValid = verifyTOTP(code);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }
    
    // In a real application, you would:
    // 1. Verify the pending login session from the session cookie
    // 2. Get the user's stored 2FA secret from the database
    // 3. Verify the code against the secret
    // 4. If valid, complete the login and return the token
    
    // For demo, return a mock successful response
    return NextResponse.json({
      success: true,
      token: 'mock-jwt-token',
      user: {
        id: '1',
        email: 'user@example.com',
        name: 'Demo User',
        role: 'merchant',
        twoFactorEnabled: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
