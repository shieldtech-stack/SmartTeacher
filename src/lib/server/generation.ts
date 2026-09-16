import type {
  CurriculumSelection,
  ProviderSettings,
  RetrievalContext,
  SchemeOfWork,
  SchemeRow,
  LessonPlan,
  LessonNote,
  Subtopic,
} from "@/lib/types";
import { callLlm, parseJsonLoose } from "./provider";
import {
  buildSchemeTemplate,
  buildLessonPlanTemplate,
  buildLessonNotesTemplate,
  buildContextBlock,
} from "@/lib/generation/templates";
import { generateId } from "@/lib/utils";

export interface GenerationInput {
  selection: CurriculumSelection;
  subtopics: Subtopic[];
  settings: ProviderSettings;
  context?: RetrievalContext;
}

function contextFor(input: GenerationInput) {
  return buildContextBlock({ chunks: input.context?.chunks || [], webSnippets: input.context?.webSnippets || [] });
}

function describeSubtopics(subtopics: Subtopic[]): string {
  return subtopics
    .map(
      (s, i) =>
        `${i + 1}. ${s.title}\n   Learning outcomes:\n   ${s.learningOutcomes.map((o) => `- ${o}`).join("\n   ")}`
    )
    .join("\n");
}

function hasLlm(settings: ProviderSettings): boolean {
  return settings.llmProvider !== "offline";
}

// ---------------------------------------------------------------------------
// Scheme of Work
// ---------------------------------------------------------------------------

interface SchemeJson {
  title?: string;
  rows?: Partial<SchemeRow>[];
}

async function schemeFromLlm(input: GenerationInput): Promise<SchemeOfWork | null> {
  const { selection, subtopics } = input;
  const system =
    "You are an expert curriculum developer and senior teacher. You generate structured Schemes of Work in valid JSON only. " +
    "Do not include markdown fences, commentary or extra text — output a single JSON object.";

  const user = [
    `Generate a Scheme of Work for the selection below.`,
    `Grade/Level: ${selection.gradeLevel}`,
    `Subject: ${selection.subjectName}`,
    `Strand: ${selection.strandName}`,
    `Term: ${selection.term ?? "Term 1"}, Year: ${selection.year ?? new Date().getFullYear()}`,
    ``,
    `Subtopics to cover:\n${describeSubtopics(subtopics)}`,
    ``,
    contextFor(input),
    ``,
    `Return strict JSON with this exact shape:`,
    `{ "title": string, "rows": [{ "week": number, "lessonNumber": number, "subtopic": string, "learningOutcomes": string[], "keyInquiryQuestions": string[], "learningActivities": string[], "resources": string[], "assessment": string[] }] }`,
    `Each subtopic should have 1-2 lessons. Number lessons sequentially across weeks. Include key inquiry questions, activities, resources and assessment aligned to CBC pedagogy.`,
  ].join("\n");

  const raw = await callLlm({
    provider: input.settings.llmProvider as "openai" | "anthropic",
    openaiKey: input.settings.openaiKey,
    openaiModel: input.settings.openaiModel,
    anthropicKey: input.settings.anthropicKey,
    anthropicModel: input.settings.anthropicModel,
    system,
    user,
    expectJson: input.settings.llmProvider === "openai",
    maxTokens: 4000,
  });

  const parsed = parseJsonLoose<SchemeJson>(raw);
  if (!parsed || !Array.isArray(parsed.rows) || parsed.rows.length === 0) return null;

  const rows: SchemeRow[] = parsed.rows.map((r) => ({
    week: Number(r.week) || 1,
    lessonNumber: Number(r.lessonNumber) || 1,
    strand: r.strand || selection.strandName || "",
    subtopic: r.subtopic || "",
    learningOutcomes: r.learningOutcomes || [],
    keyInquiryQuestions: r.keyInquiryQuestions || [],
    learningActivities: r.learningActivities || [],
    resources: r.resources || [],
    assessment: r.assessment || [],
  }));

  return {
    id: generateId(),
    title: parsed.title || `Scheme of Work — ${selection.subjectName} (${selection.gradeLevel})`,
    gradeLevel: selection.gradeLevel || "",
    subject: selection.subjectName || "",
    strand: selection.strandName || "",
    term: selection.term || "Term 1",
    year: selection.year || new Date().getFullYear(),
    rows,
    durationWeeks: Math.max(...rows.map((r) => r.week)),
    createdAt: Date.now(),
  };
}

