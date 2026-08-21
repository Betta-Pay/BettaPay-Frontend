import { NextRequest, NextResponse } from 'next/server';

// Verify TOTP code (simplified for demo - use otplib in production)
function verifyTOTP(code: string, secret: string): boolean {
  // In a real application, use a library like 'otplib':
  // import { authenticator } from 'otplib';
  // return authenticator.verify({ token: code, secret: secret.replace(/\s/g, '') });
  
  // For demo purposes, accept any 6-digit code
  // In production, this would use proper TOTP verification
  return code.length === 6 && /^\d+$/.test(code);
}

export async function POST(request: NextRequest) {
  try {
    const { code, secret } = await request.json();
    
    if (!code || !secret) {
      return NextResponse.json(
        { error: 'Code and secret are required' },
        { status: 400 }
      );
    }
    
    // Verify the TOTP code
    const isValid = verifyTOTP(code, secret);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }
    
    // In a real application, you would:
    // 1. Verify the user is authenticated
    // 2. Update the user record in the database to enable 2FA
    // 3. Store the secret securely (encrypted)
    // 4. Return success
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
