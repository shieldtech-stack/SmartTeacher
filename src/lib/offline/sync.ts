import { getSupabase, supabaseConfigured } from "@/lib/db/supabase-client";
import { getCloudUserId, isSignedIn } from "@/lib/auth/store";
import { getDataMode } from "@/lib/settings";
import { getLocalDB, type DirtyRecord } from "@/lib/db/local-store";
import { saveScheme, savePlan, saveNote } from "@/lib/db/store";
import type { SchemeOfWork, LessonPlan, LessonNote } from "@/lib/types";

export type DocKind = "scheme" | "plan" | "note";
export type AnyDoc = SchemeOfWork | LessonPlan | LessonNote;

function tableFor(kind: DocKind): string {
  if (kind === "scheme") return "schemes_of_work";
  if (kind === "plan") return "lesson_plans";
  return "lesson_notes";
}

function rowFor(kind: DocKind, doc: AnyDoc): Record<string, unknown> {
  const base = {
    id: doc.id,
    user_id: getCloudUserId(),
    content: doc,
  };
  if (kind === "scheme") {
    const s = doc as SchemeOfWork;
    return {
      ...base,
      title: s.title,
      grade_level: s.gradeLevel,
      subject: s.subject,
      strand: s.strand,
      term: s.term,
      year: s.year,
      duration_weeks: s.durationWeeks,
    };
  }
  if (kind === "plan") {
    const p = doc as LessonPlan;
    return {
      ...base,
      topic_title: p.title,
      grade_level: p.gradeLevel,
      subject: p.subject,
      duration_minutes: p.durationMinutes,
    };
  }
  const n = doc as LessonNote;
  return {
    ...base,
    topic_title: n.title,
    grade_level: n.gradeLevel,
    subject: n.subject,
    markdown_content: n.markdown,
  };
}

export async function pushDocument(kind: DocKind, doc: AnyDoc): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  if (!isSignedIn()) throw new Error("Sign in to sync documents to the cloud");
  const { error } = await sb.from(tableFor(kind)).upsert(rowFor(kind, doc), { onConflict: "id" });
  if (error) throw error;
}

export async function syncDocument(kind: DocKind, doc: AnyDoc): Promise<"synced" | "queued"> {
  if (getDataMode() === "supabase" && supabaseConfigured() && navigator.onLine) {
    try {
      await pushDocument(kind, doc);
      return "synced";
    } catch (e) {
      console.warn("Supabase push failed, queueing for sync:", e);
    }
  }
  const db = getLocalDB();
  await db.syncQueue.add({
    entity: kind,
    payload: doc,
    retries: 0,
    createdAt: Date.now(),
  });
  return "queued";
}

export async function flushSyncQueue(): Promise<{ pushed: number; failed: number }> {
  if (!supabaseConfigured() || !navigator.onLine || getDataMode() !== "supabase" || !isSignedIn()) {
    return { pushed: 0, failed: 0 };
  }
  const db = getLocalDB();
  const dirty: DirtyRecord[] = await db.syncQueue.orderBy("createdAt").toArray();
  let pushed = 0;
  let failed = 0;
  for (const rec of dirty) {
    try {
      await pushDocument(rec.entity as DocKind, rec.payload as AnyDoc);
      await db.syncQueue.delete(rec.id!);
      pushed++;
    } catch (e) {
      failed++;
      await db.syncQueue.update(rec.id!, { retries: (rec.retries || 0) + 1 });
      console.warn("Sync failed for", rec.entity, e);
    }
  }
  return { pushed, failed };
}

export async function pullDocuments(): Promise<{ pulled: number }> {
  const sb = getSupabase();
  if (!sb || !isSignedIn() || !navigator.onLine) return { pulled: 0 };
  const uid = getCloudUserId();
  let pulled = 0;

  const { data: schemes, error: e1 } = await sb.from("schemes_of_work").select("*").eq("user_id", uid);
  if (e1) throw e1;
  for (const row of schemes ?? []) {
    const doc = row.content as SchemeOfWork;
    if (doc?.id) {
      await saveScheme({ ...doc, id: row.id, createdAt: Date.parse(row.created_at) || doc.createdAt });
      pulled++;
    }
  }

  const { data: plans, error: e2 } = await sb.from("lesson_plans").select("*").eq("user_id", uid);
  if (e2) throw e2;
  for (const row of plans ?? []) {
    const doc = row.content as LessonPlan;
    if (doc?.id) {
      await savePlan({ ...doc, id: row.id, createdAt: Date.parse(row.created_at) || doc.createdAt });
      pulled++;
    }
  }

  const { data: notes, error: e3 } = await sb.from("lesson_notes").select("*").eq("user_id", uid);
  if (e3) throw e3;
  for (const row of notes ?? []) {
    const doc = row.content as LessonNote;
    if (doc?.id) {
      await saveNote({ ...doc, id: row.id, createdAt: Date.parse(row.created_at) || doc.createdAt });
      pulled++;
    }
  }

  return { pulled };
}

export async function deleteRemoteDocument(kind: DocKind, id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb || !isSignedIn() || !navigator.onLine || getDataMode() !== "supabase") return;
  const { error } = await sb.from(tableFor(kind)).delete().eq("id", id);
  if (error) throw error;
}

export async function pendingSyncCount(): Promise<number> {
  return getLocalDB().syncQueue.count();
}