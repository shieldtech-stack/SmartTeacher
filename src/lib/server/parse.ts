import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function parsePdf(buf: Buffer): Promise<string> {
  const data = await pdfParse(buf);
  return (data && data.text) || "";
}

export async function parseDocx(buf: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value || "";
}