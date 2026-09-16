import { NextRequest, NextResponse } from "next/server";
import { generateLessonNotes, type GenerationInput } from "@/lib/server/generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as GenerationInput;
    if (!input?.subtopics?.length) {
      return NextResponse.json({ error: "Select a subtopic first" }, { status: 400 });
    }
    const notes = await generateLessonNotes(input);
    return NextResponse.json(notes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Generation failed" }, { status: 500 });
  }
}