export async function generateScheme(input: GenerationInput): Promise<SchemeOfWork> {
  if (hasLlm(input.settings)) {
    try {
      const result = await schemeFromLlm(input);
      if (result) return result;
    } catch (e) {
      console.warn("LLM scheme generation failed, using template:", e);
    }
  }
  return buildSchemeTemplate({
    gradeLevel: input.selection.gradeLevel || "",
    subject: input.selection.subjectName || "",
    strand: input.selection.strandName || "",
    term: input.selection.term || "Term 1",
    year: input.selection.year || new Date().getFullYear(),
    durationWeeks: Math.max(1, Math.ceil(Math.max(1, input.subtopics.length) / 2)),
    subtopics: input.subtopics,
  });
}

// ---------------------------------------------------------------------------
// Lesson Plan
// ---------------------------------------------------------------------------

interface PlanJson {
  title?: string;
  objectives?: string[];
  keyInquiryQuestions?: string[];
  activities?: Array<Partial<LessonPlan["activities"][number]>>;
  assessmentMethods?: string[];
  differentiationNotes?: string;
  materials?: string[];
}

async function planFromLlm(input: GenerationInput): Promise<LessonPlan | null> {
  const { selection, subtopics } = input;
  const primary = subtopics[0];
  const system =
    "You are an expert teacher educator. You generate detailed, classroom-ready Lesson Plans in valid JSON only. " +
    "Do not include markdown fences, commentary or extra text — output a single JSON object.";

  const user = [
    `Generate a lesson plan for the topic below.`,
    `Grade/Level: ${selection.gradeLevel}`,
    `Subject: ${selection.subjectName}`,
    `Strand: ${selection.strandName}`,
    `Topic: ${primary.title}`,
    `Learning outcomes:\n${primary.learningOutcomes.map((o) => `- ${o}`).join("\n")}`,
    ``,
    contextFor(input),
    ``,
    `The plan must fit ${selection.durationMinutes || 40} minutes. Return strict JSON with this exact shape:`,
    `{ "title": string, "objectives": string[], "keyInquiryQuestions": string[], "activities": [{ "section": string, "phase": "introduction" | "main" | "conclusion", "durationMinutes": number, "description": string, "teacherActivity": string[], "learnerActivity": string[] }], "assessmentMethods": string[], "differentiationNotes": string, "materials": string[] }`,
    `Include a 5-minute hook, direct instruction, guided practice, independent work, and a 3-minute plenary, labelled by phase.`,
  ].join("\n");

  const raw = await callLlm({
    provider: input.settings.llmProvider as "openai" | "anthropic",
    openaiKey: input.settings.openaiKey,
    openaiModel: input.settings.openaiModel,
    anthropicKey: input.settings.anthropicKey,
    anthropicModel: input.settings.anthropicModel,
    system,
    user,
    expectJson: input.settings.llmProvider === "openai",
    maxTokens: 3500,
  });

  const parsed = parseJsonLoose<PlanJson>(raw);
  if (!parsed || !Array.isArray(parsed.activities) || parsed.activities.length === 0) return null;

  const template = buildLessonPlanTemplate({
    gradeLevel: selection.gradeLevel || "",
    subject: selection.subjectName || "",
    durationMinutes: selection.durationMinutes || 40,
    subtopic: primary,
    strand: selection.strandName || "",
  });

  return {
    id: generateId(),
    title: parsed.title || template.title,
    topic: primary.title,
    gradeLevel: selection.gradeLevel || "",
    subject: selection.subjectName || "",
    durationMinutes: selection.durationMinutes || 40,
    objectives: parsed.objectives?.length ? parsed.objectives : primary.learningOutcomes,
    keyInquiryQuestions: parsed.keyInquiryQuestions || template.keyInquiryQuestions,
    activities: parsed.activities.map((a) => ({
      section: a.section || "Activity",
      phase: (["introduction", "main", "conclusion"].includes(a.phase as string) ? a.phase : "main") as LessonPlan["activities"][number]["phase"],
      durationMinutes: Number(a.durationMinutes) || 5,
      description: a.description || "",
      teacherActivity: a.teacherActivity?.length ? a.teacherActivity : template.activities[0].teacherActivity,
      learnerActivity: a.learnerActivity?.length ? a.learnerActivity : template.activities[0].learnerActivity,
    })),
    assessmentMethods: parsed.assessmentMethods?.length ? parsed.assessmentMethods : template.assessmentMethods,
    differentiationNotes: parsed.differentiationNotes || template.differentiationNotes,
    materials: parsed.materials?.length ? parsed.materials : template.materials,
    createdAt: Date.now(),
  };
}

