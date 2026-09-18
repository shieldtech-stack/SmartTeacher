"use client";

import * as React from "react";
import { UploadCloud, FileText, FileImage, Trash2, Loader2, Search, RefreshCw } from "lucide-react";
import {
  addFile,
  updateFile,
  listFiles,
  deleteFile,
  addChunks,
  allChunks,
} from "@/lib/db/store";
import { uploadFile, ingestText } from "@/lib/client/api";
import { ocrImage } from "@/lib/client/ocr";
import { searchChunks } from "@/lib/retrieval/search";
import { generateId, formatDate } from "@/lib/utils";
import type { UserFile, DocumentChunk, RetrievalChunk } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ACCEPTED = ".pdf,.docx,.png,.jpg,.jpeg";

export function DocumentUploader() {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<UserFile[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<RetrievalChunk[] | null>(null);

  const refresh = React.useCallback(async () => {
    setFiles(await listFiles());
  }, []);

  React.useEffect(() => {
    (async () => {
      refresh();
    })();
  }, [refresh]);

  const handleFiles = async (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    setProcessing(true);
    try {
      for (const file of Array.from(selected)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const isImage = ["png", "jpg", "jpeg"].includes(ext);
        const record = await addFile({ fileName: file.name, fileType: ext, fileSize: file.size });
        setFiles((prev) => [record, ...prev]);

        try {
          await updateFile(record.id, { status: "processing" });
          let text: string;
          let wordCount: number;
          let chunkData: { index: number; content: string }[];

          if (isImage) {
            toast({ title: "Running OCR", description: file.name });
            text = await ocrImage(file);
            if (!text.trim()) throw new Error("No text recognised in the image.");
            const res = await ingestText(text);
            wordCount = res.wordCount;
            chunkData = res.chunks;
          } else {
            const res = await uploadFile(file);
            wordCount = res.wordCount;
            chunkData = res.chunks;
          }

          const chunks: DocumentChunk[] = chunkData.map((c) => ({
            id: generateId(),
            fileId: record.id,
            index: c.index,
            content: c.content,
          }));
          await addChunks(chunks);
          await updateFile(record.id, { status: "ready", chunkCount: chunks.length, wordCount });
          toast({ title: "Ready", description: `${chunks.length} chunks indexed from ${file.name}` });
        } catch (e) {
          await updateFile(record.id, {
            status: "error",
            error: e instanceof Error ? e.message : "Processing failed",
          });
          toast({ title: "Failed", description: e instanceof Error ? e.message : "Processing failed", variant: "destructive" });
        }
      }
    } finally {
      setProcessing(false);
      refresh();
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDelete = async (id: string) => {
    await deleteFile(id);
    refresh();
    toast({ description: "File removed." });
  };

  const statusBadge = (f: UserFile) => {
    if (f.status === "ready") return <Badge variant="success">Indexed</Badge>;
    if (f.status === "error") return <Badge variant="destructive">Error</Badge>;
    if (f.status === "processing") return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing
      </span>
    );
    return <Badge variant="secondary">Uploaded</Badge>;
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const chunks = await allChunks();
      const res = searchChunks(query, chunks, 5);
      setResults(res);
      if (res.length === 0) toast({ description: "No matches found. Try different words." });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className={dragOver ? "border-primary" : ""}>
        <CardContent
          className="flex flex-col items-center justify-center gap-3 p-8 text-center"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <UploadCloud className="h-10 w-10 text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium">Drop your files here</p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, or textbook page images (PNG / JPG)</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={processing}>
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            {processing ? "Processing…" : "Choose files"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Uploaded documents</CardTitle>
            <CardDescription>Text is chunked and indexed on this device for retrieval.</CardDescription>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                No documents yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {["png", "jpg", "jpeg"].includes(f.fileType) ? (
                        <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{f.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(f.createdAt)} • {(f.fileSize / 1024).toFixed(1)} KB • {f.chunkCount} chunks
                          {f.wordCount ? ` • ${f.wordCount.toLocaleString()} words` : ""}
                        </p>
                        {f.error && <p className="text-xs text-destructive">{f.error}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(f)}
                      <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => onDelete(f.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search your documents</CardTitle>
            <CardDescription>Hybrid lexical + vector retrieval over indexed chunks (works offline).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="e.g. fractions and decimals" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} />
              <Button onClick={runSearch} disabled={searching || !query.trim()}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
              </Button>
            </div>
            {results !== null && (
              <ul className="space-y-2">
                {results.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
                {results.map((r, i) => (
                  <li key={i} className="rounded-lg border p-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{r.fileName || "Document"}</span>
                      <Badge variant="secondary">score {r.score}</Badge>
                    </div>
                    <p className="line-clamp-3 text-sm">{r.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}