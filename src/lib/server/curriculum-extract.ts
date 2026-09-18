import { callLlm, parseJsonLoose } from "./provider";
import {
  normalizeCurriculumInput,
  type ImportStats,
} from "@/lib/curriculum/import";
import type { SeedCurriculum } from "@/lib/curriculum/seed-data";
import type { ProviderSettings } from "@/lib/types";

export type ExtractionSource = "llm" | "heuristic";

export interface ExtractionResult {
  ok: boolean;
  curricula: SeedCurriculum[];
  stats: ImportStats;
  source?: ExtractionSource;
  error?: string;
}

const LLM_MAX_CHARS = 120000;

function hasConfiguredLlm(settings: ProviderSettings): boolean {
  if (settings.llmProvider === "openai") return Boolean(settings.openaiKey);
  if (settings.llmProvider === "anthropic") return Boolean(settings.anthropicKey);
  if (settings.llmProvider === "google") return Boolean(settings.googleKey);
  if (settings.llmProvider === "openrouter") return Boolean(settings.openrouterKey);
  return false;
}

const SYSTEM_PROMPT = [
  "You are an expert at converting curriculum design documents into a structured JSON format.",
  "You receive the text of a national curriculum design (e.g. KICD Competency-Based Curriculum) for one grade and learning area.",
  "Extract it into the EXACT JSON shape below. Output valid JSON only — no markdown fences, no commentary.",
  "",
  `[
    {
      "name": "CBC Grade 7 Mathematics",
      "gradeLevel": "Grade 7",
      "country": "Kenya",
      "description": "Short summary of the learning area",
      "subjects": [
        {
          "name": "Mathematics",
          "strands": [
            {
              "title": "Numbers & Operations",
              "description": "Optional short description",
              "subtopics": [
                {
                  "title": "Standard Form",
                  "learningOutcomes": [
                    "Express large and small numbers in standard form"
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]`,
  "",
  "Rules:",
  "- If the document is a single learning area, still return an array with ONE curriculum object.",
  "- Strands are the top-level themes of the document. Sub-strands become 'subtopics' with their 'learningOutcomes' (the 'By the end of the sub-strand, the learner should be able to …' statements).",
  "- Keep every distinct sub-strand as its own subtopic. Preserve learning outcomes as close to the source wording as possible.",
  "- Skip sections like lists of suggested learning experiences, key inquiry questions, resources, assessment rubrics, core competencies, and value statements — only extract strands, sub-strands and their learning outcomes.",
  "- Do NOT invent content. If nothing usable is found, return an empty array [].",
].join("\n");

async function viaLlm(text: string, settings: ProviderSettings): Promise<ExtractionResult> {
  const provider = settings.llmProvider;
  if (provider === "offline") {
    return { ok: false, curricula: [], stats: { curricula: 0, subjects: 0, strands: 0, subtopics: 0 }, source: "llm", error: "No LLM configured" };
  }
  const raw = await callLlm({
    provider,
    openaiKey: settings.openaiKey,
    openaiModel: settings.openaiModel,
    anthropicKey: settings.anthropicKey,
    anthropicModel: settings.anthropicModel,
    googleKey: settings.googleKey,
    googleModel: settings.googleModel,
    openrouterKey: settings.openrouterKey,
    openrouterModel: settings.openrouterModel,
    system: SYSTEM_PROMPT,
    user: `Curriculum design document text:\n\n${text.slice(0, LLM_MAX_CHARS)}`,
    expectJson: provider === "openai" || provider === "openrouter",
    maxTokens: 6000,
    temperature: 0.2,
  });

  const parsed = parseJsonLoose<unknown>(raw);
  const norm = normalizeCurriculumInput(parsed);
  if (!norm.ok || norm.items.length === 0) {
    return { ok: false, curricula: [], stats: norm.ok ? norm.stats : { curricula: 0, subjects: 0, strands: 0, subtopics: 0 }, error: norm.ok ? "No usable content extracted." : norm.error };
  }
  return { ok: true, curricula: norm.items, stats: norm.stats, source: "llm" };
}

