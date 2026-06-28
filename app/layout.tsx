import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "BettaPay | Non-custodial Merchant Platform",
  description: "Accept USDC and stablecoins easily across Africa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans antialiased", inter.variable)}>
      <body className="min-h-screen bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-md ring-2 ring-ring"
        >
          Skip to main content
        </a>
        <Providers>
          {children}
          <Toaster />
          <div id="announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
        </Providers>
      </body>
    </html>
  );
}
