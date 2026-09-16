import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SchemeOfWork, LessonPlan, LessonNote } from "@/lib/types";

const INDIGO: [number, number, number] = [99, 102, 241];
const SLATE: [number, number, number] = [113, 113, 122];

function header(doc: jsPDF, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...INDIGO);
  doc.text(title.split("\n")[0], 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(new Date().toLocaleDateString(), doc.internal.pageSize.getWidth() - 14, 18, { align: "right" });
  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(0.6);
  doc.line(14, 22, doc.internal.pageSize.getWidth() - 14, 22);
}

function metaLine(doc: jsPDF, label: string, value: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text(`${label}:`, 14, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(63, 63, 70);
  const x = 14 + doc.getTextWidth(`${label}:`) + 2;
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(value || "-", doc.internal.pageSize.getWidth() - x - 14);
  doc.text(lines as string[], x, y);
  return y + lines.length * 5 + 4;
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(`SmartTeacher • Generated for teaching use • Page ${i}/${pages}`, 14, doc.internal.pageSize.getHeight() - 8);
  }
}

export async function downloadSchemePdf(scheme: SchemeOfWork): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, scheme.title);
  let y = 30;
  y = metaLine(doc, "Subject", scheme.subject, y);
  y = metaLine(doc, "Grade", scheme.gradeLevel, y);
  y = metaLine(doc, "Strand", scheme.strand, y);
  y = metaLine(doc, "Term", scheme.term, y);
  y = metaLine(doc, "Weeks", String(scheme.durationWeeks), y);

  autoTable(doc, {
    startY: y + 2,
    head: [["Week", "Lesson", "Sub-topic", "Outcomes", "Inquiry Questions", "Activities", "Resources", "Assessment"]],
    body: scheme.rows.map((r) => [
      String(r.week),
      String(r.lessonNumber),
      r.subtopic,
      r.learningOutcomes.join("; "),
      r.keyInquiryQuestions.join("; "),
      r.learningActivities.join("; "),
      r.resources.join(", "),
      r.assessment.join("; "),
    ]),
    styles: { fontSize: 7, cellPadding: 1.4 },
    headStyles: { fillColor: INDIGO, fontSize: 7.5 },
    columnStyles: { 0: { cellWidth: 11 }, 1: { cellWidth: 12 } },
    margin: { left: 14, right: 14, bottom: 14 },
  });

  footer(doc);
  doc.save(`${slug(scheme.title)}.pdf`);
}

export async function downloadPlanPdf(plan: LessonPlan): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, plan.title);
  let y = 30;
  y = metaLine(doc, "Topic", plan.topic, y);
  y = metaLine(doc, "Subject", plan.subject, y);
  y = metaLine(doc, "Grade", plan.gradeLevel, y);
  y = metaLine(doc, "Duration", `${plan.durationMinutes} minutes`, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text("Learning Objectives", 14, y + 2);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(63, 63, 70);
  for (const o of plan.objectives) {
    const lines = doc.splitTextToSize(`•  ${o}`, doc.internal.pageSize.getWidth() - 28) as string[];
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 1;
  }
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Phase", "Section", "Min", "Description", "Teacher", "Learner"]],
    body: plan.activities.map((a) => [
      a.phase,
      a.section,
      String(a.durationMinutes),
      a.description,
      (a.teacherActivity || []).join("; "),
      (a.learnerActivity || []).join("; "),
    ]),
    styles: { fontSize: 7.5, cellPadding: 1.6 },
    headStyles: { fillColor: INDIGO },
    margin: { left: 14, right: 14, bottom: 14 },
  });

  footer(doc);
  doc.save(`${slug(plan.title)}.pdf`);
}

export async function downloadNotesPdf(note: LessonNote): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, note.title);
  let y = metaLine(doc, "Subject", note.subject, 30);
  y = metaLine(doc, "Grade", note.gradeLevel, y);
  y += 2;

  const pageHeight = doc.internal.pageSize.getHeight() - 16;
  const lines = note.markdown.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      y += 2;
      continue;
    }
    const isH1 = line.startsWith("# ");
    const isH2 = line.startsWith("## ");
    const isH3 = line.startsWith("### ");
    const isBullet = line.startsWith("- ");
    const text = line.replace(/^#{1,3}\s/, "").replace(/^\d+\.\s/, "").replace(/^-\s/, "•  ").replace(/\*\*(.+?)\*\*/g, "$1");

    if (y > pageHeight) {
      doc.addPage();
      y = 24;
    }

    doc.setFont("helvetica", isH1 || isH2 ? "bold" : isBullet ? "normal" : "normal");
    doc.setFontSize(isH1 ? 14 : isH2 ? 12 : 9.5);
    if (isH1 || isH2) doc.setTextColor(...INDIGO);
    else doc.setTextColor(63, 63, 70);

    const wrapped = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - 28) as string[];
    doc.text(wrapped, 14, y);
    y += wrapped.length * (isH1 ? 6 : isH2 ? 5.5 : 4.6) + (isH1 || isH2 ? 3 : 0.5);
  }

  footer(doc);
  doc.save(`${slug(note.title)}.pdf`);
}

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document"
  );
}