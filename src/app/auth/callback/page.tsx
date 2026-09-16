"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { getSupabase } from "@/lib/db/supabase-client";
import { Button } from "@/components/ui/button";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const code = params.get("code");
    const next = params.get("next") || "/";
    if (!code) {
      setError("This sign-in link is invalid or has already been used.");
      return;
    }
    (async () => {
      const sb = getSupabase();
      if (!sb) {
        setError("Supabase is not configured on this device.");
        return;
      }
      try {
        const { error: ex } = await sb.auth.exchangeCodeForSession(code);
        if (ex) throw ex;
        router.replace(next);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign-in failed. Please request a new link.");
      }
    })();
  }, [params, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      {error ? (
        <>
          <XCircle className="h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Sign-in failed</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/auth">Try again</Link>
          </Button>
        </>
      ) : (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}