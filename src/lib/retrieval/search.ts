import { tokenize } from "./chunk";
import type { DocumentChunk, RetrievalChunk } from "@/lib/types";

interface ScoredChunk {
  index: number;
  score: number;
}

function hashEmbedding(token: string, dim = 256): number {
  let h1 = 0xdeadbeef ^ token.length;
  let h2 = 0x41c6ce57 ^ token.length;
  for (let i = 0; i < token.length; i++) {
    const ch = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  return h1 % dim;
}

export function localEmbedding(text: string): number[] {
  const vec = new Array(256).fill(0);
  const tokens = tokenize(text);
  for (const t of tokens) {
    if (vec[hashEmbedding(t)] === 0) vec[hashEmbedding(t)] = 1;
  }
  return vec;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function lexicalScore(queryTokens: string[], chunkTokens: string[]): number {
  const idf: Record<string, number> = {};
  const df: Record<string, number> = {};
  for (const t of queryTokens) if (!(t in df)) df[t] = 1;
  for (const t of chunkTokens) {
    if (t in df) df[t] += 1;
  }
  const total = Math.max(1, chunkTokens.length);
  for (const t of queryTokens) {
    idf[t] = Math.log((total + 1) / (1 + df[t])) + 1;
  }
  let score = 0;
  const chunkSet = new Set(chunkTokens);
  for (const t of queryTokens) {
    const count = chunkTokens.filter((c) => c === t).length;
    if (count > 0) score += (1 + Math.log(count)) * idf[t];
  }
  // bigram bonus for exact phrase matches
  for (let i = 0; i < queryTokens.length - 1; i++) {
    const phrase = queryTokens[i] + " " + queryTokens[i + 1];
    for (let j = 0; j < chunkTokens.length - 1; j++) {
      if (chunkTokens[j] + " " + chunkTokens[j + 1] === phrase) {
        score += 2;
        break;
      }
    }
  }
  if (queryTokens.length > 0 && chunkSet.size > 0) {
    score *= Math.min(1.5, 1 + Math.log(1 + chunkSet.size));
  }
  return score;
}

/**
 * Hybrid local retrieval: combines lexical TF-IDF scoring with vector
 * embeddings when available.
 */
export function searchChunks(
  query: string,
  chunks: DocumentChunk[],
  topK = 5
): RetrievalChunk[] {
  if (chunks.length === 0) return [];
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const queryEmbedding =
    chunks[0]?.embedding && chunks[0].embedding.length > 0 ? localEmbedding(query) : null;

  const scored: ScoredChunk[] = chunks.map((c, index) => {
    const lex = lexicalScore(queryTokens, tokenize(c.content));
    const vec = c.embedding && c.embedding.length > 0 && queryEmbedding ? cosine(queryEmbedding, c.embedding) : 0;
    const score = vec > 0 ? lex * 0.6 + vec * 0.4 : lex;
    return { index, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => ({
      fileId: chunks[s.index].fileId,
      content: chunks[s.index].content,
      score: Math.round(s.score * 100) / 100,
    }));
}