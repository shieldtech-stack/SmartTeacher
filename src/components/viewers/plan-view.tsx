"use client";

import * as React from "react";
import { notFound, useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { getPlan } from "@/lib/db/store";
import type { LessonActivity, LessonPlan } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportToolbar } from "@/components/export/export-toolbar";
import { downloadPlanDocx } from "@/lib/export/docx";
import { downloadPlanPdf } from "@/lib/export/pdf";

const PHASE_COLOR: Record<LessonActivity["phase"], string> = {
  introduction: "border-emerald-200 bg-emerald-50 text-emerald-700",
  main: "border-indigo-200 bg-indigo-50 text-indigo-700",
  conclusion: "border-amber-200 bg-amber-50 text-amber-700",
};

export function PlanView({ id }: { id: string }) {
  const router = useRouter();
  const [plan, setPlan] = React.useState<LessonPlan | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    getPlan(id).then((p) => {
      setPlan(p || null);
      setReady(true);
    });
  }, [id]);

  if (!ready) return null;
  if (!plan) return notFound();

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/library")}>
          <ArrowLeft className="h-4 w-4" /> Library
        </Button>
        <ExportToolbar onWord={() => downloadPlanDocx(plan)} onPdf={() => downloadPlanPdf(plan)} />
      </div>

      <div className="print-page space-y-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{plan.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{plan.subject}</Badge>
            <Badge variant="secondary">{plan.gradeLevel}</Badge>
            <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />{plan.durationMinutes} min</Badge>
            <Badge variant={plan.llmSource === "ai" ? "success" : "outline"}>
              {plan.llmSource === "ai" ? "AI generated" : "Offline template"}
            </Badge>
            <span className="text-xs text-muted-foreground">Created {formatDate(plan.createdAt)}</span>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="mb-2 text-sm font-semibold">Learning Objectives</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {plan.objectives.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>

            {plan.keyInquiryQuestions?.length ? (
              <div>
                <h2 className="mb-2 text-sm font-semibold">Key Inquiry Questions</h2>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {plan.keyInquiryQuestions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            ) : null}

            <div>
              <h2 className="mb-2 text-sm font-semibold">60-Minute Lesson Sequence</h2>
              <div className="grid gap-3 sm:grid-cols-5">
                {plan.activities.map((a, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${PHASE_COLOR[a.phase]}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide">{a.section}</p>
                    <p className="mt-1 text-sm font-medium">{a.durationMinutes} min</p>
                    <p className="mt-1 text-xs opacity-90">{a.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold">Assessment</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">{plan.assessmentMethods.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </div>

            <p className="rounded-lg bg-muted p-3 text-sm">
              <span className="font-medium">Differentiation: </span>{plan.differentiationNotes}
            </p>

            <div>
              <h2 className="mb-2 text-sm font-semibold">Materials & Resources</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">{plan.materials.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}