import type { WebSnippet } from "@/lib/types";

export interface WebSearchOptions {
  provider: "tavily" | "brave" | "none";
  tavilyKey: string;
  braveKey: string;
  query: string;
  maxResults?: number;
}

export async function webSearch(opts: WebSearchOptions): Promise<WebSnippet[]> {
  const maxResults = opts.maxResults ?? 4;
  if (opts.provider === "none" || !opts.query.trim()) return [];

  if (opts.provider === "tavily") {
    if (!opts.tavilyKey) return [];
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: opts.tavilyKey,
        query: opts.query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: false,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: { title?: string; url?: string; content?: string }[];
    };
    return (data.results || []).slice(0, maxResults).map((r) => ({
      title: r.title || "",
      url: r.url || "",
      snippet: r.content || "",
    }));
  }

  // brave
  if (!opts.braveKey) return [];
  const params = new URLSearchParams({ q: opts.query, count: String(maxResults) });
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { "X-Subscription-Token": opts.braveKey },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    web?: { results?: { title?: string; url?: string; description?: string }[] };
  };
  return (data.web?.results || []).slice(0, maxResults).map((r) => ({
    title: r.title || "",
    url: r.url || "",
    snippet: r.description || "",
  }));
}

export function formatWebSnippets(snippets: WebSnippet[]): string {
  if (snippets.length === 0) return "No web search results.";
  return snippets
    .map((s, i) => `[Web ${i + 1}] ${s.title ? s.title + ": " : ""}${s.snippet}${s.url ? ` (${s.url})` : ""}`)
    .join("\n\n");
}