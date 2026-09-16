import { NextRequest, NextResponse } from "next/server";
import { chunkText } from "@/lib/retrieval/chunk";
import { wordCount } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { text?: string };
    const text = (body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }
    const chunks = chunkText(text);
    return NextResponse.json({ wordCount: wordCount(text), chunks });
  } catch (e) {
    console.error("Ingest error", e);
    return NextResponse.json({ error: "Failed to ingest text" }, { status: 500 });
  }
}