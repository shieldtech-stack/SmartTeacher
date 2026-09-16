"use client";

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "@/lib/db/supabase-client";
import { setAuthUserId } from "@/lib/auth/store";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  initializing: boolean;
  configured: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [initializing, setInitializing] = React.useState(true);
  const sb = supabaseConfigured() ? getSupabase() : null;

  React.useEffect(() => {
    const sync = (next: Session | null) => {
      setSession(next);
      setAuthUserId(next?.user.id ?? null);
    };

    let unsub: (() => void) | undefined;
    (async () => {
      if (!sb) {
        sync(null);
        setInitializing(false);
        return;
      }
      const { data } = await sb.auth.getSession();
      sync(data.session);
      setInitializing(false);
      const { data: sub } = sb.auth.onAuthStateChange((_event, next) => sync(next));
      unsub = sub.subscription.unsubscribe.bind(sub.subscription);
    })();

    return () => unsub?.();
  }, [sb]);

  const signIn = React.useCallback(
    async (email: string) => {
      if (!sb) throw new Error("Supabase auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      if (error) throw error;
    },
    [sb]
  );

  const signOut = React.useCallback(async () => {
    if (sb) await sb.auth.signOut();
    setSession(null);
    setAuthUserId(null);
  }, [sb]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      initializing,
      configured: supabaseConfigured(),
      signIn,
      signOut,
    }),
    [session, initializing, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}