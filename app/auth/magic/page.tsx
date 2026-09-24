"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";
import { ROUTES } from "@/lib/navigation/routes";

type State =
  | { status: "verifying" }
  | { status: "success" }
  | { status: "error"; code: string; message: string };

function MagicCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ status: "verifying" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setState({
        status: "error",
        code: "invalid",
        message: "This sign-in link is missing its token.",
      });
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/magic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          message?: string;
          redirectTo?: string;
        };
        if (res.ok && body.ok) {
          setState({ status: "success" });
          setTimeout(() => router.replace(body.redirectTo ?? ROUTES.DASHBOARD), 900);
          return;
        }
        setState({
          status: "error",
          code: body.error ?? "invalid",
          message: body.message ?? "This sign-in link could not be verified.",
        });
      } catch {
        setState({
          status: "error",
          code: "network",
          message: "We couldn't reach the server. Try the link again.",
        });
      }
    })();
  }, [token, router]);

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      {state.status === "verifying" && (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Signing you in&hellip;</p>
        </div>
      )}

      {state.status === "success" && (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-10">
          <CheckCircle2 className="w-8 h-8 text-success" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">You&apos;re in. Redirecting&hellip;</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="py-8">
          <XCircle className="w-8 h-8 text-destructive mx-auto" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold text-foreground">
            {state.code === "used"
              ? "Link already used"
              : state.code === "expired"
                ? "Link expired"
                : "Link not valid"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>

          <div className="mt-6 text-left">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Request a new sign-in link:
            </p>
            <MagicLinkForm />
          </div>

          <Link
            href={ROUTES.LOGIN}
            className="mt-6 inline-block text-xs font-semibold text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      )}
    </div>
  );
}

export default function MagicLinkCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <MagicCallback />
    </Suspense>
  );
}
