import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-[420px] mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-center mb-12">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="font-bold text-foreground text-2xl tracking-tight group-hover:text-primary transition-colors">
              BettaPay
            </span>
          </Link>
        </div>

        {/* Form content */}
        <div className="w-full">
          {children}
        </div>

        {/* Bottom note */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <a href="#" className="underline hover:text-muted-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-muted-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
