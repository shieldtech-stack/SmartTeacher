import { NextRequest, NextResponse } from "next/server";
import { parsePdf, parseDocx } from "@/lib/server/parse";
import { chunkText } from "@/lib/retrieval/chunk";
import { wordCount } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds the 15 MB limit" }, { status: 413 });
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      return NextResponse.json({ error: "Unsupported file type. Use PDF or DOCX." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const text = ext === "pdf" ? await parsePdf(buf) : await parseDocx(buf);

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "No text could be extracted from this file." }, { status: 422 });
    }

    const chunks = chunkText(text);
    return NextResponse.json({ wordCount: wordCount(text), chunks });
  } catch (e) {
    console.error("Parse error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to parse file" },
      { status: 500 }
    );
  }
}