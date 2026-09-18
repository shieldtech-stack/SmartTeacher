import { NextRequest, NextResponse } from "next/server";
import { parsePdf, parseDocx } from "@/lib/server/parse";
import { extractCurriculum } from "@/lib/server/curriculum-extract";
import type { ProviderSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const settingsRaw = form.get("settings") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds the 15 MB limit" }, { status: 413 });
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      return NextResponse.json({ error: "Unsupported file type. Use a PDF or DOCX curriculum design." }, { status: 400 });
    }

    let settings: ProviderSettings | undefined;
    if (settingsRaw) {
      try {
        settings = JSON.parse(settingsRaw) as ProviderSettings;
      } catch {
        /* ignore malformed settings */
      }
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = ext === "pdf" ? await parsePdf(buf) : await parseDocx(buf);
    if (!parsed.text) {
      return NextResponse.json(
        {
          error: parsed.likelyScanned
            ? "No text could be extracted from this PDF — it appears to be a scan of the pages. Please upload a text-based PDF (one where you can select/copy the words), or type the strands in the Advanced: JSON mode."
            : "No text could be extracted from this file.",
        },
        { status: 422 }
      );
    }

    const result = await extractCurriculum(parsed.text, settings ?? ({} as ProviderSettings));
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Could not extract a curriculum from this file." },
        { status: 422, headers: result.source ? { "x-extraction-source": result.source } : {} }
      );
    }

    return NextResponse.json({
      curricula: result.curricula,
      stats: result.stats,
      source: result.source,
    });
  } catch (e) {
    console.error("Curriculum convert error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to convert file" },
      { status: 500 }
    );
  }
}