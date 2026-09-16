import { NextRequest, NextResponse } from "next/server";
import { generateScheme, type GenerationInput } from "@/lib/server/generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as GenerationInput;
    if (!input?.subtopics?.length) {
      return NextResponse.json({ error: "Select at least one subtopic" }, { status: 400 });
    }
    const scheme = await generateScheme(input);
    return NextResponse.json(scheme);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Generation failed" }, { status: 500 });
  }
}