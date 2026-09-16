"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Mail, CheckCircle2, ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function MagicLinkAuth() {
  const { user, initializing, configured, signIn, signOut } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [busyOut, setBusyOut] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await signIn(email.trim());
      setSent(true);
    } catch (err) {
      toast({ title: "Could not send link", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const onSignOut = async () => {
    setBusyOut(true);
    try {
      await signOut();
      window.location.assign("/");
    } finally {
      setBusyOut(false);
    }
  };

  if (initializing) return null;

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/">
          <ArrowLeft className="h-4 w-4" /> Back to app
        </Link>
      </Button>

      {user ? (
        <Card>
          <CardHeader>
            <CardTitle>Signed in</CardTitle>
            <CardDescription>Your documents can sync to the cloud and follow you across devices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-lg border bg-muted/40 p-3 text-sm">
              <span className="font-medium">{user.email}</span>
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Cloud storage is ready. Open <Link href="/settings" className="underline">Settings → Storage</Link> to enable Supabase sync.
            </div>
            <Button variant="outline" onClick={onSignOut} disabled={busyOut}>
              {busyOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out
            </Button>
          </CardContent>
        </Card>
      ) : sent ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Check your inbox
            </CardTitle>
            <CardDescription>
              We emailed a secure sign-in link to <span className="font-medium">{email}</span>. Open it on any device to access your
              cloud documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              No email? Check spam/junk, or{" "}
              <button type="button" className="underline" onClick={() => setSent(false)}>
                try again
              </button>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sign in with your email</CardTitle>
            <CardDescription>
              No password needed. We send a magic link that signs you in on this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!configured ? (
              <p className="text-sm text-amber-600">
                Cloud accounts are not configured yet. Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment, then link the callback
                URL <code className="rounded bg-muted px-1">{typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "/auth/callback"}</code> in
                your Supabase dashboard → Authentication → URL Configuration.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="teacher@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={sending} className="w-full">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {sending ? "Sending…" : "Send magic link"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  New to SmartTeacher? Signing in creates your free cloud account automatically.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}