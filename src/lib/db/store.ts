import { getLocalDB, type DirtyRecord } from "./local-store";
import type {
  Curriculum,
  Subject,
  Strand,
  Subtopic,
  UserFile,
  DocumentChunk,
  SchemeOfWork,
  LessonPlan,
  LessonNote,
  CurriculumSelection,
} from "@/lib/types";

const db = () => getLocalDB();

export async function listCurricula(): Promise<Curriculum[]> {
  return db().curricula.toArray();
}
export async function getCurriculum(id: string): Promise<Curriculum | undefined> {
  return db().curricula.get(id);
}
export async function listSubjects(curriculumId: string): Promise<Subject[]> {
  return db().subjects.where("curriculumId").equals(curriculumId).toArray();
}
export async function getSubject(id: string): Promise<Subject | undefined> {
  return db().subjects.get(id);
}
export async function listStrands(subjectId: string): Promise<Strand[]> {
  return db().strands.where("subjectId").equals(subjectId).toArray();
}
export async function getStrand(id: string): Promise<Strand | undefined> {
  return db().strands.get(id);
}
export async function listSubtopics(strandId: string): Promise<Subtopic[]> {
  return db().subtopics.where("strandId").equals(strandId).toArray();
}
export async function getSubtopic(id: string): Promise<Subtopic | undefined> {
  return db().subtopics.get(id);
}
export async function getSubtopicsByIds(ids: string[]): Promise<Subtopic[]> {
  if (ids.length === 0) return [];
  return db().subtopics.bulkGet(ids).then((r) => r.filter(Boolean) as Subtopic[]);
}

export async function addFile(p: Omit<UserFile, "id" | "createdAt" | "status" | "chunkCount">): Promise<UserFile> {
  const file: UserFile = {
    ...p,
    id: crypto.randomUUID(),
    status: "uploaded",
    chunkCount: 0,
    createdAt: Date.now(),
  };
  await db().userFiles.add(file);
  return file;
}

export async function updateFile(id: string, patch: Partial<UserFile>): Promise<void> {
  await db().userFiles.update(id, patch);
}
export async function listFiles(): Promise<UserFile[]> {
  return db().userFiles.orderBy("createdAt").reverse().toArray();
}
export async function getFile(id: string): Promise<UserFile | undefined> {
  return db().userFiles.get(id);
}
export async function deleteFile(id: string): Promise<void> {
  await db().chunks.where("fileId").equals(id).delete();
  await db().userFiles.delete(id);
}

export async function addChunks(chunks: DocumentChunk[]): Promise<void> {
  await db().chunks.bulkAdd(chunks);
}
export async function getChunksForFile(fileId: string): Promise<DocumentChunk[]> {
  return db().chunks.where("fileId").equals(fileId).toArray();
}
export async function allChunks(): Promise<DocumentChunk[]> {
  return db().chunks.toArray();
}
export async function deleteChunksForFile(fileId: string): Promise<void> {
  await db().chunks.where("fileId").equals(fileId).delete();
}

export async function saveScheme(s: SchemeOfWork): Promise<void> {
  await db().schemes.put(s);
}
export async function getScheme(id: string): Promise<SchemeOfWork | undefined> {
  return db().schemes.get(id);
}
export async function listSchemes(): Promise<SchemeOfWork[]> {
  return db().schemes.orderBy("createdAt").reverse().toArray();
}
export async function deleteScheme(id: string): Promise<void> {
  await db().schemes.delete(id);
}

export async function savePlan(p: LessonPlan): Promise<void> {
  await db().plans.put(p);
}
export async function getPlan(id: string): Promise<LessonPlan | undefined> {
  return db().plans.get(id);
}
export async function listPlans(): Promise<LessonPlan[]> {
  return db().plans.orderBy("createdAt").reverse().toArray();
}
export async function deletePlan(id: string): Promise<void> {
  await db().plans.delete(id);
}

export async function saveNote(n: LessonNote): Promise<void> {
  await db().notes.put(n);
}
export async function getNote(id: string): Promise<LessonNote | undefined> {
  return db().notes.get(id);
}
export async function listNotes(): Promise<LessonNote[]> {
  return db().notes.orderBy("createdAt").reverse().toArray();
}
export async function deleteNote(id: string): Promise<void> {
  await db().notes.delete(id);
}

export async function queueDirty(record: Omit<DirtyRecord, "id" | "createdAt" | "retries">): Promise<void> {
  await db().syncQueue.add({ ...record, retries: 0, createdAt: Date.now() });
}
export async function listDirty(): Promise<DirtyRecord[]> {
  return db().syncQueue.orderBy("createdAt").toArray();
}
export async function removeDirty(id: number): Promise<void> {
  await db().syncQueue.delete(id);
}

const SELECTION_KEY = "st.selection";

export function loadSelection(): CurriculumSelection {
  if (typeof window === "undefined")
    return { curriculumId: "", subjectId: "", strandId: "", subtopicIds: [] };
  try {
    return JSON.parse(localStorage.getItem(SELECTION_KEY) || "") as CurriculumSelection;
  } catch {
    return { curriculumId: "", subjectId: "", strandId: "", subtopicIds: [] };
  }
}

export function saveSelection(sel: CurriculumSelection): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SELECTION_KEY, JSON.stringify(sel));
}