// ---------------------------------------------------------------------------
// Heuristic fallback (no LLM key). Best-effort scanning of a design document.
// ---------------------------------------------------------------------------

const STRAND_RE =
  /^\s*(?:STRAND|Strand|Topic)\s*(?:[0-9]+(?:\.0)?[:.\-]?)?\s*[:.\-]?\s*(.+?)\s*$/;
// a line that mentions "strand" as the table column header or mid-sentence context is NOT a strand header
const STRAND_LIKE_SKIP_RE = /strand\s+sub\s+strand|strands?\s+sub-?\s*strands?|\bstem\s+strand\b|^summary\s+of\s+strands|suggested\s+number\s+of\s+lessons|^strands?\s*(?:sub-?strands?)?\s+(?:suggested\s+number|specific|learning|outcomes?|key\s+inquiry)/i;
const SUBSTRAND_RE =
  /^\s*(?:[0-9]+\.[1-9][0-9]*(?:\.[0-9]+)?|Sub[- ]?[Ss]trand|Sub[- ]?[Ss]tand|Sub topic|S\.S[:.\-]?|S\/S)\s*[:.\-]?\s*(.+?)\s*$/i;
// Real KICD designs place sub-strands in table rows like "1.0 Numbers 1.1 Whole Numbers (20 lessons)".
const TABLE_ROW_RE = /^\s*[0-9]+\s*\.\s*0\s+[^0-9]+?\s+([0-9]+)\.([1-9][0-9]*)\s+(.+?)\s*(?:\(\s*[0-9]+\s*lessons?\s*\))?\s*$/i;
const LESSON_COUNT_RE = /^\s*\(\s*[0-9]+\s*(?:-|–)\s*[0-9]+\s*lessons?\s*\)|^\s*\(\s*[0-9]+\s*lessons?\s*\)/i;
const LESSON_COUNT_INLINE_RE = /\(?\s*([0-9]+(?:\s*(?:-|–)\s*[0-9]+)?)\s*lessons?\s*\)?/i;
const NUMBERED_HEADER_RE = /^\s*[0-9]+\.[0-9]+(?:\.[0-9]+)?\s/;
// Learning outcomes are the lettered bullets under "By the end of the sub-strand ... should be able to:".
const LETTER_BULLET_RE = /^\s*(?:\(\s*[a-z0-9]+\s*\)\s*|[a-z0-9]+\)\s*)(.*)$/i;
// ● bullets are content / suggested experiences / competencies, never learning outcomes.
const DOT_BULLET_RE = /^\s*(?:[•●▪◦]\s*|\uF0B7[\s,;:.\-]*|\uFFFD[\s,;:.\-]*\uFFFD\s*)(.*)$/i;
// Phase-marker phrases (may wrap across extraction lines; handled via state + fragment buffer).
const BY_END_RE = /^by the end of\b/i;
const GUIDED_TO_RE = /the learner is guided to\s*[:.]?$/i;
const KEY_INQUIRY_RE = /key\s+inquiry\s+questions?\s*[:.]?$/i;
const CORE_COMPETENCIES_RE = /core competencies?(?:\s*to be developed)?\s*[:.]?$/i;
// Section headers that end the core-competencies block (and must not be captured as competencies).
const COMPETENCY_STOP_RE = /^(?:links?\s+to\s+other\s+learning\s+areas?|values?|pertinent|outcomes?|inquiry|question\(s\)|assessment|learning\s+resources|note|suggested|key\s+inquiry)/i;
const SKIP_RE =
  /^\s*(page\s*\d+|contents?|introduction|rationale|general\s+learning\s+outcomes?|specific\s+learning\s+outcomes?|suggested\s+learning\s+experiences?|key\s+inquiry\s+questions?|core\s+competencies?|values|pertinent|learning\s+resources|assessment\s*(rubric)?|the\s+learner\s+is\s+guided\s+to|notes?|references?|strand\s+sub\s+strand|suggested\s+number\s+of\s+lessons|total\s+number\s+of\s+lessons)\b/i;
