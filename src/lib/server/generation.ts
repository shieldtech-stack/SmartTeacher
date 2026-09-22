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
import { callLlm, parseJsonLoose, type LlmCallOptions } from "./provider";
import {
  buildSchemeTemplate,
  buildLessonPlanTemplate,
  buildLessonNotesTemplate,
  buildContextBlock,
  buildSubtopicRows,
  renumberSchemeRows,
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
      googleModel: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
      openaiKey: "",
      openaiModel: "gpt-4o-mini",
      anthropicKey: "",
      anthropicModel: "claude-3-7-sonnet-latest",
      openrouterKey: "",
      openrouterModel: "google/gemini-3.1-flash-lite",
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
      googleModel: "gemini-3.1-flash-lite",
      anthropicKey: "",
      anthropicModel: "claude-3-7-sonnet-latest",
      openrouterKey: "",
      openrouterModel: "google/gemini-3.1-flash-lite",
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
      anthropicModel: process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-latest",
      openaiKey: "",
      openaiModel: "gpt-4o-mini",
      googleKey: "",
      googleModel: "gemini-3.1-flash-lite",
      openrouterKey: "",
      openrouterModel: "google/gemini-3.1-flash-lite",
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
      openrouterModel: process.env.OPENROUTER_MODEL || "google/gemini-3.1-flash-lite",
      openaiKey: "",
      openaiModel: "gpt-4o-mini",
      googleKey: "",
      googleModel: "gemini-3.1-flash-lite",
      anthropicKey: "",
      anthropicModel: "claude-3-7-sonnet-latest",
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

export function getEffectiveSettings(userSettings: ProviderSettings): ProviderSettings {
  // If the user has configured a key for the provider they actually selected, use it.
  if (userSettings.llmProvider !== "offline") {
    const keyForProvider =
      userSettings.llmProvider === "openai"
        ? userSettings.openaiKey
        : userSettings.llmProvider === "anthropic"
          ? userSettings.anthropicKey
          : userSettings.llmProvider === "google"
            ? userSettings.googleKey
            : userSettings.openrouterKey;
    if (keyForProvider) return userSettings;
  }
  // Otherwise fall back to shared server-side key
  const shared = getSharedLlmSettings();
  if (shared) return shared;
  // No LLM available
  return {
    llmProvider: "offline",
    openaiKey: "",
    openaiModel: "gpt-4o-mini",
    anthropicKey: "",
    anthropicModel: "claude-3-7-sonnet-latest",
    googleKey: "",
    googleModel: "gemini-3.1-flash-lite",
    openrouterKey: "",
    openrouterModel: "google/gemini-3.1-flash-lite",
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
        `   Suggested lessons: ${s.lessonCount && s.lessonCount > 0 ? s.lessonCount : Math.max(1, s.learningOutcomes.length)}\n` +
        `   Learning outcomes:\n   ${s.learningOutcomes.map((o) => `- ${o}`).join("\n   ")}` +
        (s.suggestedExperiences && s.suggestedExperiences.length
          ? `\n   Suggested learning experiences:\n   ${s.suggestedExperiences.map((e) => `- ${e}`).join("\n   ")}`
          : "")
    )
    .join("\n");
}

function normalizeSubtopicTitle(t: string): string {
  return (t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Guarantee that every subtopic ends up with exactly its suggested number of
// lessons. The AI (and even templates) often under-generate; we truncate rows
// that exceed the count and fill gaps with curriculum-aligned template rows.
function enforceLessonCounts(
  rows: SchemeRow[],
  subtopics: Subtopic[],
  strand: string,
  lessonsPerWeek: number
): SchemeRow[] {
  const byNormalized = new Map<string, Subtopic>();
  for (const s of subtopics) byNormalized.set(normalizeSubtopicTitle(s.title), s);

  const buckets = new Map<string, SchemeRow[]>();
  for (const r of rows) {
    const sub = byNormalized.get(normalizeSubtopicTitle(r.subtopic));
    if (!sub) continue;
    const list = buckets.get(sub.title) || [];
    list.push(r);
    buckets.set(sub.title, list);
  }

  const selected: SchemeRow[] = [];
  for (const s of subtopics) {
    const total = s.lessonCount && s.lessonCount > 0 ? s.lessonCount : Math.max(1, s.learningOutcomes.length);
    const ideal = buildSubtopicRows(s, strand);
    const mine = buckets.get(s.title) || [];
    for (let i = 0; i < total; i++) {
      selected.push(mine[i] ?? ideal[i % ideal.length]);
    }
  }
  return renumberSchemeRows(selected, lessonsPerWeek);
}

function hasLlm(settings: ProviderSettings): boolean {
  return settings.llmProvider !== "offline";
}

function llmCall(settings: ProviderSettings, system: string, user: string, maxTokens: number): Promise<string> {
  return callLlm({
    provider: settings.llmProvider as LlmCallOptions["provider"],
    openaiKey: settings.openaiKey,
    openaiModel: settings.openaiModel,
    anthropicKey: settings.anthropicKey,
    anthropicModel: settings.anthropicModel,
    googleKey: settings.googleKey,
    googleModel: settings.googleModel,
    openrouterKey: settings.openrouterKey,
    openrouterModel: settings.openrouterModel,
    system,
    user,
    expectJson: settings.llmProvider === "openai" || settings.llmProvider === "google",
    maxTokens,
  });
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
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
    "You are an expert curriculum design assistant specialising in competency-based education schemes of work (CBC/KSA framework). " +
    "You generate a structured, progressive Scheme of Work as strict JSON only. " +
    "Do not include markdown fences, commentary or extra text — output a single JSON object.";

  const user = [
    `TASK: Generate a structured, progressive Scheme of Work for the selection below, covering every suggested lesson.`,
    `Grade/Level: ${selection.gradeLevel}`,
    `Subject: ${selection.subjectName}`,
    `Strand: ${selection.strandName}`,
    `Term: ${selection.term ?? "Term 1"}, Year: ${selection.year ?? new Date().getFullYear()}`,
    `Term length: ${selection.weeksPerTerm ?? 13} weeks with ${selection.lessonsPerWeek ?? 2} lesson(s) per week. At most ${selection.lessonsPerWeek ?? 2} lessons fall in the same week.`,
    ``,
    `Subtopics to cover (NOTE the exact "Suggested lessons" for each):\n${describeSubtopics(subtopics)}`,
    ``,
    contextFor(input),
    ``,
    `Return strict JSON with this exact shape:`,
    `{ "title": string, "rows": [{ "week": number, "lessonNumber": number, "subtopic": string, "learningOutcomes": string[], "keyInquiryQuestions": string[], "learningActivities": string[], "resources": string[], "assessment": string[] }] }`,
    `CRITICAL RULES & CONSTRAINTS:`,
    `1. ONE ROW = ONE LESSON. Every suggested lesson appears as its own row.`,
    `2. EXACT LESSON COUNT: Generate EXACTLY the "Suggested lessons" number of rows for EVERY subtopic (e.g. if a subtopic says "Suggested lessons: 8", produce exactly 8 rows for it). The total number of rows must EQUAL THE SUM of all "Suggested lessons" values. Count and verify before returning.`,
    `3. NO REPETITION: Every lesson MUST have distinct, non-repetitive Specific Learning Outcomes, Key Inquiry Questions and Learning Activities. Do NOT copy-paste outcomes or activities across lessons — even lessons in the same subtopic must differ.`,
    `4. OUTCOMES FORMAT (KSA Framework): Each row's "learningOutcomes" field MUST contain EXACTLY THREE bullet strings, labelled and categorised as: "Knowledge: ..." (a concept, definition or principle the learner will understand), "Skill: ..." (a practical action, operation or process the learner will perform) and "Attitude: ..." (a value, behaviour or appreciation the learner will demonstrate).`,
    `5. PROGRESSION: Lessons within each subtopic must follow a logical pedagogical sequence: conceptual understanding -> skill application -> practical/real-world contextualisation -> error analysis/synthesis. Cycle through this order as long as the subtopic's lessons last.`,
    `6. SPECIFIC ACTIVITIES: "learningActivities" must contain EXACTLY ONE concrete learner action that matches that lesson's specific skill (e.g. "Use a grid chart to convert decimals to percentages", "Analyse store receipts to calculate discounts", "Draft a mock budget in pairs"). Avoid generic phrases like "Discuss the topic".`,
    `7. KEY INQUIRY QUESTION: "keyInquiryQuestions" contains EXACTLY ONE distinct question for that lesson, derived from the lesson's outcome and activity. No two lessons share the same question.`,
    `8. GROUP BY SUBTOPIC: All rows for the same subtopic must be CONSECUTIVE. Number lessonNumber sequentially 1, 2, 3... across the whole term.`,
    `9. RESOURCES & ASSESSMENT: Provide concrete, relevant resources (charts, realia, tools, textbook) and CBC-style assessment methods (observation, practical work, peer assessment, exercises) that fit the activity.`,
    `Style your output like a senior teacher: precise, classroom-ready and learner-centred.`,
  ].join("\n");

  const raw = await llmCall(input.settings, system, user, 4000);

  const parsed = parseJsonLoose<SchemeJson>(raw);
  if (!parsed || !Array.isArray(parsed.rows) || parsed.rows.length === 0) return null;

  const mappedRows: SchemeRow[] = parsed.rows.map((r) => ({
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

  const rows = enforceLessonCounts(mappedRows, subtopics, selection.strandName || "", selection.lessonsPerWeek || 2);

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
      if (!result) throw new Error("AI responded but the output could not be parsed — used the offline template");
      return { ...result, llmSource: "ai" };
    } catch (e) {
      console.warn("LLM scheme generation failed, using template:", e);
      const fallback = buildSchemeTemplate({
        gradeLevel: input.selection.gradeLevel || "",
        subject: input.selection.subjectName || "",
        strand: input.selection.strandName || "",
        term: input.selection.term || "Term 1",
        year: input.selection.year || new Date().getFullYear(),
        durationWeeks: Math.max(1, input.selection.weeksPerTerm ?? Math.ceil(Math.max(1, input.subtopics.length) / 2)),
        lessonsPerWeek: Math.max(1, input.selection.lessonsPerWeek ?? Math.ceil(Math.max(1, input.subtopics.length) / Math.max(1, input.selection.weeksPerTerm ?? 13))),
        subtopics: input.subtopics,
      });
      return { ...fallback, llmSource: "template", llmError: errorMessage(e) };
    }
  }
  const fallback = buildSchemeTemplate({
    gradeLevel: input.selection.gradeLevel || "",
    subject: input.selection.subjectName || "",
    strand: input.selection.strandName || "",
    term: input.selection.term || "Term 1",
    year: input.selection.year || new Date().getFullYear(),
    durationWeeks: Math.max(1, input.selection.weeksPerTerm ?? Math.ceil(Math.max(1, input.subtopics.length) / 2)),
    lessonsPerWeek: Math.max(1, input.selection.lessonsPerWeek ?? Math.ceil(Math.max(1, input.subtopics.length) / Math.max(1, input.selection.weeksPerTerm ?? 13))),
    subtopics: input.subtopics,
  });
  return { ...fallback, llmSource: "template" };
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

  const raw = await llmCall(input.settings, system, user, 3500);

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
      if (!result) throw new Error("AI responded but the output could not be parsed — used the offline template");
      return { ...result, llmSource: "ai" };
    } catch (e) {
      console.warn("LLM lesson plan generation failed, using template:", e);
      const fallback = buildLessonPlanTemplate({
        gradeLevel: input.selection.gradeLevel || "",
        subject: input.selection.subjectName || "",
        durationMinutes: input.selection.durationMinutes || 40,
        subtopic: primary,
        strand: input.selection.strandName || "",
      });
      return { ...fallback, llmSource: "template", llmError: errorMessage(e) };
    }
  }
  const fallback = buildLessonPlanTemplate({
    gradeLevel: input.selection.gradeLevel || "",
    subject: input.selection.subjectName || "",
    durationMinutes: input.selection.durationMinutes || 40,
    subtopic: primary,
    strand: input.selection.strandName || "",
  });
  return { ...fallback, llmSource: "template" };
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

  const raw = await llmCall(input.settings, system, user, 3000);

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
      if (!result) throw new Error("AI responded but the output could not be parsed — used the offline template");
      return { ...result, llmSource: "ai" };
    } catch (e) {
      console.warn("LLM notes generation failed, using template:", e);
      const fallback = buildLessonNotesTemplate({
        gradeLevel: input.selection.gradeLevel || "",
        subject: input.selection.subjectName || "",
        subtopic: primary,
      });
      return { ...fallback, llmSource: "template", llmError: errorMessage(e) };
    }
  }
  const fallback = buildLessonNotesTemplate({
    gradeLevel: input.selection.gradeLevel || "",
    subject: input.selection.subjectName || "",
    subtopic: primary,
  });
  return { ...fallback, llmSource: "template" };
}