export async function generateLessonPlan(input: GenerationInput): Promise<LessonPlan> {
  const primary = input.subtopics[0];
  if (hasLlm(input.settings)) {
    try {
      const result = await planFromLlm(input);
      if (result) return result;
    } catch (e) {
      console.warn("LLM lesson plan generation failed, using template:", e);
    }
  }
  return buildLessonPlanTemplate({
    gradeLevel: input.selection.gradeLevel || "",
    subject: input.selection.subjectName || "",
    durationMinutes: input.selection.durationMinutes || 40,
    subtopic: primary,
    strand: input.selection.strandName || "",
  });
}

// ---------------------------------------------------------------------------
// Lesson Notes
// ---------------------------------------------------------------------------

interface NotesJson {
  title?: string;
  markdown?: string;
  keyTerms?: { term: string; definition: string }[];
  practiceQuestions?: { question: string; answer?: string }[];
}

async function notesFromLlm(input: GenerationInput): Promise<LessonNote | null> {
  const { selection, subtopics } = input;
  const primary = subtopics[0];
  const system =
    "You are an expert teacher who writes clear, accurate, age-appropriate student study notes. Output valid JSON only. " +
    "Do not include markdown fences, commentary or extra text — output a single JSON object.";

  const user = [
    `Write concise, accurate, age-appropriate study notes for the topic below.`,
    `Grade/Level: ${selection.gradeLevel}`,
    `Subject: ${selection.subjectName}`,
    `Topic: ${primary.title}`,
    `Learning outcomes:\n${primary.learningOutcomes.map((o) => `- ${o}`).join("\n")}`,
    ``,
    contextFor(input),
    ``,
    `Return strict JSON with this exact shape:`,
    `{ "title": string, "markdown": string, "keyTerms": [{ "term": string, "definition": string }], "practiceQuestions": [{ "question": string, "answer": string }] }`,
    `The "markdown" field is the full study note in Markdown: an intro, a "What you need to know" section, a "Key Terms" section, a "Summary" bullet list, and a "Self-Test Questions" section. Include definitions and a worked example. Keep language simple and learner-friendly.`,
  ].join("\n");

  const raw = await callLlm({
    provider: input.settings.llmProvider as "openai" | "anthropic",
    openaiKey: input.settings.openaiKey,
    openaiModel: input.settings.openaiModel,
    anthropicKey: input.settings.anthropicKey,
    anthropicModel: input.settings.anthropicModel,
    system,
    user,
    expectJson: input.settings.llmProvider === "openai",
    maxTokens: 3000,
  });

  const parsed = parseJsonLoose<NotesJson>(raw);
  if (!parsed || !parsed.markdown) return null;

  return {
    id: generateId(),
    title: parsed.title || primary.title,
    topic: primary.title,
    gradeLevel: selection.gradeLevel || "",
    subject: selection.subjectName || "",
    markdown: parsed.markdown,
    keyTerms: parsed.keyTerms?.length ? parsed.keyTerms : [],
    practiceQuestions: parsed.practiceQuestions?.length ? parsed.practiceQuestions : [],
    createdAt: Date.now(),
  };
}

export async function generateLessonNotes(input: GenerationInput): Promise<LessonNote> {
  const primary = input.subtopics[0];
  if (hasLlm(input.settings)) {
    try {
      const result = await notesFromLlm(input);
      if (result) return result;
    } catch (e) {
      console.warn("LLM notes generation failed, using template:", e);
    }
  }
  return buildLessonNotesTemplate({
    gradeLevel: input.selection.gradeLevel || "",
    subject: input.selection.subjectName || "",
    subtopic: primary,
  });
}