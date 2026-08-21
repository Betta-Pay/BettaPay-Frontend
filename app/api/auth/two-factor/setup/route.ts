import { NextRequest, NextResponse } from 'next/server';

// Generate a random base32 secret for TOTP
function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Add spaces for readability (groups of 4)
  return secret.match(/.{1,4}/g)?.join(' ') || secret;
}

// Generate TOTP QR code URL (otpauth:// format)
function generateQRCodeUrl(secret: string, email: string): string {
  const issuer = 'BettaPay';
  const cleanSecret = secret.replace(/\s/g, '');
  return `otpauth://totp/${issuer}:${email}?secret=${cleanSecret}&issuer=${issuer}`;
}

export async function POST(request: NextRequest) {
  try {
    // In a real application, you would:
    // 1. Verify the user is authenticated (check session cookie)
    // 2. Generate a cryptographically secure secret using a library like 'otplib'
    // 3. Store the secret temporarily in the database (not yet enabled)
    // 4. Return the secret and QR code URL
    
    // For this demo, we'll generate a simple secret
    const secret = generateSecret();
    
    // Get user email from session (in real app, verify from session)
    const email = 'user@example.com'; // This would come from the authenticated session
    
    const qrCodeUrl = generateQRCodeUrl(secret, email);
    
    return NextResponse.json({
      secret,
      qrCodeUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate 2FA secret' },
      { status: 500 }
    );
  }
}