// Anything after an appendix/annex is reference material (re-lists every strand), not new content.
// A Table of Contents also lists "APPENDIX 1: ... .....page" entries — those carry page-dot leaders and
// must not trigger the cut, so we require the line to not end in dots/numbers.
const APPENDIX_RE = /^\s*(?:appendix|annex(?:ure)?)\s*(?:(?:\d|[ivxlcdm])+)[:.\-]?\s/i;
const APPENDIX_TOC_RE = /^\s*(?:appendix|annex(?:ure)?)\s*(?:(?:\d|[ivxlcdm])+)[:.\-]?\s.*[.]{3,}\s*\d*\s*$/i;

function cleanTitle(s: string): string {
  return s
    .replace(/^\s*(?:strand|topic|sub.?strand|s\.s)\s*[:.\-]?\s*/i, "")
    .replace(/\bby the end of[.,]?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[:.\s]+$/, "")
    .trim();
}

interface HeurSubtopic {
  title: string;
  learningOutcomes: string[];
  lessonCount?: number;
  coreCompetencies?: string[];
  suggestedExperiences?: string[];
}

interface HeurCurriculum {
  name: string;
  gradeLevel: string;
  description: string;
  subjects: { name: string; strands: { title: string; subtopics: HeurSubtopic[] }[] }[];
}

const GRADE_RE = /\bgrade\s*(\d(?:\.\d)?)\b/i;
const SCHOOL_BAND_RE = /\b(junior\s+school|lower\s+primary|upper\s+primary|pre-?primary|senior\s+school|middle\s+school)\b/i;
const BOILERPLATE_LINES =
  /^(kenya\s+institute(\s+of\s+curriculum\s+development)?|a\s+skilled|first\s+published|revised\s+\d{4}|all\s+rights|isbn|published\s+and\s+printed|foreword|preface|acknowledg|\s*cbc\s*$|junior\s+school\s+curriculum\s+design|lower\s+primary\s+curriculum\s+design|upper\s+primary\s+curriculum\s+design|grade\s*\d+)$/i;

interface DocMetadata {
  gradeLevel: string;
  learningArea: string;
  title: string;
}

