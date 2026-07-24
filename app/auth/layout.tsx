import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" tabIndex={-1} className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] mx-auto">
        {/* Top bar */}
        <div className="flex flex-col items-center mb-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="font-bold text-foreground text-2xl tracking-tight group-hover:text-primary transition-colors">
              BettaPay
            </span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1.5">Stellar-powered merchant payments</p>
        </div>

        {/* Form content */}
        <div className="w-full">
          {children}
        </div>

        {/* Bottom note */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-muted-foreground">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-muted-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
