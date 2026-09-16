"use client";

import { FileDown, FileText, Printer, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface ExportToolbarProps {
  onWord: () => Promise<void>;
  onPdf: () => Promise<void>;
  onPrint?: () => void;
}

export function ExportToolbar({ onWord, onPdf, onPrint }: ExportToolbarProps) {
  const [busy, setBusy] = useState<"word" | "pdf" | null>(null);

  const run = async (kind: "word" | "pdf", fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
      toast.success(kind === "word" ? "Word document downloaded" : "PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => run("word", onWord)}
        disabled={busy !== null}
        aria-label="Export as Word document"
      >
        {busy === "word" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        Word (.docx)
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => run("pdf", onPdf)}
        disabled={busy !== null}
        aria-label="Export as PDF"
      >
        {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        PDF
      </Button>
      {onPrint && (
        <Button variant="outline" size="sm" onClick={onPrint} aria-label="Print directly">
          <Printer className="h-4 w-4" /> Print
        </Button>
      )}
    </div>
  );
}