import { DocumentUploader } from "@/components/documents/document-uploader";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload textbooks, syllabi and notes. Text is extracted, chunked and indexed on this device for retrieval.
        </p>
      </div>
      <DocumentUploader />
    </div>
  );
}