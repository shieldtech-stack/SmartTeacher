import { getLocalDB } from "@/lib/db/local-store";
import { generateId } from "@/lib/utils";
import type { SeedCurriculum, SeedSubject, SeedStrand } from "@/lib/curriculum/seed-data";
import type { Curriculum, Subject, Strand, Subtopic } from "@/lib/types";

export interface ImportStats {
  curricula: number;
  subjects: number;
  strands: number;
  subtopics: number;
}

export type NormalizeResult =
  | { ok: true; items: SeedCurriculum[]; stats: ImportStats }
  | { ok: false; error: string };

const MAX_ITEMS = 50;
const MAX_SUBJECTS = 50;
const MAX_STRANDS = 200;
const MAX_SUBTOPICS = 1000;

function isStr(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normRequiredStr(v: unknown, label: string, field: string): string {
  if (!isStr(v)) throw new Error(`${label}: "${field}" must be a non-empty string`);
  return v.trim();
}

function optionalStr(v: unknown): string | undefined {
  return isStr(v) ? v.trim() : undefined;
}

function asStringArray(v: unknown, label: string): string[] {
  if (!Array.isArray(v)) throw new Error(`${label}: "learningOutcomes" must be a string array`);
  const out: string[] = [];
  for (const item of v) {
    if (isStr(item)) out.push(item.trim());
    else throw new Error(`${label}: every "learningOutcomes" entry must be a string`);
  }
  return out;
}

function asOptionalStringArray(v: unknown, label: string): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) throw new Error(`${label}: must be a string array`);
  const out: string[] = [];
  for (const item of v) {
    if (isStr(item)) out.push(item.trim());
    else throw new Error(`${label}: every entry must be a string`);
  }
  return out.length > 0 ? out : undefined;
}

function toOptionalNumber(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return Math.abs(Math.trunc(v));
  if (typeof v === "string") {
    const m = v.match(/\d+/);
    if (m) return parseInt(m[1], 10);
  }
  return undefined;
}

function normalizeGrade(v: unknown, label: string): string {
  const g = normRequiredStr(v, label, "grade");
  const m = g.match(/^grade\s*(\d+)/i);
  return m ? `Grade ${m[1]}` : g;
}

function isEmptyOutcomeSet(outcomes: string[], comps?: string[]): boolean {
  return outcomes.length === 0 && (comps === undefined || comps.length === 0);
}

function normalizeSubtopic(raw: unknown, prefix: string, strandId: string): Subtopic {
  if (typeof raw !== "object" || raw === null) throw new Error(`${prefix}: invalid subtopic`);
  const r = raw as {
    title?: unknown;
    learningOutcomes?: unknown;
    lessonCount?: unknown;
    coreCompetencies?: unknown;
    suggestedExperiences?: unknown;
  };
  if (!isStr(r.title)) throw new Error(`${prefix}: subtopic "title" is required`);
  const title = r.title.trim();
  const outcomes = asStringArray(r.learningOutcomes, `${prefix} "${title}"`);
  const comps = asOptionalStringArray(r.coreCompetencies, `${prefix} "${title}" "coreCompetencies"`);
  const exps = asOptionalStringArray(r.suggestedExperiences, `${prefix} "${title}" "suggestedExperiences"`);
  if (isEmptyOutcomeSet(outcomes, comps))
    throw new Error(`${prefix} "${title}": at least one learning outcome (or core competency) is required`);
  return {
    id: generateId(),
    strandId,
    title,
    learningOutcomes: outcomes,
    lessonCount: toOptionalNumber(r.lessonCount),
    coreCompetencies: comps,
    suggestedExperiences: exps,
  };
}

function normalizeStrand(raw: unknown, prefix: string, subjectId: string): SeedStrand {
  if (typeof raw !== "object" || raw === null) throw new Error(`${prefix}: invalid strand`);
  const r = raw as { title?: unknown; description?: unknown; subtopics?: unknown };
  if (!isStr(r.title)) throw new Error(`${prefix}: strand "title" is required`);
  if (!Array.isArray(r.subtopics)) throw new Error(`${prefix} "${r.title}": "subtopics" array is required`);
  if (r.subtopics.length === 0) throw new Error(`${prefix} "${r.title}": at least one subtopic required`);
  const strandId = generateId();
  const subtopics = r.subtopics.map((s, i) => normalizeSubtopic(s, `${prefix} "${r.title}" #${i + 1}`, strandId));
  return {
    id: strandId,
    subjectId,
    title: r.title.trim(),
    description: optionalStr(r.description),
    subtopics,
  };
}

