import type {
  CurriculumSelection,
  ProviderSettings,
  RetrievalContext,
  SchemeOfWork,
  LessonPlan,
  LessonNote,
  Subtopic,
  WebSnippet,
} from "@/lib/types";

export interface ChunkOutput {
  index: number;
  content: string;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function uploadFile(file: File): Promise<{ wordCount: number; chunks: ChunkOutput[] }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Upload failed");
  }
  return res.json();
}

export async function ingestText(text: string): Promise<{ wordCount: number; chunks: ChunkOutput[] }> {
  return post("/api/ingest", { text });
}

export async function webSearchRequest(
  query: string,
  settings: ProviderSettings
): Promise<{ snippets: WebSnippet[] }> {
  return post("/api/search", { query, settings });
}

export interface GenerationInputPayload {
  selection: CurriculumSelection;
  subtopics: Subtopic[];
  settings: ProviderSettings;
  context?: RetrievalContext;
}

export function generateScheme(payload: GenerationInputPayload): Promise<SchemeOfWork> {
  return post("/api/generate/scheme", payload);
}
export function generateLessonPlan(payload: GenerationInputPayload): Promise<LessonPlan> {
  return post("/api/generate/lesson-plan", payload);
}
export function generateLessonNotes(payload: GenerationInputPayload): Promise<LessonNote> {
  return post("/api/generate/notes", payload);
}