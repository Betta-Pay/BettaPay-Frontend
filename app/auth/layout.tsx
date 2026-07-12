import { CheckCircle2 } from "lucide-react";
import Image from "next/image";

const highlights = [
  "Non-custodial — you always control your funds",
  "Settle in seconds via Stellar Soroban",
  "Auto fiat off-ramp to local bank accounts",
  "Transparent on-chain fee splits",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen flex">
      {/* Left Pane — Form */}
      <div className="w-full lg:w-[52%] flex flex-col bg-card">
        {/* Top bar */}
        <div className="flex items-center justify-center lg:justify-start gap-2.5 px-4 sm:px-8 py-6 border-b border-border">
          <Image
            src="/logo.png"
            alt="BettaPay - Return to homepage"
            width={32}
            height={32}
            priority={true}
            className="w-8 h-8 rounded-lg object-contain"
          />
          <span className="font-bold text-foreground text-lg tracking-tight">
            BettaPay
          </span>
        </div>

        {/* Form content */}
        <div className="flex-1 flex items-center justify-center overflow-y-auto px-4 sm:px-8 py-12">
          <div className="w-full max-w-[420px] mx-auto">{children}</div>
        </div>

        {/* Bottom note */}
        <div className="px-4 sm:px-8 py-5 border-t border-border text-center lg:text-left">
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

      {/* Right Pane - Visual Area (Hidden on Mobile) */}
      <div className="hidden lg:flex w-[48%] relative overflow-hidden items-center justify-center bg-sidebar">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-info/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />

        {/* Branding Content */}
        <div className="relative z-10 p-16 max-w-lg w-full">
          {/* Icon + brand */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
              <Image
                src="/logo.png"
                alt="BettaPay Logo"
                width={48}
                height={48}
                priority={true}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              BettaPay
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            Global settlement,
            <br />
            <span className="text-primary">zero friction.</span>
          </h2>

          <p className="text-sidebar-foreground/60 text-lg leading-relaxed mb-12">
            The next-generation payment platform for African businesses. Accept
            USDC, convert via SEP-24 anchors, and settle directly to your bank.
          </p>

          {/* Feature list */}
          <ul className="space-y-4 mb-14">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                <span className="text-sidebar-foreground/70 text-base leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          {/* Status bar */}
          <div className="mt-auto pt-8 border-t border-sidebar-border flex items-center gap-6 text-sm font-medium">
            <span className="flex items-center gap-2 text-sidebar-foreground/60">
              <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_var(--success)/0.6] animate-pulse" />
              System Operational
            </span>
            <span className="text-sidebar-foreground/40">•</span>
            <span className="text-sidebar-foreground/60">Soroban Testnet</span>
          </div>
        </div>
      </div>
    </main>
  );
}
