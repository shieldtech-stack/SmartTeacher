import Dexie, { type Table } from "dexie";
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
} from "@/lib/types";
import {
  SEED_CURRICULA,
  type SeedCurriculum,
} from "@/lib/curriculum/seed-data";

export interface DirtyRecord {
  id?: number;
  entity: string;
  payload: unknown;
  retries: number;
  createdAt: number;
}

export class SmartTeacherDB extends Dexie {
  curricula!: Table<Curriculum, string>;
  subjects!: Table<Subject, string>;
  strands!: Table<Strand, string>;
  subtopics!: Table<Subtopic, string>;
  userFiles!: Table<UserFile, string>;
  chunks!: Table<DocumentChunk, string>;
  schemes!: Table<SchemeOfWork, string>;
  plans!: Table<LessonPlan, string>;
  notes!: Table<LessonNote, string>;
  syncQueue!: Table<DirtyRecord, number>;

  constructor() {
    super("SmartTeacherDB");
    this.version(1).stores({
      curricula: "id, country",
      subjects: "id, curriculumId",
      strands: "id, subjectId",
      subtopics: "id, strandId",
      userFiles: "id, status, createdAt",
      chunks: "id, fileId, index",
      schemes: "id, createdAt",
      plans: "id, createdAt",
      notes: "id, createdAt",
      syncQueue: "++id, entity, createdAt",
    });
  }
}

let instance: SmartTeacherDB | null = null;

export function getLocalDB(): SmartTeacherDB {
  if (!instance) instance = new SmartTeacherDB();
  return instance;
}

export async function seedIfEmpty(): Promise<void> {
  const db = getLocalDB();
  const count = await db.curricula.count();
  if (count > 0) return;

  for (const seed of SEED_CURRICULA) {
    await putSeedCurriculum(db, seed);
  }
}

async function putSeedCurriculum(db: SmartTeacherDB, seed: SeedCurriculum) {
  await db.curricula.put(seed.curriculum);
  for (const subject of seed.subjects) {
    await db.subjects.put(subject);
    for (const strand of subject.strands) {
      await db.strands.put(strand);
      await db.subtopics.bulkPut(strand.subtopics);
    }
  }
}