import pdf from "pdf-parse";
import mammoth from "mammoth";

export interface ParsedDocument {
  text: string;
  /** true when the file is likely just scanned images with no machine-readable text */
  likelyScanned: boolean;
}

export async function parsePdf(buf: Buffer): Promise<ParsedDocument> {
  let data: { text?: string } | undefined;
  try {
    data = await pdf(buf);
  } catch (e) {
    // Some PDFs are malformed/synthetic; surface a clear error instead of a 500.
    throw new Error(
      "This PDF could not be read by the converter. It may be a scanned document or use an unsupported format."
    );
  }
  const text = (data?.text ?? "").trim();
  // A real text-based curriculum design yields many thousands of characters.
  return { text, likelyScanned: text.length < 50 };
}

export async function parseDocx(buf: Buffer): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer: buf });
  const text = (result.value ?? "").trim();
  return { text, likelyScanned: text.length < 50 };
}