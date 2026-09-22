"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, FileJson, Sparkles, Loader2 } from "lucide-react";
import {
  listCurricula,
  listSubjects,
  listStrands,
  listSubtopics,
} from "@/lib/db/store";
import type { Curriculum, Subject, Strand, Subtopic, CurriculumSelection, Term } from "@/lib/types";
import { loadSelection, saveSelection } from "@/lib/db/store";
import { seedCurriculaIfEmpty } from "@/lib/curriculum/seed";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Steps } from "@/components/ui/steps";
import { useToast } from "@/hooks/use-toast";

const TERMS: Term[] = ["Term 1", "Term 2", "Term 3"];
const DURATIONS = [35, 40, 45, 60];
const WEEKS_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 13, 14];
const LESSONS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6];

export function CurriculumWizard({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => setMounted(true), []);
  
  const saved = mounted ? loadSelection() : { curriculumId: "", subjectId: "", strandId: "", subtopicIds: [] };

  const [step, setStep] = React.useState(0);
  const [curricula, setCurricula] = React.useState<Curriculum[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [strands, setStrands] = React.useState<Strand[]>([]);
  const [subtopics, setSubtopics] = React.useState<Subtopic[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadingSubjects, setLoadingSubjects] = React.useState(false);
  const [loadingStrands, setLoadingStrands] = React.useState(false);
  const [loadingSubtopics, setLoadingSubtopics] = React.useState(false);

  const [curriculumId, setCurriculumId] = React.useState(saved.curriculumId || "");
  const [subjectId, setSubjectId] = React.useState(saved.subjectId || "");
  const [strandId, setStrandId] = React.useState(saved.strandId || "");
  const [subtopicIds, setSubtopicIds] = React.useState<string[]>(saved.subtopicIds || []);
  const [term, setTerm] = React.useState<Term>(saved.term || "Term 1");
  const [year, setYear] = React.useState<number>(saved.year || new Date().getFullYear());
  const [durationMinutes, setDurationMinutes] = React.useState<number>(saved.durationMinutes || 40);
  const [weeksPerTerm, setWeeksPerTerm] = React.useState<number>(saved.weeksPerTerm || 13);
  const [lessonsPerWeek, setLessonsPerWeek] = React.useState<number>(saved.lessonsPerWeek || 2);

  React.useEffect(() => {
    const load = async () => {
      await seedCurriculaIfEmpty();
      const c = await listCurricula();
      setCurricula(c);
      setLoaded(true);
    };
    load();
    window.addEventListener("st-curriculum-changed", load);
    return () => window.removeEventListener("st-curriculum-changed", load);
  }, []);

  React.useEffect(() => {
    if (!curriculumId) {
      setSubjects([]);
      setLoadingSubjects(false);
      return;
    }
    setLoadingSubjects(true);
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.error("listSubjects timeout for curriculumId:", curriculumId);
        setSubjects([]);
        setLoadingSubjects(false);
      }
    }, 5000);
    listSubjects(curriculumId)
      .then((s) => { if (!cancelled) { clearTimeout(timeout); setSubjects(s); setLoadingSubjects(false); } })
      .catch((e) => { if (!cancelled) { clearTimeout(timeout); console.error("listSubjects error:", e); setSubjects([]); setLoadingSubjects(false); } });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [curriculumId]);

  React.useEffect(() => {
    if (!subjectId) {
      setStrands([]);
      setLoadingStrands(false);
      return;
    }
    setStrandId("");
    setSubtopicIds([]);
    setSubtopics([]);
    setLoadingStrands(true);
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.error("listStrands timeout for subjectId:", subjectId);
        setStrands([]);
        setLoadingStrands(false);
      }
    }, 5000);
    listStrands(subjectId)
      .then((s) => { if (!cancelled) { clearTimeout(timeout); setStrands(s); setLoadingStrands(false); } })
      .catch((e) => { if (!cancelled) { clearTimeout(timeout); console.error("listStrands error:", e); setStrands([]); setLoadingStrands(false); } });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [subjectId]);

  React.useEffect(() => {
    if (!strandId) {
      setSubtopics([]);
      setLoadingSubtopics(false);
      return;
    }
    setSubtopicIds([]);
    setLoadingSubtopics(true);
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.error("listSubtopics timeout for strandId:", strandId);
        setSubtopics([]);
        setLoadingSubtopics(false);
      }
    }, 5000);
    listSubtopics(strandId)
      .then((s) => { if (!cancelled) { clearTimeout(timeout); setSubtopics(s); setLoadingSubtopics(false); } })
      .catch((e) => { if (!cancelled) { clearTimeout(timeout); console.error("listSubtopics error:", e); setSubtopics([]); setLoadingSubtopics(false); } });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [strandId]);

  const toggleSubtopic = (id: string) => {
    setSubtopicIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canContinue = React.useMemo(() => {
    if (step === 0) return Boolean(curriculumId && subjectId);
    if (step === 1) return Boolean(strandId);
    return subtopicIds.length > 0;
  }, [step, curriculumId, subjectId, strandId, subtopicIds]);

  const buildSelection = (): CurriculumSelection => ({
    curriculumId,
    subjectId,
    strandId,
    subtopicIds,
    term,
    year,
    durationMinutes,
    weeksPerTerm,
    lessonsPerWeek,
    gradeLevel: curricula.find((c) => c.id === curriculumId)?.gradeLevel,
    subjectName: subjects.find((s) => s.id === subjectId)?.name,
    strandName: strands.find((s) => s.id === strandId)?.title,
  });

  const handleSave = () => {
    saveSelection(buildSelection());
    toast({ description: "Curriculum selection saved." });
  };

  const handleGoGenerate = () => {
    const sel = buildSelection();
    saveSelection(sel);
    toast({ description: "Selection saved. Choose what to generate." });
    router.push("/generate");
  };

  const selectedSubtopicCount = subtopicIds.length;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Steps steps={compact ? ["Subject", "Strand", "Subtopics"] : ["Grade & Subject", "Strand / Topic", "Subtopics & Settings"]} current={step} />
      </Card>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">1. Select Grade / Curriculum</Label>
            {loaded && curricula.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <FileJson className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No curriculum designs on this device yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Import the official KICD design (or your own) as JSON in the panel below to get started.
                </p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <a href="#curriculum-import">Go to import</a>
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {curricula.map((c) => {
                  const active = curriculumId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCurriculumId(c.id);
                        setSubjectId("");
                        setStrandId("");
                        setSubtopicIds([]);
                      }}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                        active ? "border-primary bg-primary/5" : "hover:bg-muted"
                      )}
                    >
                      {active ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> : <span className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/40" />}
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.gradeLevel} · {c.country}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

{curriculumId && (
            <div className="space-y-2">
              <Label className="block">2. Select Subject</Label>
              {loadingSubjects ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading subjects…
                </div>
              ) : subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subjects found for this curriculum.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubjectId(s.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                        subjectId === s.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                      )}
                    >
                      {subjectId === s.id ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <span className="h-3.5 w-3.5 rounded-full border" />}
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <Label className="block">Select Strand / Topic</Label>
          {loadingStrands ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading strands…
            </div>
          ) : strands.length === 0 ? (
            <p className="text-sm text-muted-foreground">No strands found for this subject.</p>
          ) : (
            strands.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStrandId(s.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  strandId === s.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                )}
              >
                {strandId === s.id ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : <span className="h-4 w-4 shrink-0 rounded-full border" />}
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <Label className="mb-2 block">
              Select Subtopics / Learning Outcomes{" "}
              {selectedSubtopicCount > 0 && <span className="text-muted-foreground">({selectedSubtopicCount} selected)</span>}
            </Label>
            {loadingSubtopics ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading subtopics…
              </div>
            ) : subtopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subtopics found for this strand.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {subtopics.map((s) => {
                const checked = subtopicIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors",
                      checked ? "border-primary bg-primary/5" : "hover:bg-muted"
                    )}
                  >
                    <Checkbox className="mt-0.5" checked={checked} onChange={() => toggleSubtopic(s.id)} />
                    <div>
                      <p className="text-sm font-medium">
                        {s.title}
                        {s.lessonCount ? <span className="ml-1 text-xs text-muted-foreground">({s.lessonCount} lessons)</span> : null}
                      </p>
                      <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                        {s.learningOutcomes.map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                      {s.suggestedExperiences && s.suggestedExperiences.length > 0 && (
                        <p className="mt-1 text-[11px] text-muted-foreground/80">
                          Suggested activities: {s.suggestedExperiences.length}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Term</Label>
              <Select value={term} onValueChange={(v) => setTerm(v as Term)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Academic Year</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[year - 1, year, year + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lesson Duration</Label>
              <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Scheme Length (weeks)</Label>
              <Select value={String(weeksPerTerm)} onValueChange={(v) => setWeeksPerTerm(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEKS_OPTIONS.map((w) => (
                    <SelectItem key={w} value={String(w)}>{w} weeks</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lessons per Week</Label>
              <Select value={String(lessonsPerWeek)} onValueChange={(v) => setLessonsPerWeek(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LESSONS_PER_WEEK_OPTIONS.map((l) => (
                    <SelectItem key={l} value={String(l)}>{l} lesson{l > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave}>Save Selection</Button>
          {step < 2 ? (
            <Button onClick={() => canContinue && setStep((s) => s + 1)} disabled={!canContinue}>
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleGoGenerate} disabled={!canContinue}>
              <Sparkles className="h-4 w-4" /> Generate Materials
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}