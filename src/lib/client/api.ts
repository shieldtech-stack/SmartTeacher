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
import type { SeedCurriculum } from "@/lib/curriculum/seed-data";
import type { ImportStats } from "@/lib/curriculum/import";

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

export interface ConvertCurriculumResult {
  curricula: SeedCurriculum[];
  stats: ImportStats;
  source: "llm" | "heuristic";
}

export async function convertCurriculumFile(
  file: File,
  settings: ProviderSettings
): Promise<ConvertCurriculumResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("settings", JSON.stringify(settings));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch("/api/curriculum/convert", { method: "POST", body: form, signal: controller.signal });
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === "AbortError") {
      throw new Error("Conversion timed out after 2 minutes. The PDF may be very large or scanned — try a smaller text-based PDF.");
    }
    throw new Error("Could not reach the server. Is the app running?");
  }
  clearTimeout(timer);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to convert curriculum");
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

export async function testLlmConnection(settings: ProviderSettings): Promise<{ ok: boolean; model?: string; sample?: string; error?: string }> {
  const res = await fetch("/api/generate/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ settings }),
  });
  const data = await res.json().catch(() => ({}));
  return data as { ok: boolean; model?: string; sample?: string; error?: string };
}