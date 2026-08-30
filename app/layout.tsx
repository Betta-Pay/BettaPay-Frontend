import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { Toaster } from "@/components/ui";
import { Providers } from "@/components/providers";
import "./globals.css";
import { cn } from "@/lib/utils";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import { TranslationCoveragePanel } from '@/components/i18n/TranslationCoveragePanel';


const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-heading",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-body",
});


export const metadata: Metadata = {
  // Resolves relative canonical/openGraph URLs declared by individual pages.
  metadataBase: new URL(SITE_URL),
  title: "BettaPay | Non-custodial Merchant Platform",
  description: "Accept USDC and stablecoins easily across Africa",
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CSRF cookie is now seeded in `middleware.ts` via `ensureCsrfCookieInMiddleware`
  // (using NextResponse.cookies.set, which is allowed in middleware). The
  // previous `await ensureCsrfCookie()` call here triggered
  // `Cookies can only be modified in a Server Action or Route Handler` in
  // Next 14.2+ when called from a Server Component layout.
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || undefined;
  // Guard provider initialization on a real client id. When unset/empty/whitespace
  // we render the app without GoogleOAuthProvider so the SDK never receives an
  // empty string (which it treats as valid config and logs errors for). The
  // login page (app/auth/login/page.tsx) shows a disabled "Google login
  // unavailable" fallback with tooltip + dev console.warn in this state.

  const inner = (
    <I18nProvider>
      <Providers>
        {children}
        <Toaster />
        <div id="announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
      </Providers>
      <TranslationCoveragePanel />
    </I18nProvider>
  );

  return (
    <html lang="en" className={cn("font-sans antialiased", fraunces.variable, dmSans.variable)}>
      <body className="min-h-screen bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-md ring-2 ring-ring"
        >
          Skip to main content
        </a>
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>{inner}</GoogleOAuthProvider>
        ) : (
          inner
        )}
      </body>
    </html>
  );
}
