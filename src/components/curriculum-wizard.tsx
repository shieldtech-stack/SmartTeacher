"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import {
  seedIfEmpty,
} from "@/lib/db/local-store";
import {
  listCurricula,
  listSubjects,
  listStrands,
  listSubtopics,
} from "@/lib/db/store";
import type { Curriculum, Subject, Strand, Subtopic, CurriculumSelection, Term } from "@/lib/types";
import { loadSelection, saveSelection } from "@/lib/db/store";
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

export function CurriculumWizard({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const saved = loadSelection();

  const [step, setStep] = React.useState(0);
  const [curricula, setCurricula] = React.useState<Curriculum[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [strands, setStrands] = React.useState<Strand[]>([]);
  const [subtopics, setSubtopics] = React.useState<Subtopic[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  const [curriculumId, setCurriculumId] = React.useState(saved.curriculumId || "");
  const [subjectId, setSubjectId] = React.useState(saved.subjectId || "");
  const [strandId, setStrandId] = React.useState(saved.strandId || "");
  const [subtopicIds, setSubtopicIds] = React.useState<string[]>(saved.subtopicIds || []);
  const [term, setTerm] = React.useState<Term>(saved.term || "Term 1");
  const [year, setYear] = React.useState<number>(saved.year || new Date().getFullYear());
  const [durationMinutes, setDurationMinutes] = React.useState<number>(saved.durationMinutes || 40);

  React.useEffect(() => {
    (async () => {
      await seedIfEmpty();
      const c = await listCurricula();
      setCurricula(c);
      setLoaded(true);
    })();
  }, []);

  React.useEffect(() => {
    if (!curriculumId) return;
    listSubjects(curriculumId).then(setSubjects);
  }, [curriculumId]);

  React.useEffect(() => {
    if (!subjectId) return;
    setStrandId("");
    setSubtopicIds([]);
    setSubtopics([]);
    listStrands(subjectId).then(setStrands);
  }, [subjectId]);

  React.useEffect(() => {
    if (!strandId) return;
    setSubtopicIds([]);
    listSubtopics(strandId).then(setSubtopics);
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
                      <p className="text-xs text-muted-foreground">{c.country}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {curriculumId && (
            <div className="space-y-2">
              <Label className="block">2. Select Subject</Label>
              {subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Loading subjects…</p>
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
          {strands.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading strands…</p>
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
                      <p className="text-sm font-medium">{s.title}</p>
                      <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                        {s.learningOutcomes.map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    </div>
                  </label>
                );
              })}
            </div>
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