import { CurriculumWizard } from "@/components/curriculum-wizard";
import { CurriculumImporter } from "@/components/curriculum/curriculum-importer";

export default function CurriculumPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Curriculum Selector</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick your grade, subject, strand and subtopics — the selection powers your Schemes of Work, Lesson Plans and Notes.
        </p>
      </div>
      <CurriculumWizard />
      <CurriculumImporter />
    </div>
  );
}