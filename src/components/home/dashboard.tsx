"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, FolderUp, GraduationCap, Sparkles, Wand2, BookOpenCheck, Wrench, CloudOff, Cloud } from "lucide-react";
import { listSchemes, listPlans, listNotes, deleteScheme, deletePlan, deleteNote } from "@/lib/db/store";
import type { ProviderSettings, SchemeOfWork, LessonPlan, LessonNote } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { loadSettings, getDataMode, type DataMode } from "@/lib/settings";
import { pendingSyncCount, deleteRemoteDocument } from "@/lib/offline/sync";
import { useOnline } from "@/hooks/use-online";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Recent {
  kind: "scheme" | "plan" | "note";
  id: string;
  title: string;
  meta: string;
  createdAt: number;
}

export function Dashboard() {
  const router = useRouter();
  const online = useOnline();
  const { toast } = useToast();
  const [recent, setRecent] = React.useState<Recent[]>([]);
  const [pending, setPending] = React.useState(0);
  const [ready, setReady] = React.useState(false);
  const [dataMode, setDataModeState] = React.useState<DataMode>("local");
  const [settings, setSettings] = React.useState<ProviderSettings>(DEFAULT_SETTINGS);

  React.useEffect(() => {
    setDataModeState(getDataMode());
    setSettings(loadSettings());
  }, []);

  const refresh = React.useCallback(async () => {
    const [schemes, plans, notes] = await Promise.all([listSchemes(), listPlans(), listNotes()]);
    const items: Recent[] = [
      ...schemes.map((s) => ({ kind: "scheme" as const, id: s.id, title: s.title, meta: `${s.subject} • ${s.gradeLevel} • ${s.term}`, createdAt: s.createdAt })),
      ...plans.map((p) => ({ kind: "plan" as const, id: p.id, title: p.title, meta: `${p.subject} • ${p.gradeLevel}`, createdAt: p.createdAt })),
      ...notes.map((n) => ({ kind: "note" as const, id: n.id, title: n.title, meta: `${n.subject} • ${n.gradeLevel}`, createdAt: n.createdAt })),
    ];
    items.sort((a, b) => b.createdAt - a.createdAt);
    setRecent(items.slice(0, 8));
  }, []);

  React.useEffect(() => {
    (async () => {
      setPending(await pendingSyncCount());
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const onDelete = async (r: Recent) => {
    if (r.kind === "scheme") await deleteScheme(r.id);
    if (r.kind === "plan") await deletePlan(r.id);
    if (r.kind === "note") await deleteNote(r.id);
    toast({ description: "Document deleted." });
    refresh();
  };

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
        <CardContent className="relative flex flex-col gap-5 p-6 sm:p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-lg space-y-2">
            <h1 className="text-2xl font-bold sm:text-3xl">Plan your teaching in minutes.</h1>
            <p className="text-sm text-white/85">
              Generate curriculum-aligned Schemes of Work, Lesson Plans, and Notes from your own uploads — offline or online, on any device.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" variant="secondary" onClick={() => router.push("/documents")}>
              <FolderUp className="h-4 w-4" /> Upload Files
            </Button>
            <Button size="lg" onClick={() => router.push("/generate")} className="bg-white text-indigo-600 hover:bg-white/90">
              <Sparkles className="h-4 w-4" /> Generate Materials
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <StatCard icon={online ? Cloud : CloudOff} label="Connection" value={online ? "Online" : "Offline"} tone={online ? "text-emerald-600" : "text-amber-600"} />
        <StatCard icon={GraduationCap} label="Storage" value={dataMode === "supabase" ? "Supabase" : "Device (local)"} />
        <StatCard icon={Wand2} label="AI Engine" value={settings.llmProvider === "offline" ? "Offline generator" : settings.llmProvider} />
        <StatCard icon={Wrench} label="Sync queue" value={String(pending)} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent documents</CardTitle>
            <CardDescription>Your generated teaching materials</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/library">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="space-y-3 text-center py-6">
              <BookOpenCheck className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No documents yet.</p>
              <Button asChild>
                <Link href="/curriculum">
                  Choose your curriculum <Sparkles className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/${r.kind === "scheme" ? "scheme" : r.kind === "plan" ? "plan" : "notes"}/${r.id}`} className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.meta} • {formatDate(r.createdAt)}</p>
                    </div>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="More options">⋯</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/${r.kind === "scheme" ? "scheme" : r.kind === "plan" ? "plan" : "notes"}/${r.id}`)}>Open</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(r)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 ${tone || "text-primary"}`} />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-medium">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}