function normalizeSubject(raw: unknown, prefix: string, curriculumId: string): SeedSubject {
  if (typeof raw !== "object" || raw === null) throw new Error(`${prefix}: invalid subject`);
  const r = raw as { name?: unknown; description?: unknown; strands?: unknown };
  if (!isStr(r.name)) throw new Error(`${prefix}: subject "name" is required`);
  if (!Array.isArray(r.strands)) throw new Error(`${prefix} "${r.name}": "strands" array is required`);
  if (r.strands.length === 0) throw new Error(`${prefix} "${r.name}": at least one strand required`);
  const subjectId = generateId();
  const strands = r.strands.map((s, i) => normalizeStrand(s, `${prefix} "${r.name}" strand #${i + 1}`, subjectId));
  return {
    id: subjectId,
    curriculumId,
    name: r.name.trim(),
    description: optionalStr(r.description),
    strands,
  };
}

function normalizeCurriculum(raw: unknown, idx: number): SeedCurriculum {
  const prefix = `Curriculum #${idx + 1}`;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error(`${prefix}: invalid curriculum`);
  const r = raw as Record<string, unknown>;
  const isKicd = isStr(r.name_of_design) && Array.isArray(r.strands);
  if (isKicd) return normalizeKicdCurriculum(r, idx);

  if (!isStr(r.name)) throw new Error(`${prefix}: "name" is required (or use the KICD format with "name_of_design" and "grade")`);
  const name = normRequiredStr(r.name, prefix, "name");
  if (!isStr(r.gradeLevel)) throw new Error(`${prefix} "${name}": "gradeLevel" is required`);
  if (!Array.isArray(r.subjects)) throw new Error(`${prefix} "${name}": "subjects" array is required`);
  if (r.subjects.length === 0) throw new Error(`${prefix} "${name}": at least one subject required`);

  const curriculumId = generateId();
  const curriculum: Curriculum = {
    id: curriculumId,
    name,
    gradeLevel: r.gradeLevel.trim(),
    country: optionalStr(r.country) ?? "Kenya",
    description: optionalStr(r.description),
  };

  const subjects = r.subjects.map((s, i) => normalizeSubject(s, `${prefix} "${name}" subject #${i + 1}`, curriculumId));

  return { curriculum, subjects };
}

// ---- KICD / official design format (e.g. the example the user pastes from KICD designs) ----
// { "name_of_design", "grade", "strands": [{ "strand_number", "strand_title", "substrands":
//   [{ "substrand_number", "substrand_title", "projected_number_of_lessons",
//      "specific_learning_outcomes": [...], "core_competencies_developed": [...] }] }] }

function normalizeKicdSubtopic(raw: unknown, prefix: string, strandId: string): Subtopic {
  if (typeof raw !== "object" || raw === null) throw new Error(`${prefix}: invalid substrand`);
  const r = raw as {
    substrand_title?: unknown;
    specific_learning_outcomes?: unknown;
    projected_number_of_lessons?: unknown;
    core_competencies_developed?: unknown;
    suggested_learning_experiences?: unknown;
  };
  if (!isStr(r.substrand_title)) throw new Error(`${prefix}: substrand "substrand_title" is required`);
  const title = r.substrand_title.trim();
  const outcomes = asStringArray(r.specific_learning_outcomes, `${prefix} "${title}" "specific_learning_outcomes"`);
  const comps = asOptionalStringArray(r.core_competencies_developed, `${prefix} "${title}" "core_competencies_developed"`);
  const exps = asOptionalStringArray(r.suggested_learning_experiences, `${prefix} "${title}" "suggested_learning_experiences"`);
  if (isEmptyOutcomeSet(outcomes, comps))
    throw new Error(`${prefix} "${title}": at least one "specific_learning_outcomes" or "core_competencies_developed" entry is required`);
  return {
    id: generateId(),
    strandId,
    title,
    learningOutcomes: outcomes,
    lessonCount: toOptionalNumber(r.projected_number_of_lessons),
    coreCompetencies: comps,
    suggestedExperiences: exps,
  };
}

