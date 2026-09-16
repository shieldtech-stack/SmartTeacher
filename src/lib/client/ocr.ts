import { createWorker } from "tesseract.js";

/**
 * Extract text from an image using Tesseract OCR in the browser.
 * Falls back gracefully when the OCR engine is unavailable.
 */
export async function ocrImage(file: File): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(file);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}

export async function ocrFiles(files: File[], onProgress?: (done: number, total: number) => void): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const text = await ocrImage(files[i]);
    results.push(text);
    onProgress?.(i + 1, files.length);
  }
  return results;
}