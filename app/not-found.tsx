import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getDefaultRoute } from "@/lib/utils";
import { ArrowLeft, Frown, Home, LifeBuoy } from "lucide-react";

export default function NotFound() {
  const { isAuthenticated, role } = getSessionFromCookies(cookies());
  const primaryHref = isAuthenticated ? getDefaultRoute(role) : "/";
  const primaryLabel = isAuthenticated ? "Return to Dashboard" : "Return to Home";
  const PrimaryIcon = isAuthenticated ? Home : ArrowLeft;
  const description = isAuthenticated
    ? "The page you’re looking for doesn’t exist or has moved. Return to your dashboard to continue where you left off."
    : "Sorry, we couldn’t find the page you were looking for. It might have been removed or the URL may be incorrect.";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 p-1">
            <Image
              src="/logo.png"
              alt="BettaPay Logo"
              width={24}
              height={24}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="font-semibold text-foreground">BettaPay</span>
        </Link>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 items-center justify-center px-4"
      >
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            <Frown aria-hidden="true" className="h-10 w-10 text-primary" />
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Error 404
          </p>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Page not found
          </h1>
          <p className="mb-8 max-w-md text-sm text-muted-foreground">
            {description}
          </p>
          <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href={primaryHref}
              className={buttonVariants({
                size: "lg",
                className: "w-full shadow-button sm:w-auto",
              })}
            >
              <PrimaryIcon aria-hidden="true" className="h-4 w-4" />
              {primaryLabel}
            </Link>
            <Link
              href="/contact"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              <LifeBuoy aria-hidden="true" className="h-4 w-4" />
              Contact Support
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <div className="mb-2 flex items-center justify-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/10 p-0.5">
            <Image
              src="/logo.png"
              alt="BettaPay Logo"
              width={16}
              height={16}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="font-semibold text-foreground">BettaPay</span>
        </div>
        <p>
          &copy; 2026 BettaPay Inc. Built on Stellar &middot; Non-custodial payments
        </p>
      </footer>
    </div>
  );
}