function detectMetadata(lines: string[], subjectHint: string): DocMetadata {
  // ---- grade ----
  let gradeLevel = "Review before import";
  const frontLines: string[] = [];
  for (const line of lines) {
    if (line === "FOREWORD" || line === "PREFACE") break;
    frontLines.push(line);
  }
  // Prefer an explicit grade number (e.g. "GRADE 7") wherever it appears.
  const explicitGrade = frontLines.map((l) => l.match(GRADE_RE)?.[1]).find(Boolean);
  if (explicitGrade) {
    gradeLevel = `Grade ${explicitGrade}`;
  } else {
    for (const line of frontLines) {
      const band = line.match(SCHOOL_BAND_RE);
      if (band) {
        const b = band[1].toLowerCase();
        if (b.includes("junior")) gradeLevel = "Junior School (Grade 7–9)";
        else if (b.includes("lower primary")) gradeLevel = "Lower Primary (Grade 1–3)";
        else if (b.includes("upper primary")) gradeLevel = "Upper Primary (Grade 4–6)";
        else if (b.includes("pre-primary")) gradeLevel = "Pre-Primary";
        else if (b.includes("senior school")) gradeLevel = "Senior School (Grade 10–12)";
        break;
      }
    }
  }

  // ---- learning area ----
  let learningArea = subjectHint || "Learning Area";
  // Prefer a short title-page line that is not boilerplate or a strand.
  for (const line of lines) {
    if (line === "FOREWORD" || line === "PREFACE") break;
    const w = line.trim();
    if (w.length < 2 || w.length > 40) continue;
    if (BOILERPLATE_LINES.test(w)) continue;
    if (/^[A-Z][A-Z &'()-]+$/.test(w) || /^[a-z][a-z ]{2,}$/.test(w)) {
      const lower = w.toLowerCase();
      if (!/(numbers|algebra|geometry|measurement|data handling|strand|topic)/i.test(lower)) {
        learningArea = w;
        break;
      }
    }
  }

  // ---- title ----
  let title = learningArea;
  if (gradeLevel !== "Review before import") title = `${gradeLevel} ${learningArea}`;
  const name = title.replace(/\s+/g, " ").trim() || "Imported Curriculum Design";
  return { gradeLevel, learningArea, title: name };
}

function heuristicExtract(text: string): ExtractionResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const meta = detectMetadata(lines, "Learning Area");
  const S: {
    cur: HeurCurriculum;
    lastStrandIdx: number;
    pendingSubtopic: HeurSubtopic | null;
    phase: "subtopic" | "outcomes" | "content" | "competencies" | null;
    // Buffers wrapped phase-header fragments like "By the end of the" + "learner should be able to:"
    byEndBuf: string;
  } = {
    cur: {
      name: meta.title,
      gradeLevel: meta.gradeLevel,
      description: "Imported from a curriculum design document. Review strand and subtopic titles after import.",
      subjects: [{ name: meta.learningArea, strands: [] }],
    },
    lastStrandIdx: -1,
    pendingSubtopic: null,
    phase: null,
    byEndBuf: "",
  };

  const strandCount = () => S.cur.subjects[0]?.strands.length ?? 0;
  const subtopicCount = () => {
    if (strandCount() === 0) return 0;
    return S.cur.subjects[0].strands[S.lastStrandIdx].subtopics.length;
  };

  const resetPhase = () => {
    S.phase = null;
    S.byEndBuf = "";
  };

  const commitPendingSubtopic = () => {
    const strands = S.cur.subjects[0].strands;
    const strand = strands[S.lastStrandIdx];
    if (S.pendingSubtopic && strand) {
      // Only keep a subtopic if it has a real title and some lettered learning outcomes.
      if (
        S.pendingSubtopic.title &&
        !/learner should|should be able|sub.?strand the|by the end/i.test(S.pendingSubtopic.title) &&
        (S.pendingSubtopic.learningOutcomes.length > 0 ||
          S.pendingSubtopic.coreCompetencies?.length ||
          S.pendingSubtopic.title)
      ) {
        strand.subtopics.push(S.pendingSubtopic);
      }
    }
    S.pendingSubtopic = null;
    resetPhase();
  };

  const addStrand = (title: string) => {
    commitPendingSubtopic();
    if (!S.cur.subjects[0].strands.some((s) => s.title === title)) {
      S.cur.subjects[0].strands.push({ title, subtopics: [] });
    }
    S.lastStrandIdx = S.cur.subjects[0].strands.findIndex((s) => s.title === title);
    resetPhase();
  };

  const addSubtopic = (title: string) => {
    commitPendingSubtopic();
    S.pendingSubtopic = { title: cleanTitle(title) || `Subtopic ${subtopicCount() + 1}`, learningOutcomes: [] };
    S.phase = "subtopic";
  };

  // join wrapped sub-strand names like "3.4 Volume and\nCapacity\n(8 lessons)"
  const joinWrappedName = (i: number, first: string): { name: string; nextIdx: number } => {
    let name = cleanTitle(first);
    let j = i + 1;
    let guard = 0;
    while (j < bodyLines.length && guard < 6) {
      const l = bodyLines[j];
      if (LESSON_COUNT_RE.test(l) || /[•●\-]/.test(l[0]) || /^\s*(?:[a-z0-9]+\)|\(\s*[a-z0-9]+\s*\)|\d+\.)\s/.test(l)) break;
      if (SKIP_RE.test(l) || STRAND_RE.test(l) || TABLE_ROW_RE.test(l) || SUBSTRAND_RE.test(l) || NUMBERED_HEADER_RE.test(l)) break;
      if (l.length < 2 || l.length > 60) break;
      name += ` ${l}`;
      j++;
      guard++;
    }
    return { name: name.replace(/\s+/g, " ").trim(), nextIdx: j - 1 };
  };

  // The TOC/summary re-lists every strand; drop everything before the first real strand header and
  // everything at/after the first appendix (which re-lists every strand too). Front matter words like
  // "SPECIFIC LEARNING OUTCOMES" in the preamble are harmless because the body scan starts at STRAND 1.0.
  const appendixStart = lines.findIndex((l) => APPENDIX_RE.test(l) && !APPENDIX_TOC_RE.test(l));
  const cutEnd = appendixStart === -1 ? lines.length : appendixStart;
  const firstStrandIdx = lines.findIndex(
    (l) =>
      STRAND_RE.test(l) &&
      !STRAND_LIKE_SKIP_RE.test(l) &&
      !NUMBERED_HEADER_RE.test(l) &&
      !TABLE_ROW_RE.test(l) &&
      !/[.]{3,}/.test(l) &&
      !SKIP_RE.test(l)
  );
  const bodyLines = firstStrandIdx === -1 ? [] : lines.slice(firstStrandIdx, cutEnd);

  for (let i = 0; i < bodyLines.length; i++) {
    const raw = bodyLines[i];
    if (!raw) continue;

    // Wrapped "By the end of the sub-strand the learner should be able to:" — consume the
    // continuation fragments FIRST, otherwise "sub-strand the" would match SUBSTRAND_RE and
    // leak a junk subtopic.
    if (S.byEndBuf) {
      if (/should be able|able to\s*[:.]?$/i.test(raw)) {
        S.byEndBuf = "";
        S.phase = "outcomes";
      }
      continue;
    }
    if (BY_END_RE.test(raw)) {
      // Single-line form: "By the end of the sub-strand the learner should be able to:"
      if (/should be able to/i.test(raw)) {
        S.phase = "outcomes";
      } else {
        S.byEndBuf = "by the end of";
      }
      continue;
    }

    const isNumberedHeader = NUMBERED_HEADER_RE.test(raw);
    const tableRow = raw.match(TABLE_ROW_RE);
    const strandMatch = raw.match(STRAND_RE);
    const substrandMatch = raw.match(SUBSTRAND_RE);

    // Bare sub-strand number alone on a line ("1.2") followed by its title ("Invertebrates").
    const bareNum = raw.match(/^\s*([0-9]+\.[1-9][0-9]*(?:\.[0-9]+)?)\s*\.?\s*$/);
    if (bareNum) {
      const next = bodyLines[i + 1];
      if (
        next &&
        /^[A-Za-z]/.test(next) &&
        next.length <= 70 &&
        !SKIP_RE.test(next) &&
        !STRAND_LIKE_SKIP_RE.test(next) &&
        !TABLE_ROW_RE.test(next) &&
        !STRAND_RE.test(next)
      ) {
        const joined = joinWrappedName(i + 1, next);
        addSubtopic(joined.name);
        i = joined.nextIdx;
        continue;
      }
    }

    // strand header (guard against table column headers like "Strand Sub-Strand Specific")
    if (strandMatch && !isNumberedHeader && !tableRow && !STRAND_LIKE_SKIP_RE.test(raw)) {
      addStrand(cleanTitle(strandMatch[1]));
      continue;
    }

    // KICD table row: "1.0 Numbers 1.1 Whole Numbers (20 lessons)" — sub-strand becomes a subtopic
    if (tableRow) {
      const joined = joinWrappedName(i, `${tableRow[1]}.${tableRow[2]} ${tableRow[3].trim()}`);
      addSubtopic(joined.name.replace(/^[0-9]+\.[0-9]+\s+/, ""));
      i = joined.nextIdx;
      continue;
    }

    // sub-strand header (numbered "1.1 ...", "Sub-strand: ...", or a summary-table row
    // like "1.1. Fungi 12"). Reject bare continuation fragments ("the", "and", numbers).
    if (substrandMatch && !tableRow) {
      const strip = cleanTitle(substrandMatch[1]);
      const bare = /^(the|and|their|they|this|of|for|to|in|able|learner|should|not|area)$/i.test(strip) ||
        /^[\d.]+$/.test(strip);
      if (bare) {
        if (S.phase) commitPendingSubtopic();
        continue;
      }
      const joined = joinWrappedName(i, substrandMatch[1]);
      addSubtopic(joined.name);
      i = joined.nextIdx;
      continue;
    }

    // ---- phase markers ----
    if (/should be able to\s*[:.]?$/i.test(raw)) {
      S.phase = "outcomes";
      continue;
    }
    if (GUIDED_TO_RE.test(raw) || KEY_INQUIRY_RE.test(raw)) {
      S.phase = "content";
      continue;
    }
    if (CORE_COMPETENCIES_RE.test(raw)) {
      S.phase = "competencies";
      continue;
    }

    // "By the end of the sub strand the learner should be able to:" as a single line
    if (/by the end of(?: the)?\s*sub.?strand.*should be able to/i.test(raw)) {
      S.phase = "outcomes";
      continue;
    }

    // separators: column headers, page numbers, section headers. Only close the subtopic at an
    // outcomes boundary, never mid-content ("Note:", "The learner is guided to:").
    if (SKIP_RE.test(raw) || STRAND_LIKE_SKIP_RE.test(raw)) {
      if (S.phase === "outcomes") commitPendingSubtopic();
      continue;
    }

    // lesson-count markers (own line or trailing) — capture into the pending subtopic
    if (LESSON_COUNT_RE.test(raw)) {
      const m = raw.match(LESSON_COUNT_INLINE_RE);
      const n = m ? parseInt(m[1].replace(/[^0-9]/g, ""), 10) : undefined;
      if (S.pendingSubtopic && n) S.pendingSubtopic.lessonCount = n;
      continue;
    }

    // lettered bullet: a) b) c) — a learning outcome (only meaningful in "outcomes" phase)
    if (S.phase === "outcomes" && S.pendingSubtopic) {
      const letter = raw.match(LETTER_BULLET_RE);
      if (letter) {
        const out = letter[1].trim();
        if (out && !/^(\d+|\d+\.\d+|strand|sub.?strand)/i.test(out)) {
          S.pendingSubtopic.learningOutcomes.push(out);
        }
        continue;
      }
      if (raw.length > 3 && !isNumberedHeader && !STRAND_LIKE_SKIP_RE.test(raw)) {
        const last = S.pendingSubtopic.learningOutcomes.length - 1;
        if (last >= 0) {
          S.pendingSubtopic.learningOutcomes[last] = `${S.pendingSubtopic.learningOutcomes[last]} ${raw}`;
        }
      }
      continue;
    }

    // competency bullet under "Core Competencies to be developed:" (● bullets)
    if (S.phase === "competencies" && S.pendingSubtopic) {
      if (COMPETENCY_STOP_RE.test(raw)) {
        S.phase = "content";
        continue;
      }
      const dot = raw.match(DOT_BULLET_RE);
      const letter = raw.match(LETTER_BULLET_RE);
      if (dot) {
        const out = dot[1].trim();
        if (out) {
          if (!S.pendingSubtopic.coreCompetencies) S.pendingSubtopic.coreCompetencies = [];
          S.pendingSubtopic.coreCompetencies.push(out);
        }
        continue;
      }
      if (letter) {
        const out = letter[1].trim();
        if (out) {
          if (!S.pendingSubtopic.coreCompetencies) S.pendingSubtopic.coreCompetencies = [];
          S.pendingSubtopic.coreCompetencies.push(out);
        }
        continue;
      }
      if (raw.length > 3 && !isNumberedHeader && !STRAND_LIKE_SKIP_RE.test(raw)) {
        const last = (S.pendingSubtopic.coreCompetencies?.length ?? 0) - 1;
        if (last >= 0 && S.pendingSubtopic.coreCompetencies) {
          S.pendingSubtopic.coreCompetencies[last] = `${S.pendingSubtopic.coreCompetencies[last]} ${raw}`;
        }
      }
      continue;
    }

    // "content" phase (suggested experiences under "The learner is guided to:") — capture ● bullets as suggestedExperiences.
    if (S.phase === "content" && S.pendingSubtopic) {
      const dot = raw.match(DOT_BULLET_RE);
      const letter = raw.match(LETTER_BULLET_RE);
      if (dot) {
        const exp = dot[1].trim();
        if (exp) {
          if (!S.pendingSubtopic.suggestedExperiences) S.pendingSubtopic.suggestedExperiences = [];
          S.pendingSubtopic.suggestedExperiences.push(exp);
        }
        continue;
      }
      if (letter) {
        const exp = letter[1].trim();
        if (exp) {
          if (!S.pendingSubtopic.suggestedExperiences) S.pendingSubtopic.suggestedExperiences = [];
          S.pendingSubtopic.suggestedExperiences.push(exp);
        }
        continue;
      }
      // continuation of previous experience
      if (raw.length > 3 && !isNumberedHeader && !STRAND_LIKE_SKIP_RE.test(raw)) {
        const last = (S.pendingSubtopic.suggestedExperiences?.length ?? 0) - 1;
        if (last >= 0 && S.pendingSubtopic.suggestedExperiences) {
          S.pendingSubtopic.suggestedExperiences[last] = `${S.pendingSubtopic.suggestedExperiences[last]} ${raw}`;
        }
      }
      continue;
    }

    // subtopic just opened ("subtopic" phase) — wait for phase markers or next header.
    if (S.phase === "subtopic") continue;
  }

  // flush
  commitPendingSubtopic();
  const curricula: HeurCurriculum[] =
    S.cur.subjects[0].strands.length > 0 ? [S.cur] : [];

  const norm = normalizeCurriculumInput(
    curricula.map((c) => ({
      name: c.name,
      gradeLevel: c.gradeLevel,
      description: c.description,
      subjects: c.subjects
        .filter((s) => s.strands.length > 0)
        .map((s) => ({
          name: s.name,
          description: undefined,
          strands: s.strands
            .filter((st) => st.subtopics.length > 0)
            .map((st) => ({
              title: st.title,
              description: undefined,
              subtopics: st.subtopics
                .filter((sub) => sub.learningOutcomes.length > 0 || sub.coreCompetencies?.length)
                .map((sub) => ({
                  title: sub.title,
                  learningOutcomes: sub.learningOutcomes,
                  lessonCount: sub.lessonCount,
                  coreCompetencies: sub.coreCompetencies,
                  suggestedExperiences: sub.suggestedExperiences,
                })),
            })),
        })),
    }))
  );

  if (!norm.ok || norm.items.length === 0) {
    return {
      ok: false,
      curricula: [],
      stats: { curricula: 0, subjects: 0, strands: 0, subtopics: 0 },
      source: "heuristic",
      error: norm.ok
        ? "No strands or subtopics could be identified. Try enabling an AI provider in Settings and re-trying."
        : norm.error,
    };
  }
  return { ok: true, curricula: norm.items, stats: norm.stats, source: "heuristic" };
}

export async function extractCurriculum(
  text: string,
  settings: ProviderSettings
): Promise<ExtractionResult> {
  const preferredLlm = hasConfiguredLlm(settings);
  if (preferredLlm) {
    try {
      const res = await viaLlm(text, settings);
      if (res.ok) return res;
    } catch (e) {
      console.warn("LLM curriculum extraction failed, falling back to heuristic:", e);
    }
  }
  return heuristicExtract(text);
}