function normalizeKicdStrand(raw: unknown, prefix: string, subjectId: string): SeedStrand {
  if (typeof raw !== "object" || raw === null) throw new Error(`${prefix}: invalid strand`);
  const r = raw as { strand_title?: unknown; strand_number?: unknown; substrands?: unknown };
  if (!isStr(r.strand_title)) throw new Error(`${prefix}: strand "strand_title" is required`);
  if (!Array.isArray(r.substrands)) throw new Error(`${prefix} "${r.strand_title}": "substrands" array is required`);
  if (r.substrands.length === 0) throw new Error(`${prefix} "${r.strand_title}": at least one substrand required`);
  const strandId = generateId();
  const subtopics = r.substrands.map((s, i) => normalizeKicdSubtopic(s, `${prefix} "${r.strand_title}" #${i + 1}`, strandId));
  return {
    id: strandId,
    subjectId,
    title: String(r.strand_title).trim(),
    description: undefined,
    subtopics,
  };
}

function normalizeKicdCurriculum(raw: Record<string, unknown>, idx: number): SeedCurriculum {
  const prefix = `Curriculum #${idx + 1}`;
  const name = normRequiredStr(raw.name_of_design, prefix, "name_of_design");
  const gradeLevel = normalizeGrade(raw.grade, prefix);
  if (!Array.isArray(raw.strands)) throw new Error(`${prefix} "${name}": "strands" array is required`);
  if (raw.strands.length === 0) throw new Error(`${prefix} "${name}": at least one strand required`);

  const curriculumId = generateId();
  const curriculum: Curriculum = {
    id: curriculumId,
    name,
    gradeLevel,
    country: optionalStr(raw.country) ?? "Kenya",
    description: optionalStr(raw.description) ?? "Imported from a KICD curriculum design.",
  };

  const subjectId = generateId();
  const subjects: SeedSubject[] = [
    {
      id: subjectId,
      curriculumId,
      name: curriculumNameToLearningArea(name, gradeLevel),
      description: undefined,
      strands: raw.strands.map((s, i) => normalizeKicdStrand(s, `${prefix} "${name}" strand #${i + 1}`, subjectId)),
    },
  ];

  return { curriculum, subjects };
}

function curriculumNameToLearningArea(name: string, gradeLevel: string): string {
  // "PRIMARY SCHOOL EDUCATION CURRICULUM DESIGN SCIENCE & TECHNOLOGY" + "Grade 6"
  // -> try the trailing all-caps token(s) after genre words, else leave the name.
  const cleaned = name
    .replace(/PRIMARY SCHOOL EDUCATION/i, "")
    .replace(/JUNIOR SCHOOL/i, "")
    .replace(/CURRICULUM DESIGN/i, "")
    .replace(new RegExp(gradeLevel, "i"), "")
    .replace(/^(?::|-\s*)/, "")
    .trim();
  return cleaned || name.trim();
}

function dedupeCurricula(items: SeedCurriculum[]): { out: SeedCurriculum[]; skipped: number } {
  const seen = new Set<string>();
  const out: SeedCurriculum[] = [];
  let skipped = 0;
  for (const item of items) {
    const k = CUR_KEY(item.curriculum);
    if (seen.has(k)) {
      skipped++;
      continue;
    }
    seen.add(k);
    out.push(item);
  }
  return { out, skipped };
}

