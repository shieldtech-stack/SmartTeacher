"use client";

import * as React from "react";
import { UploadCloud, FileJson, Loader2, Trash2, CheckCircle2, AlertTriangle, Download, Sparkles, FileText, ChevronDown } from "lucide-react";
import {
  normalizeCurriculumInput,
  importCurricula,
  clearCurriculumData,
  signalCurriculumChanged,
  CURRICULUM_IMPORT_EXAMPLE,
  KICD_IMPORT_EXAMPLE,
  type ImportStats,
} from "@/lib/curriculum/import";
import type { SeedCurriculum } from "@/lib/curriculum/seed-data";
import { convertCurriculumFile } from "@/lib/client/api";
import { loadSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ACCEPT = ".pdf,.docx,.json";

export function CurriculumImporter() {
  const { toast } = useToast();
  const designInputRef = React.useRef<HTMLInputElement>(null);
  const jsonInputRef = React.useRef<HTMLInputElement>(null);
  const [mode, setMode] = React.useState<"design" | "json">("design");
  const [busy, setBusy] = React.useState(false);
  const [designError, setDesignError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);

  // staged (reviewable) extraction result
  const [staged, setStaged] = React.useState<SeedCurriculum[] | null>(null);
  const [stats, setStats] = React.useState<ImportStats | null>(null);
  const [source, setSource] = React.useState<"llm" | "heuristic" | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  // json (advanced) mode
  const [text, setText] = React.useState("");
  const [parsed, setParsed] = React.useState<SeedCurriculum[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showExample, setShowExample] = React.useState(false);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  const resetPreview = () => {
    setStaged(null);
    setStats(null);
    setSource(null);
    setParsed(null);
    setError(null);
    setDesignError(null);
    setFileName(null);
    setExpanded(null);
  };

  // ---- PDF / DOCX design upload ----
  const onDesignFile = async (file: File | undefined) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      setDesignError("Please choose a curriculum design file (.pdf or .docx).");
      return;
    }
    setBusy(true);
    setDesignError(null);
    setStaged(null);
    setStats(null);
    setSource(null);
    setFileName(file.name);
    try {
      const result = await convertCurriculumFile(file, loadSettings());
      setStaged(result.curricula);
      setStats(result.stats);
      setSource(result.source);
      toast({
        title: result.source === "llm" ? "Design parsed" : "Design extracted",
        description:
          result.source === "llm"
            ? `Found ${result.stats.strands} strands across ${result.stats.subtopics} subtopics. Review then import.`
            : "Extracted by pattern matching — review carefully, then import.",
      });
    } catch (e) {
      setDesignError(e instanceof Error ? e.message : "Could not convert this file.");
      setFileName(null);
      setStaged(null);
      setStats(null);
      setSource(null);
    } finally {
      setBusy(false);
    }
  };

  // ---- JSON (advanced) mode ----
  const validate = (raw: string) => {
    setParsed(null);
    setError(null);
    if (!raw.trim()) {
      setError("Paste some JSON, or choose a .json file.");
      return;
    }
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      setError("That is not valid JSON. Check for missing commas, quotes or brackets.");
      return;
    }
    const result = normalizeCurriculumInput(value);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStaged(result.items);
    setStats(result.stats);
    setSource(null);
  };

  const onJsonFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Please choose a .json file.");
      return;
    }
    const content = await file.text();
    setText(content);
    validate(content);
  };

  const onImport = async () => {
    if (!staged) return;
    setBusy(true);
    try {
      const { added, skipped } = await importCurricula(staged);
      signalCurriculumChanged();
      toast({
        title: "Curriculum imported",
        description: `${added} curriculum(s) added${skipped ? `, ${skipped} skipped (already present)` : ""}.`,
      });
      setText("");
      resetPreview();
    } catch (e) {
      toast({ title: "Import failed", description: e instanceof Error ? e.message : "Import failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const onClear = async () => {
    setShowClearConfirm(true);
  };

  const confirmClear = async () => {
    setShowClearConfirm(false);
    setBusy(true);
    try {
      await clearCurriculumData();
      signalCurriculumChanged();
      toast({ description: "All curriculum data removed from this device." });
      resetPreview();
    } finally {
      setBusy(false);
    }
  };

  const downloadExample = () => {
    const blob = new Blob([CURRICULUM_IMPORT_EXAMPLE], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "curriculum-design-example.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderContent = () => (
    <Card id="curriculum-import">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5 text-primary" /> Import a curriculum design
        </CardTitle>
        <CardDescription>
          SmartTeacher does not ship with built-in curriculum data. Upload the official KICD design PDF for your class
          (or any design) and it is converted automatically — no JSON needed. It stays on your device and powers your
          Schemes of Work, Lesson Plans and Notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={mode === "design" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("design")}
            disabled={busy}
          >
            <UploadCloud className="h-4 w-4" /> Upload design file
          </Button>
          <Button
            variant={mode === "json" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("json")}
            disabled={busy}
          >
            <FileJson className="h-4 w-4" /> Advanced: JSON
          </Button>
        </div>

        {mode === "design" ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onDesignFile(e.dataTransfer.files?.[0]);
            }}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {busy ? (
                <>
                  <FileText className="mr-1 inline h-4 w-4" /> {fileName ?? "File"} — converting…
                </>
              ) : fileName ? (
                <>
                  <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-600" /> {fileName} — extracted, review below
                </>
              ) : (
                "Drop a curriculum design PDF here"
              )}
            </p>
            {busy && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {!busy && (
              <input
                ref={designInputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => onDesignFile(e.target.files?.[0])}
              />
            )}
            {!busy && (
              <Button variant="outline" size="sm" onClick={() => designInputRef.current?.click()}>
                Choose a .pdf (or .docx) file
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onJsonFile(e.dataTransfer.files?.[0]);
              }}
            >
              <input ref={jsonInputRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => onJsonFile(e.target.files?.[0])} />
              <Button variant="outline" size="sm" onClick={() => jsonInputRef.current?.click()} disabled={busy}>
                Choose .json file
              </Button>
              <p className="text-xs text-muted-foreground">…or paste JSON below</p>
            </div>
            <Textarea
              placeholder="Paste curriculum JSON here"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] font-mono text-xs"
            />
          </div>
        )}

        {(designError || error) && (
          <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {designError || error}
          </p>
        )}

        {source === "heuristic" && (
          <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Extracted by pattern matching (no AI engine configured). Verify the strands and subtopics below before
            importing — you can enable an AI provider in Settings for a more accurate conversion.
          </p>
        )}

        {stats && staged && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">Ready to import:</span>
            <Badge variant="secondary">{stats.curricula} curriculum</Badge>
            <Badge variant="secondary">{stats.subjects} subjects</Badge>
            <Badge variant="secondary">{stats.strands} strands</Badge>
            <Badge variant="secondary">{stats.subtopics} subtopics</Badge>
          </div>
        )}

        {staged && (
          <div className="space-y-2">
            {!source && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" /> Preview: click a curriculum to see its strands and subtopics.
              </p>
            )}
            {staged.map((cur, i) => {
              const isOpen = expanded === `${i}`;
              return (
                <div key={i} className="rounded-md border p-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 text-left"
                    onClick={() => setExpanded(isOpen ? null : `${i}`)}
                  >
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      {cur.curriculum.name}
                      <Badge variant="secondary">{cur.curriculum.gradeLevel}</Badge>
                      {cur.subjects.map((s) => (
                        <Badge key={s.id} variant="outline">{s.name}</Badge>
                      ))}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mt-2 max-h-72 space-y-2 overflow-auto pl-6 text-sm">
                      {cur.subjects.map((s) =>
                        s.strands.map((st) => (
                          <div key={st.id}>
                            <p className="font-medium text-foreground/90">{st.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {st.subtopics.length} subtopics · {st.subtopics.reduce((n, sub) => n + sub.learningOutcomes.length, 0)} learning
                              outcomes
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {mode === "json" && (
            <Button onClick={() => validate(text)} disabled={busy || !text.trim()} variant="secondary">
              Validate
            </Button>
          )}
          <Button onClick={onImport} disabled={busy || !staged}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {fileName && staged ? "Import extracted design" : "Import"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowExample((v) => !v)}>
            {showExample ? "Hide format" : "Show format"}
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadExample}>
            <Download className="h-4 w-4" /> Example
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={onClear} disabled={busy}>
            <Trash2 className="h-4 w-4" /> Clear all curriculum data
          </Button>
        </div>

        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold mb-2">Clear all curriculum data?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This will permanently delete all imported curricula, schemes, lesson plans, and notes.
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={confirmClear} disabled={busy}>
                  <Trash2 className="h-4 w-4 mr-1" /> Yes, delete everything
                </Button>
              </div>
            </div>
          </div>
        )}

        {showExample && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Both the app format and the official KICD design format (pasted straight from a design export) are accepted.
            </p>
            <p className="text-xs font-medium">App format</p>
            <pre className="max-h-60 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">{CURRICULUM_IMPORT_EXAMPLE}</pre>
            <p className="text-xs font-medium">KICD design format</p>
            <pre className="max-h-60 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">{KICD_IMPORT_EXAMPLE}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Card id="curriculum-import">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5 text-primary" /> Import a curriculum design
        </CardTitle>
        <CardDescription>
          SmartTeacher does not ship with built-in curriculum data. Upload the official KICD design PDF for your class
          (or any design) and it is converted automatically — no JSON needed. It stays on your device and powers your
          Schemes of Work, Lesson Plans and Notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderContent()}
      </CardContent>
    </Card>
  );
}