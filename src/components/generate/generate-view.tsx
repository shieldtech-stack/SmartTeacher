"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ArrowRight, BookOpen, FileText, ListChecks, Cpu } from "lucide-react";
import {
  loadSelection,
  saveSelection,
  getSubtopicsByIds,
  allChunks,
  saveScheme,
  savePlan,
  saveNote,
} from "@/lib/db/store";
import { searchChunks } from "@/lib/retrieval/search";
import { webSearchRequest, generateScheme, generateLessonPlan, generateLessonNotes } from "@/lib/client/api";
import { syncDocument } from "@/lib/offline/sync";
import { loadSettings } from "@/lib/settings";
import type { CurriculumSelection, Subtopic, RetrievalContext, SchemeOfWork, LessonPlan, LessonNote } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Mode = "scheme" | "plan" | "notes";

export function GenerateView() {
  const router = useRouter();
  const { toast } = useToast();
  const [selection, setSelection] = React.useState<CurriculumSelection | null>(null);
  const [subtopics, setSubtopics] = React.useState<Subtopic[]>([]);
  const [mode, setMode] = React.useState<Mode>("scheme");
  const [busy, setBusy] = React.useState<Mode | null>(null);
  const [context, setContext] = React.useState<RetrievalContext>({ chunks: [], webSnippets: [] });
  const [settingsReady, setSettingsReady] = React.useState(false);

  React.useEffect(() => {
    const sel = loadSelection();
    setSelection(sel);
    if (sel.subtopicIds.length) {
      getSubtopicsByIds(sel.subtopicIds).then(setSubtopics);
    }
    setSettingsReady(true);
  }, []);

  const buildContext = async () => {
    const settings = loadSettings();
    const query = [selection?.strandName, ...subtopics.map((s) => s.title)].filter(Boolean).join(" ");
    const chunks = await allChunks();
    const local = searchChunks(query, chunks, settings.topK || 5).map((c) => ({ ...c, fileName: "Uploaded document" }));
    let webSnippets: RetrievalContext["webSnippets"] = [];
    if (settings.useWebSearch && settings.webSearchProvider !== "none") {
      try {
        const res = await webSearchRequest(query, settings);
        webSnippets = res.snippets;
      } catch (e) {
        console.warn("Web search failed", e);
      }
    }
    return { chunks: local, webSnippets };
  };

  const generate = async (target: Mode) => {
    if (!selection || subtopics.length === 0) {
      toast({ title: "Nothing selected", description: "Pick a curriculum, strand and subtopics first.", variant: "destructive" });
      router.push("/curriculum");
      return;
    }
    setBusy(target);
    try {
      const settings = loadSettings();
      const ctx = await buildContext();
      setContext(ctx);
      const payload = { selection, subtopics, settings, context: ctx };

      if (target === "scheme") {
        const scheme = await generateScheme(payload);
        await saveScheme(scheme);
        await syncDocument("scheme", scheme);
        toast({ title: "Scheme of Work ready", description: `${scheme.rows.length} lessons generated.` });
        router.push(`/scheme/${scheme.id}`);
      } else if (target === "plan") {
        const plan = await generateLessonPlan(payload);
        await savePlan(plan);
        await syncDocument("plan", plan);
        toast({ title: "Lesson Plan ready", description: `${plan.activities.length} activity phases.` });
        router.push(`/plan/${plan.id}`);
      } else {
        const notes = await generateLessonNotes(payload);
        await saveNote(notes);
        await syncDocument("note", notes);
        toast({ title: "Lesson Notes ready", description: "Notes saved to your library." });
        router.push(`/notes/${notes.id}`);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Generation failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (!settingsReady) return null;

  const settings = loadSettings();
  const llmLabel =
    settings.llmProvider === "offline" ? "Offline template generator" : settings.llmProvider === "anthropic" ? "Claude (Anthropic)" : "OpenAI";

  return (
    <div className="space-y-6">
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Cpu className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Generation engine</p>
              {settings.llmProvider !== "offline" ? (
                <Badge variant="success">{llmLabel}</Badge>
              ) : (
                <Badge variant="warning">{llmLabel}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                · Web search {settings.useWebSearch && settings.webSearchProvider !== "none" ? settings.webSearchProvider : "off"}
                {" · "}Retrieval {settings.embeddingProvider === "openai" ? "OpenAI embeddings" : "local"}
              </span>
              <Button variant="ghost" size="sm" asChild className="ml-auto">
                <Link href="/settings">Configure</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What would you like to create?</CardTitle>
          <CardDescription>
            SmartTeacher combines your uploaded documents and optional live web search as context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selection || !selection.subtopicIds.length ? (
            <div className="space-y-3 py-4 text-center">
              <ListChecks className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Select your grade, subject, strand and subtopics to begin.</p>
              <Button asChild>
                <Link href="/curriculum">Choose curriculum <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm">
                <p><span className="font-medium">{selection.subjectName}</span> — {selection.gradeLevel} · {selection.strandName} · {selection.term}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {subtopics.map((s) => s.title).join(", ")}
                </p>
              </div>

              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="scheme">Scheme of Work</TabsTrigger>
                  <TabsTrigger value="plan">Lesson Plan</TabsTrigger>
                  <TabsTrigger value="notes">Lesson Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="scheme">
                  <ShortcutCard
                    icon={<BookOpen className="h-5 w-5 text-primary" />}
                    title="Scheme of Work"
                    description="A multi-week termly scheme with lessons, outcomes, inquiry questions, activities, resources and assessment."
                    onClick={() => generate("scheme")}
                    busy={busy === "scheme"}
                  />
                </TabsContent>
                <TabsContent value="plan">
                  <ShortcutCard
                    icon={<ListChecks className="h-5 w-5 text-primary" />}
                    title="Lesson Plan"
                    description="A step-by-step plan for one subtopic: hook, direct instruction, guided practice, independent work and plenary."
                    onClick={() => generate("plan")}
                    busy={busy === "plan"}
                  />
                </TabsContent>
                <TabsContent value="notes">
                  <ShortcutCard
                    icon={<FileText className="h-5 w-5 text-primary" />}
                    title="Lesson Notes"
                    description="Age-appropriate learner study notes with key terms, definitions, worked examples and self-test questions."
                    onClick={() => generate("notes")}
                    busy={busy === "notes"}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>

      {(context.chunks.length > 0 || context.webSnippets.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Retrieval context</CardTitle>
            <CardDescription>Sources used during the last generation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {context.chunks.map((c, i) => (
              <p key={i} className="line-clamp-2 rounded-md border p-2 text-muted-foreground">
                <span className="font-medium text-foreground">Local doc {i + 1}:</span> {c.content}
              </p>
            ))}
            {context.webSnippets.map((s, i) => (
              <p key={i} className="line-clamp-2 rounded-md border p-2 text-muted-foreground">
                <span className="font-medium text-foreground">Web {i + 1}:</span> {s.snippet}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ShortcutCard({
  icon,
  title,
  description,
  onClick,
  busy,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {icon}
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button onClick={onClick} disabled={busy} className="sm:shrink-0">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? "Generating…" : "Generate"}
      </Button>
    </div>
  );
}