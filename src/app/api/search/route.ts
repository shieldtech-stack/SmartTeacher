import { NextRequest, NextResponse } from "next/server";
import { webSearch } from "@/lib/server/web-search";
import type { ProviderSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { query?: string; settings?: ProviderSettings };
    const query = (body.query || "").trim();
    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
    const settings = body.settings;
    if (!settings || settings.webSearchProvider === "none") {
      return NextResponse.json({ snippets: [] });
    }
    const snippets = await webSearch({
      provider: settings.webSearchProvider,
      tavilyKey: settings.tavilyKey,
      braveKey: settings.braveKey,
      query,
      maxResults: 4,
    });
    return NextResponse.json({ snippets });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Search failed" }, { status: 500 });
  }
}