export function normalizeCurriculumInput(value: unknown): NormalizeResult {
  try {
    let inputs: unknown[];
    if (Array.isArray(value)) {
      inputs = value;
    } else if (typeof value === "object" && value !== null) {
      inputs = [value];
    } else {
      return { ok: false, error: "Import must be a single curriculum object or an array of curriculum objects." };
    }
    if (inputs.length === 0) return { ok: false, error: "No curricula found in the imported data." };
    if (inputs.length > MAX_ITEMS) return { ok: false, error: `Too many curricula (max ${MAX_ITEMS}).` };

    const curricula = inputs.map((c, i) => normalizeCurriculum(c, i));

    let subjectsCount = 0;
    let strandsCount = 0;
    let subtopicsCount = 0;
    for (const c of curricula) {
      subjectsCount += c.subjects.length;
      for (const s of c.subjects) {
        strandsCount += s.strands.length;
        for (const st of s.strands) subtopicsCount += st.subtopics.length;
      }
    }
    if (subjectsCount > MAX_SUBJECTS) return { ok: false, error: `Too many subjects (max ${MAX_SUBJECTS}).` };
    if (strandsCount > MAX_STRANDS) return { ok: false, error: `Too many strands (max ${MAX_STRANDS}).` };
    if (subtopicsCount > MAX_SUBTOPICS) return { ok: false, error: `Too many subtopics (max ${MAX_SUBTOPICS}).` };

    return {
      ok: true,
      items: curricula,
      stats: { curricula: curricula.length, subjects: subjectsCount, strands: strandsCount, subtopics: subtopicsCount },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid curriculum data." };
  }
}

const CUR_KEY = (c: Curriculum) => `${c.name}::${c.gradeLevel}`;

export async function importCurricula(input: SeedCurriculum[]): Promise<{ added: number; skipped: number }> {
  const db = getLocalDB();
  const existing = await db.curricula.toArray();
  const existingKeys = new Set(existing.map((c) => CUR_KEY(c)));
  const { out } = dedupeCurricula(input);
  let skipped = 0;

  try {
    await db.transaction("rw", db.curricula, db.subjects, db.strands, db.subtopics, async () => {
      for (const item of out) {
        if (existingKeys.has(CUR_KEY(item.curriculum))) {
          skipped++;
          continue;
        }
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
  } catch (e) {
    console.error("importCurricula transaction failed:", e);
    throw e;
  }
  return { added: out.length, skipped };
}

export async function clearCurriculumData(): Promise<void> {
  const db = getLocalDB();
  await db.subtopics.clear();
  await db.strands.clear();
  await db.subjects.clear();
  await db.curricula.clear();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("st.selection");
    } catch {
      /* ignore */
    }
  }
}

export function signalCurriculumChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("st-curriculum-changed"));
  }
}

export const CURRICULUM_IMPORT_EXAMPLE = `[
  {
    "name": "CBC Grade 7 Mathematics",
    "gradeLevel": "Grade 7",
    "country": "Kenya",
    "description": "Matrices, standard form, scale drawing, trigonometry.",
    "subjects": [
      {
        "name": "Mathematics",
        "description": "Strands for Grade 7 Mathematics.",
        "strands": [
          {
            "title": "Numbers & Operations",
            "description": "Standard form and operations.",
            "subtopics": [
              {
                "title": "Standard Form",
                "learningOutcomes": [
                  "Express large and small numbers in standard form",
                  "Perform operations using numbers in standard form"
                ]
              }
            ]
          }
        ]
      }
    ]
  }
]`;

// KICD / official design format. Also accepted directly by normalizeCurriculumInput, so a file
// exported from a KICD design (name_of_design + grade + strands/substrands) imports as-is.
export const KICD_IMPORT_EXAMPLE = `{
  "name_of_design": "PRIMARY SCHOOL EDUCATION CURRICULUM DESIGN SCIENCE & TECHNOLOGY",
  "grade": "GRADE 6",
  "strands": [
    {
      "strand_number": "1.0",
      "strand_title": "LIVING THINGS AND THEIR ENVIRONMENT",
      "substrands": [
        {
          "substrand_number": "1.1",
          "substrand_title": "Common fungi (mushrooms, moulds and yeasts)",
          "projected_number_of_lessons": 12,
          "specific_learning_outcomes": [
            "identify common fungi in the environment",
            "describe the importance of fungi in nature"
          ],
          "core_competencies_developed": [
            "Learning to learn: The learner learns new information as they share with peers."
          ]
        }
      ]
    }
  ]
}`;