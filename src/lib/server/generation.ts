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

// Create server-side shared LLM settings from environment variables
// This allows LLM generation without per-user API keys
function getSharedLlmSettings(): ProviderSettings | null {
  // Check for Google Gemini (free tier available)
  if (process.env.GEMINI_API_KEY) {
    return {
      llmProvider: "google",
      googleKey: process.env.GEMINI_API_KEY,
      googleModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      openaiKey: "",
      openaiModel: "gpt-4o",
      anthropicKey: "",
      anthropicModel: "claude-3-5-sonnet-20241022",
      openrouterKey: "",
      openrouterModel: "google/gemini-flash-1.5",
      embeddingProvider: "local",
      webSearchProvider: "none",
      tavilyKey: "",
      braveKey: "",
      useWebSearch: false,
      topK: 5,
    };
  }
  // Check for OpenAI
  if (process.env.OPENAI_API_KEY) {
    return {
      llmProvider: "openai",
      openaiKey: process.env.OPENAI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
      googleKey: "",
      googleModel: "gemini-1.5-flash",
      anthropicKey: "",
      anthropicModel: "claude-3-5-sonnet-20241022",
      openrouterKey: "",
      openrouterModel: "google/gemini-flash-1.5",
      embeddingProvider: "local",
      webSearchProvider: "none",
      tavilyKey: "",
      braveKey: "",
      useWebSearch: false,
      topK: 5,
    };
  }
  // Check for Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      llmProvider: "anthropic",
      anthropicKey: process.env.ANTHROPIC_API_KEY,
      anthropicModel: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
      openaiKey: "",
      openaiModel: "gpt-4o",
      googleKey: "",
      googleModel: "gemini-1.5-flash",
      openrouterKey: "",
      openrouterModel: "google/gemini-flash-1.5",
      embeddingProvider: "local",
      webSearchProvider: "none",
      tavilyKey: "",
      braveKey: "",
      useWebSearch: false,
      topK: 5,
    };
  }
  // Check for OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    return {
      llmProvider: "openrouter",
      openrouterKey: process.env.OPENROUTER_API_KEY,
      openrouterModel: process.env.OPENROUTER_MODEL || "google/gemini-flash-1.5",
      openaiKey: "",
      openaiModel: "gpt-4o",
      googleKey: "",
      googleModel: "gemini-1.5-flash",
      anthropicKey: "",
      anthropicModel: "claude-3-5-sonnet-20241022",
      embeddingProvider: "local",
      webSearchProvider: "none",
      tavilyKey: "",
      braveKey: "",
      useWebSearch: false,
      topK: 5,
    };
  }
  return null;
}

