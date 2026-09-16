import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import type { SchemeOfWork, LessonPlan, LessonNote } from "@/lib/types";

const HEADING_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
};

function metaParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value || "", size: 22 }),
    ],
    spacing: { after: 60 },
  });
}

function sectionHeading(text: string, level: 1 | 2 | 3 = 2): Paragraph {
  return new Paragraph({
    heading: HEADING_MAP[level] || HeadingLevel.HEADING_2,
    children: [new TextRun({ text })],
    spacing: { before: 240, after: 120 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: "•  " }), new TextRun({ text, size: 22 })],
    spacing: { after: 60 },
  });
}

function para(text: string, opts?: { size?: number; bold?: boolean; italics?: boolean }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: opts?.size ?? 22, bold: opts?.bold, italics: opts?.italics })],
    spacing: { after: 80 },
  });
}

// ---------------------------------------------------------------------------
// Scheme of Work
// ---------------------------------------------------------------------------

export function buildSchemeDocx(scheme: SchemeOfWork): Document {
  const headerCell = (text: string) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 16 })] })],
      shading: { fill: "EEF2FF" },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
    });

  const cell = (text: string) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, size: 16 })] })],
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
    });

  const headerRow = new TableRow({
    children: ["Week", "Lesson", "Sub-topic", "Learning Outcomes", "Key Inquiry Questions", "Activities", "Resources", "Assessment"].map(headerCell),
  });

  const bodyRows = scheme.rows.map(
    (r) =>
      new TableRow({
        children: [
          cell(String(r.week)),
          cell(String(r.lessonNumber)),
          cell(r.subtopic),
          cell(r.learningOutcomes.join("; ")),
          cell(r.keyInquiryQuestions.join("; ")),
          cell(r.learningActivities.join("; ")),
          cell(r.resources.join(", ")),
          cell(r.assessment.join("; ")),
        ],
      })
  );

  return new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: scheme.title })] }),
          metaParagraph("Subject", scheme.subject),
          metaParagraph("Grade", scheme.gradeLevel),
          metaParagraph("Strand", scheme.strand),
          metaParagraph("Term", scheme.term),
          metaParagraph("Year", String(scheme.year)),
          metaParagraph("Weeks", String(scheme.durationWeeks)),
          new Paragraph({ children: [], spacing: { after: 120 } }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] }),
        ],
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Lesson Plan
// ---------------------------------------------------------------------------

export function buildPlanDocx(plan: LessonPlan): Document {
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: plan.title })] }),
    metaParagraph("Topic", plan.topic),
    metaParagraph("Subject", plan.subject),
    metaParagraph("Grade", plan.gradeLevel),
    metaParagraph("Duration", `${plan.durationMinutes} minutes`),
  ];

  children.push(sectionHeading("Learning Objectives"));
  plan.objectives.forEach((o) => children.push(bullet(o)));

  if (plan.keyInquiryQuestions?.length) {
    children.push(sectionHeading("Key Inquiry Questions"));
    plan.keyInquiryQuestions.forEach((q) => children.push(bullet(q)));
  }

  children.push(sectionHeading("Lesson Activities"));
  plan.activities.forEach((a) => {
    const total = `${a.section} (${a.durationMinutes} min)`;
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 60 }, children: [new TextRun({ text: total })] })
    );
    children.push(para(a.description));
    a.teacherActivity?.forEach((t) => children.push(bullet("Teacher: " + t)));
    a.learnerActivity?.forEach((t) => children.push(bullet("Learner: " + t)));
  });

  children.push(sectionHeading("Assessment"));
  plan.assessmentMethods.forEach((a) => children.push(bullet(a)));

  children.push(sectionHeading("Differentiation"));
  children.push(para(plan.differentiationNotes));

  children.push(sectionHeading("Materials & Resources"));
  plan.materials.forEach((m) => children.push(bullet(m)));

  return new Document({ sections: [{ properties: {}, children }] });
}

// ---------------------------------------------------------------------------
// Lesson Notes (simple Markdown → DOCX)
// ---------------------------------------------------------------------------

function markdownParagraphs(markdown: string): Paragraph[] {
  const out: Paragraph[] = [];
  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("# ")) {
      out.push(sectionHeading(trimmed.slice(2), 1));
    } else if (trimmed.startsWith("## ")) {
      out.push(sectionHeading(trimmed.slice(3), 2));
    } else if (trimmed.startsWith("### ")) {
      out.push(sectionHeading(trimmed.slice(4), 3));
    } else if (trimmed.startsWith("- ")) {
      out.push(bullet(trimmed.slice(2)));
    } else if (/^\d+\.\s/.test(trimmed)) {
      out.push(bullet(trimmed.replace(/^\d+\.\s/, "")));
    } else if (trimmed.startsWith("> ")) {
      out.push(para(trimmed.slice(2), { italics: true }));
    } else {
      const clean = trimmed.replace(/\*\*(.+?)\*\*/g, "$1");
      out.push(para(clean));
    }
  }
  return out;
}

export function buildNotesDocx(note: LessonNote): Document {
  const children = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: note.title })] }),
    metaParagraph("Subject", note.subject),
    metaParagraph("Grade", note.gradeLevel),
    ...markdownParagraphs(note.markdown),
  ];
  return new Document({ sections: [{ properties: {}, children }] });
}

// ---------------------------------------------------------------------------
// Save helpers
// ---------------------------------------------------------------------------

export async function downloadSchemeDocx(scheme: SchemeOfWork): Promise<void> {
  const blob = await Packer.toBlob(buildSchemeDocx(scheme));
  saveAs(blob, `${slug(scheme.title)}.docx`);
}
export async function downloadPlanDocx(plan: LessonPlan): Promise<void> {
  const blob = await Packer.toBlob(buildPlanDocx(plan));
  saveAs(blob, `${slug(plan.title)}.docx`);
}
export async function downloadNotesDocx(note: LessonNote): Promise<void> {
  const blob = await Packer.toBlob(buildNotesDocx(note));
  saveAs(blob, `${slug(note.title)}.docx`);
}

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "document";
}