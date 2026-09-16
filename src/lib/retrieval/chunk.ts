export interface ChunkResult {
  index: number;
  content: string;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "at", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "it", "its", "this", "that", "these", "those", "i", "you", "he", "she", "we",
  "they", "them", "their", "there", "then", "than", "so", "such", "which",
  "what", "when", "where", "how", "why", "not", "no", "all", "any", "each",
  "can", "will", "would", "should", "could", "do", "does", "did", "have", "has",
  "had", "about", "into", "up", "out", "over", "also", "more", "most", "some",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

export function wordTokenCount(words: number): number {
  return Math.round(words * 1.3);
}

/**
 * Splits a long document into overlapping 500-token chunk segments.
 * Approximates tokens using words (1 token ~ 4 chars).
 */
export function chunkText(text: string, options?: { maxTokens?: number; overlapTokens?: number }): ChunkResult[] {
  const maxTokens = options?.maxTokens ?? 500;
  const overlapTokens = options?.overlapTokens ?? 40;
  const maxWords = Math.floor(maxTokens / 1.3);
  const overlapWords = Math.floor(overlapTokens / 1.3);

  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  const chunks: ChunkResult[] = [];
  let currentWords: string[] = [];
  let currentStart = 0;

  const flush = () => {
    if (currentWords.length === 0) return;
    chunks.push({ index: chunks.length, content: currentWords.join(" ") });
    // keep overlap words from the end
    currentWords = currentWords.slice(-overlapWords);
    currentStart = Math.max(0, currentWords.length);
  };

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < words.length) {
      const room = maxWords - currentWords.length;
      if (room <= 0) {
        flush();
        continue;
      }
      const take = Math.min(room, words.length - i);
      currentWords.push(...words.slice(i, i + take));
      i += take;
      if (currentWords.length >= maxWords) flush();
    }
  }
  flush();

  return chunks.filter((c) => c.content.trim().length > 0);
}