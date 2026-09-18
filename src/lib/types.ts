export type Term = "Term 1" | "Term 2" | "Term 3";

export interface Curriculum {
  id: string;
  name: string;
  gradeLevel: string;
  country: string;
  description?: string;
}

export interface Subject {
  id: string;
  curriculumId: string;
  name: string;
  description?: string;
}

export interface Strand {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
}

export interface Subtopic {
  id: string;
  strandId: string;
  title: string;
  learningOutcomes: string[];
  /** optional, captured when the design lists a lesson count (e.g. "(12 lessons)") */
  lessonCount?: number;
  /** optional, captured from "Core Competencies to be developed:" sections */
  coreCompetencies?: string[];
  /** optional, captured from "The learner is guided to:" / "Suggested Learning Experiences" sections */
  suggestedExperiences?: string[];
}

export interface CurriculumSelection {
  curriculumId: string;
  subjectId: string;
  strandId: string;
  subtopicIds: string[];
  term?: Term;
  year?: number;
  durationMinutes?: number;
  gradeLevel?: string;
  subjectName?: string;
  strandName?: string;
  weeksPerTerm?: number;
  lessonsPerWeek?: number;
}

export interface UserFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: "uploaded" | "processing" | "ready" | "error";
  chunkCount: number;
  wordCount?: number;
  error?: string;
  createdAt: number;
}

export interface DocumentChunk {
  id: string;
  fileId: string;
  index: number;
  content: string;
  embedding?: number[];
}

export interface SchemeRow {
  week: number;
  lessonNumber: number;
  strand: string;
  subtopic: string;
  learningOutcomes: string[];
  keyInquiryQuestions: string[];
  learningActivities: string[];
  resources: string[];
  assessment: string[];
}

export interface SchemeOfWork {
  id: string;
  title: string;
  gradeLevel: string;
  subject: string;
  strand: string;
  term: string;
  year: number;
  rows: SchemeRow[];
  durationWeeks: number;
  createdAt: number;
}

export interface LessonActivity {
  section: string;
  phase: "introduction" | "main" | "conclusion";
  durationMinutes: number;
  description: string;
  teacherActivity?: string[];
  learnerActivity?: string[];
}

export interface LessonPlan {
  id: string;
  title: string;
  topic: string;
  gradeLevel: string;
  subject: string;
  durationMinutes: number;
  objectives: string[];
  keyInquiryQuestions?: string[];
  activities: LessonActivity[];
  assessmentMethods: string[];
  differentiationNotes: string;
  materials: string[];
  coreCompetencies?: string[];
  values?: string[];
  pcis?: string[];
  resources?: string[];
  extendedActivity?: string;
  reflection?: string;
  createdAt: number;
}

export interface NoteSection {
  heading: string;
  body?: string;
  bullets?: string[];
}

export interface PracticeQuestion {
  question: string;
  answer?: string;
}

export interface LessonNote {
  id: string;
  title: string;
  topic: string;
  gradeLevel: string;
  subject: string;
  markdown: string;
  keyTerms: { term: string; definition: string }[];
  practiceQuestions: PracticeQuestion[];
  createdAt: number;
}

export interface RetrievalChunk {
  fileId?: string;
  fileName?: string;
  content: string;
  score: number;
}

export interface WebSnippet {
  title?: string;
  url?: string;
  snippet: string;
}

export interface RetrievalContext {
  chunks: RetrievalChunk[];
  webSnippets: WebSnippet[];
}

export interface ProviderSettings {
  llmProvider: "openai" | "anthropic" | "google" | "openrouter" | "offline";
  openaiKey: string;
  openaiModel: string;
  anthropicKey: string;
  anthropicModel: string;
  googleKey: string;
  googleModel: string;
  openrouterKey: string;
  openrouterModel: string;
  embeddingProvider: "openai" | "local";
  webSearchProvider: "tavily" | "brave" | "none";
  tavilyKey: string;
  braveKey: string;
  useWebSearch: boolean;
  topK: number;
}

export const DEFAULT_SETTINGS: ProviderSettings = {
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
