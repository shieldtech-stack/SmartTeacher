"use client";

import * as React from "react";
import { notFound, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Pencil, Save, Eye } from "lucide-react";
import { getNote, saveNote } from "@/lib/db/store";
import { syncDocument } from "@/lib/offline/sync";
import type { LessonNote } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ExportToolbar } from "@/components/export/export-toolbar";
import { downloadNotesDocx } from "@/lib/export/docx";
import { downloadNotesPdf } from "@/lib/export/pdf";
import { useToast } from "@/hooks/use-toast";

export function NotesView({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [note, setNote] = React.useState<LessonNote | null>(null);
  const [ready, setReady] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    getNote(id).then((n) => {
      setNote(n || null);
      setDraft(n?.markdown || "");
      setReady(true);
    });
  }, [id]);

  if (!ready) return null;
  if (!note) return notFound();

  const onSaveEdit = async () => {
    const updated = { ...note, markdown: draft };
    await saveNote(updated);
    await syncDocument("note", updated);
    setNote(updated);
    setEditing(false);
    toast({ description: "Notes saved." });
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/library")}>
          <ArrowLeft className="h-4 w-4" /> Library
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setEditing(false); setDraft(note.markdown); }}>
                <Eye className="h-4 w-4" /> Preview
              </Button>
              <Button size="sm" onClick={onSaveEdit}>
                <Save className="h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit Markdown
            </Button>
          )}
          <ExportToolbar onWord={() => downloadNotesDocx(note)} onPdf={() => downloadNotesPdf(note)} />
        </div>
      </div>

      <div className="print-page">
        <div className="mb-3">
          <h1 className="text-xl font-bold sm:text-2xl">{note.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{note.subject}</Badge>
            <Badge variant="secondary">{note.gradeLevel}</Badge>
            <span className="text-xs text-muted-foreground">Created {formatDate(note.createdAt)}</span>
          </div>
        </div>

        {editing ? (
          <Card>
            <CardContent className="p-4">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[420px] font-mono text-sm" />
              {note.keyTerms.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-semibold">Key Terms</h3>
                  <ul className="space-y-1 text-sm">{note.keyTerms.map((k, i) => <li key={i}><b>{k.term}:</b> {k.definition}</li>)}</ul>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5">
              <div className="md-body space-y-3 text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}