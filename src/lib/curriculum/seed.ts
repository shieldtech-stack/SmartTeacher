import { getLocalDB } from "@/lib/db/local-store";
import type { SeedCurriculum } from "./seed-data";
import { CURATED_CURRICULA } from "./seed-content";
import { signalCurriculumChanged } from "./import";

/**
 * Seeds the curated starter curriculum library on first run (when the local
 * database has no curricula yet). Safe to call any time — it no-ops if data
 * already exists and is idempotent (fixed IDs, plain puts).
 */
export async function seedCurriculaIfEmpty(): Promise<boolean> {
  const db = getLocalDB();
  const count = await db.curricula.count();
  if (count > 0) return false;
  await seedCurricula(CURATED_CURRICULA);
  return true;
}

export async function seedCurricula(items: SeedCurriculum[]): Promise<void> {
  const db = getLocalDB();
  await db.transaction("rw", db.curricula, db.subjects, db.strands, db.subtopics, async () => {
    for (const item of items) {
      await db.curricula.put(item.curriculum);
      for (const subject of item.subjects) {
        await db.subjects.put(subject);
        for (const strand of subject.strands) {
          await db.strands.put(strand);
          await db.subtopics.bulkPut(strand.subtopics);
        }
      }
    }
  });
  signalCurriculumChanged();
}