function getEffectiveSettings(userSettings: ProviderSettings): ProviderSettings {
  // If user has configured their own key, use it (priority)
  if (userSettings.llmProvider !== "offline" && 
      (userSettings.openaiKey || userSettings.anthropicKey || userSettings.googleKey || userSettings.openrouterKey)) {
    return userSettings;
  }
  // Otherwise fall back to shared server-side key
  const shared = getSharedLlmSettings();
  if (shared) return shared;
  // No LLM available
  return {
    llmProvider: "offline",
    openaiKey: "",
    openaiModel: "gpt-4o",
    anthropicKey: "",
    anthropicModel: "claude-3-5-sonnet-20241022",
    googleKey: "",
    googleModel: "gemini-1.5-flash",
    openrouterKey: "",
    openrouterModel: "google/gemini-flash-1.5",
    embeddingProvider: "local",
    webSearchProvider: "none",
    tavilyKey: "",
    braveKey: "",
    useWebSearch: false,
    topK: 5,
  };
}

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
        `${i + 1}. ${s.title}\n` +
        `   Learning outcomes:\n   ${s.learningOutcomes.map((o) => `- ${o}`).join("\n   ")}` +
        (s.suggestedExperiences && s.suggestedExperiences.length
          ? `\n   Suggested learning experiences:\n   ${s.suggestedExperiences.map((e) => `- ${e}`).join("\n   ")}`
          : "")
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
    `Term length: ${selection.weeksPerTerm ?? 13} weeks with ${selection.lessonsPerWeek ?? 2} lesson(s) per week.`,
    ``,
    `Subtopics to cover:\n${describeSubtopics(subtopics)}`,
    ``,
    contextFor(input),
    ``,
    `Return strict JSON with this exact shape:`,
    `{ "title": string, "rows": [{ "week": number, "lessonNumber": number, "subtopic": string, "learningOutcomes": string[], "keyInquiryQuestions": string[], "learningActivities": string[], "resources": string[], "assessment": string[] }] }`,
    `CRITICAL RULES:`,
    `1. ONE ROW = ONE LESSON. Each row has ONE learning outcome and ONE learning activity.`,
    `2. GROUP BY OUTCOME: All lessons for the SAME learning outcome MUST BE CONSECUTIVE. Do not interleave outcomes.`,
    `3. MAX 3 LESSONS PER OUTCOME. If an outcome needs more practice, cap at 3 lessons.`,
    `4. RESPECT SUGGESTED LESSONS: Each subtopic has a "lessonCount" (e.g., 12 for Fungi). Do NOT exceed this total for that subtopic.`,
    `5. STOP WHEN EXHAUSTED: If all subtopics' lessons are used up, STOP. Do NOT repeat subtopics or outcomes to fill remaining weeks. Return only the lessons that fit the actual curriculum content.`,
    `6. ONE ACTIVITY PER LESSON: The "learningActivities" array should contain exactly ONE activity — the specific suggested learning experience from the curriculum design for that lesson.`,
    `7. ALLOCATE BY EXPERIENCES: Use "suggestedExperiences" to determine how many lessons each outcome gets (1-3 per outcome, max 3).`,
    `Spread the selected subtopics across the term respecting their suggested lesson counts. Number lessons sequentially. Include key inquiry questions, resources and assessment aligned to CBC pedagogy.`,
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
  const effectiveSettings = getEffectiveSettings(input.settings);
  if (hasLlm(effectiveSettings)) {
    try {
      const result = await schemeFromLlm({ ...input, settings: effectiveSettings });
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
    durationWeeks: Math.max(1, input.selection.weeksPerTerm ?? Math.ceil(Math.max(1, input.subtopics.length) / 2)),
    lessonsPerWeek: Math.max(1, input.selection.lessonsPerWeek ?? Math.ceil(Math.max(1, input.subtopics.length) / Math.max(1, input.selection.weeksPerTerm ?? 13))),
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
    "You are an expert teacher educator. You generate detailed, classroom-ready CBC Lesson Plans in valid JSON only. " +
    "Do not include markdown fences, commentary or extra text — output a single JSON object.";

  const experiences = primary.suggestedExperiences && primary.suggestedExperiences.length > 0
    ? primary.suggestedExperiences.map((e, i) => `${i + 1}. ${e}`).join("\n")
    : "None specified in the curriculum design.";

  const user = [
    `Generate a CBC Lesson Plan for the topic below.`,
    `Grade/Level: ${selection.gradeLevel}`,
    `Subject: ${selection.subjectName}`,
    `Strand: ${selection.strandName}`,
    `Topic: ${primary.title}`,
    `Learning outcomes:\n${primary.learningOutcomes.map((o) => `- ${o}`).join("\n")}`,
    `Suggested learning experiences (from curriculum design):\n${experiences}`,
    ``,
    contextFor(input),
    ``,
    `The plan must fit ${selection.durationMinutes || 40} minutes. Return strict JSON matching the CBC Lesson Plan structure:`,
    `{ "title": string, "topic": string, "gradeLevel": string, "subject": string, "durationMinutes": number, "objectives": string[], "keyInquiryQuestions": string[], "activities": [{ "section": string, "phase": "introduction"|"main"|"conclusion", "durationMinutes": number, "description": string, "teacherActivity": string[], "learnerActivity": string[] }], "assessmentMethods": string[], "differentiationNotes": string, "materials": string[], "coreCompetencies": string[], "values": string[], "pcis": string[], "resources": string[], "extendedActivity": string, "reflection": string }`,
    `CRITICAL: Follow the CBC lesson plan format exactly:`,
    `1. Introduction (5-10 mins) - hook, objectives`,
    `2. Lesson Development Steps 1-3 (25-30 mins) - Direct Instruction, Guided Practice, Independent Practice`,
    `3. Conclusion (5 mins) - summary, link to next lesson`,
    `4. Key Inquiry Questions (1-2) derived from the learning outcome`,
    `5. Core Competencies (checkbox format), Values, PCIs`,
    `6. Learning Resources, Extended Activity, Teacher Reflection`,
    `Base activities DIRECTLY on the "Suggested learning experiences" from the curriculum design.`,
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
  const effectiveSettings = getEffectiveSettings(input.settings);
  if (hasLlm(effectiveSettings)) {
    try {
      const result = await planFromLlm({ ...input, settings: effectiveSettings });
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
  const effectiveSettings = getEffectiveSettings(input.settings);
  if (hasLlm(effectiveSettings)) {
    try {
      const result = await notesFromLlm({ ...input, settings: effectiveSettings });
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