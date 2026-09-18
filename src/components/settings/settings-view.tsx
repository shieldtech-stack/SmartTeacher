"use client";

import * as React from "react";
import Link from "next/link";
import { Save, Database, Cpu, Globe, User as UserIcon, LogOut, RefreshCw, Loader2 } from "lucide-react";
import { loadSettings, saveSettings, getDataMode, setDataMode, type DataMode } from "@/lib/settings";
import { supabaseConfigured } from "@/lib/db/supabase-client";
import { pendingSyncCount, flushSyncQueue, pullDocuments } from "@/lib/offline/sync";
import { useAuth } from "@/lib/auth/context";
import type { ProviderSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export function SettingsView() {
  const { toast } = useToast();
  const { user, initializing, signIn, signOut } = useAuth();
  const [settings, setSettings] = React.useState<ProviderSettings>(loadSettings());
  const [dataMode, setDataModeState] = React.useState<DataMode>(getDataMode());
  const [pending, setPending] = React.useState(0);
  const [syncing, setSyncing] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    pendingSyncCount().then(setPending);
  }, []);

  const update = (patch: Partial<ProviderSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const onSave = () => {
    saveSettings(settings);
    toast({ title: "Settings saved", description: "Your generation preferences were updated." });
  };

  const onSaveMode = (mode: DataMode) => {
    if (mode === "supabase" && !user) {
      toast({ title: "Sign in required", description: "Create a free cloud account to sync documents across devices.", variant: "destructive" });
      return;
    }
    setDataMode(mode);
    setDataModeState(mode);
    toast({
      title: "Storage updated",
      description: mode === "supabase" ? "Documents will sync to the cloud and follow you across devices." : "Documents stay on this device.",
    });
    if (mode === "supabase") {
      launchSync();
    }
  };

  const launchSync = async () => {
    setSyncing(true);
    try {
      const pulled = await pullDocuments();
      const res = await flushSyncQueue();
      toast({ description: `Sync complete: ${pulled.pulled} pulled, ${res.pushed} pushed, ${res.failed} failed.` });
      setPending(await pendingSyncCount());
    } catch (e) {
      toast({ title: "Sync failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const onSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await signIn(email.trim());
      toast({ title: "Magic link sent", description: "Check your inbox to finish signing in." });
      setEmail("");
    } catch (err) {
      toast({ title: "Could not send link", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Tabs defaultValue="account">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="account"><UserIcon className="mr-1 h-4 w-4" /> Account</TabsTrigger>
        <TabsTrigger value="engine"><Cpu className="mr-1 h-4 w-4" /> Generation</TabsTrigger>
        <TabsTrigger value="search"><Globe className="mr-1 h-4 w-4" /> Web Search</TabsTrigger>
        <TabsTrigger value="storage"><Database className="mr-1 h-4 w-4" /> Storage</TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Cloud account</CardTitle>
            <CardDescription>
              Sign in to sync your documents to the cloud and access them from any device. The app stays fully usable offline without an account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {initializing ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Signed in · cloud sync enabled</p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={launchSync} disabled={syncing}>
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync now
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => signOut()}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSendLink} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email">Email address</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    required
                    placeholder="teacher@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!supabaseConfigured()}
                  />
                </div>
                <Button type="submit" size="sm" disabled={sending || !supabaseConfigured()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {sending ? "Sending…" : "Send magic link"}
                </Button>
                {!supabaseConfigured() && (
                  <p className="text-xs text-amber-600">
                    Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                    <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable accounts.
                  </p>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="engine" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>AI Generation Engine</CardTitle>
            <CardDescription>
              The offline template generator works with no keys. OpenAI or Anthropic give richer outputs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={settings.llmProvider} onValueChange={(v) => update({ llmProvider: v as ProviderSettings["llmProvider"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">Offline template generator (no API key)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="google">Google Gemini (free tier)</SelectItem>
                  <SelectItem value="openrouter">OpenRouter (100+ models)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.llmProvider === "openai" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>OpenAI API key</Label>
                  <Input type="password" value={settings.openaiKey} onChange={(e) => update({ openaiKey: e.target.value })} placeholder="sk-..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  <Input value={settings.openaiModel} onChange={(e) => update({ openaiModel: e.target.value })} />
                </div>
              </div>
            )}

            {settings.llmProvider === "anthropic" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Anthropic API key</Label>
                  <Input type="password" value={settings.anthropicKey} onChange={(e) => update({ anthropicKey: e.target.value })} placeholder="sk-ant-..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  <Input value={settings.anthropicModel} onChange={(e) => update({ anthropicModel: e.target.value })} />
                </div>
              </div>
            )}

            {settings.llmProvider === "google" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Google API key</Label>
                  <Input type="password" value={settings.googleKey} onChange={(e) => update({ googleKey: e.target.value })} placeholder="AIza..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  <Input value={settings.googleModel} onChange={(e) => update({ googleModel: e.target.value })} placeholder="gemini-1.5-flash" />
                </div>
              </div>
            )}

            {settings.llmProvider === "openrouter" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>OpenRouter API key</Label>
                  <Input type="password" value={settings.openrouterKey} onChange={(e) => update({ openrouterKey: e.target.value })} placeholder="sk-or-v1-..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  <Input value={settings.openrouterModel} onChange={(e) => update({ openrouterModel: e.target.value })} placeholder="google/gemini-flash-1.5" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Embedding provider</Label>
              <Select value={settings.embeddingProvider} onValueChange={(v) => update({ embeddingProvider: v as ProviderSettings["embeddingProvider"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local hashing (offline)</SelectItem>
                  <SelectItem value="openai">OpenAI text-embedding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Top-K retrieval chunks</Label>
              <Select value={String(settings.topK)} onValueChange={(v) => update({ topK: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 5, 8, 10].map((k) => (
                    <SelectItem key={k} value={String(k)}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              API keys are stored in your browser only (localStorage) and sent to the provider when generating. Never shared.
            </p>
            <Button onClick={onSave}><Save className="h-4 w-4" /> Save Generation Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="search" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Live Web Search</CardTitle>
            <CardDescription>Fetch fresh context when your own documents are sparse.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Use web search during generation</p>
                <p className="text-xs text-muted-foreground">When enabled, top sources are added as context.</p>
              </div>
              <Button variant={settings.useWebSearch ? "default" : "outline"} size="sm" onClick={() => update({ useWebSearch: !settings.useWebSearch })}>
                {settings.useWebSearch ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={settings.webSearchProvider} onValueChange={(v) => update({ webSearchProvider: v as ProviderSettings["webSearchProvider"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="tavily">Tavily</SelectItem>
                  <SelectItem value="brave">Brave Search API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.webSearchProvider === "tavily" && (
              <div className="space-y-1.5">
                <Label>Tavily API key</Label>
                <Input type="password" value={settings.tavilyKey} onChange={(e) => update({ tavilyKey: e.target.value })} placeholder="tvly-..." />
              </div>
            )}
            {settings.webSearchProvider === "brave" && (
              <div className="space-y-1.5">
                <Label>Brave Search API key</Label>
                <Input type="password" value={settings.braveKey} onChange={(e) => update({ braveKey: e.target.value })} placeholder="BSA..." />
              </div>
            )}

            <Button onClick={onSave}><Save className="h-4 w-4" /> Save Search Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="storage" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Storage & Sync</CardTitle>
            <CardDescription>SmartTeacher is offline-first: everything is stored on this device and optionally synced to your cloud account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <StorageOption
                title="Local device (offline-first)"
                desc="Documents, chunks and generations live in the browser's IndexedDB. Works with no internet."
                active={dataMode === "local"}
                onClick={() => onSaveMode("local")}
              />
              <StorageOption
                title="My cloud account"
                desc="Sync documents to your account so they follow you across devices. Requires signing in."
                active={dataMode === "supabase"}
                disabled={!supabaseConfigured()}
                onClick={() => onSaveMode("supabase")}
              />
            </div>
            {!supabaseConfigured() && (
              <p className="text-xs text-amber-600">
                Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to activate cloud mode.
              </p>
            )}
            {supabaseConfigured() && !user && (
              <p className="text-xs text-amber-600">
                You are not signed in. <Link href="/auth" className="underline">Sign in</Link> to sync your documents to the cloud.
              </p>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Pending sync queue</p>
                <p className="text-xs text-muted-foreground">{pending} record(s) waiting to sync</p>
              </div>
              <Button variant="outline" size="sm" onClick={launchSync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync now
              </Button>
            </div>
            {pending > 0 && <Badge variant="warning">Unsaved changes queue automatically in the background</Badge>}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function StorageOption({
  title,
  desc,
  active,
  disabled,
  onClick,
}: {
  title: string;
  desc: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border p-3 text-left transition-colors ${active ? "border-primary bg-primary/5" : "hover:bg-muted"} ${disabled ? "opacity-50" : ""}`}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      {active && <Badge className="mt-2" variant="secondary">Active</Badge>}
    </button>
  );
}