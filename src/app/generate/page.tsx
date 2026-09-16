import { GenerateView } from "@/components/generate/generate-view";

export default function GeneratePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build curriculum-aligned teaching materials from your selection, uploaded documents and live web context.
        </p>
      </div>
      <GenerateView />
    </div>
  );
}