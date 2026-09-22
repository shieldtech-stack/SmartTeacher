import { NextRequest, NextResponse } from "next/server";
import { callLlm } from "@/lib/server/provider";
import { getEffectiveSettings } from "@/lib/server/generation";
import type { ProviderSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { settings?: ProviderSettings };
    const settings = getEffectiveSettings(body?.settings || ({} as ProviderSettings));
    if (settings.llmProvider === "offline") {
      return NextResponse.json({
        ok: false,
        error: "No AI provider is configured. Add an API key in Settings, or set one of GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY / OPENROUTER_API_KEY on the server.",
      });
    }

    const out = await callLlm({
      provider: settings.llmProvider,
      openaiKey: settings.openaiKey,
      openaiModel: settings.openaiModel,
      anthropicKey: settings.anthropicKey,
      anthropicModel: settings.anthropicModel,
      googleKey: settings.googleKey,
      googleModel: settings.googleModel,
      openrouterKey: settings.openrouterKey,
      openrouterModel: settings.openrouterModel,
      system: "You are a connectivity test.",
      user: "Reply with exactly the word OK.",
      temperature: 0,
      maxTokens: 16,
    });

    return NextResponse.json({ ok: true, model: settings.llmProvider === "openai" ? settings.openaiModel : settings.llmProvider === "google" ? settings.googleModel : settings.llmProvider === "anthropic" ? settings.anthropicModel : settings.openrouterModel, sample: out.slice(0, 120) });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}