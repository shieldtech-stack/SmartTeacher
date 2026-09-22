export interface LlmCallOptions {
  provider: "openai" | "anthropic" | "google" | "openrouter";
  openaiKey?: string;
  openaiModel?: string;
  anthropicKey?: string;
  anthropicModel?: string;
  googleKey?: string;
  googleModel?: string;
  openrouterKey?: string;
  openrouterModel?: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  expectJson?: boolean;
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export function parseJsonLoose<T>(text: string): T | null {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // try to extract the first {...} or [...] slice
    const start = cleaned.search(/[\[{]/);
    const end = cleaned.lastIndexOf(start === 0 && cleaned[0] === "[" ? "]" : "}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Fallback chain for Google Gemini: older models get restricted or retired over
// time, so if the configured model is unavailable we retry with current options.
const GOOGLE_MODEL_FALLBACKS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
];

async function googleGenerateContent(
  model: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<{ ok: true; text: string } | { ok: false; retry: boolean; message: string }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    // 404 = model not found/retired; 429 = per-model quota — both worth retrying with another model.
    const retry = res.status === 404 || res.status === 429;
    return { ok: false, retry, message: `Google API error ${res.status}: ${text}` };
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: Array<{ text?: string }> } }[] };
  return { ok: true, text: data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "" };
}

export async function callLlm(opts: LlmCallOptions): Promise<string> {
  if (opts.provider === "anthropic") {
    if (!opts.anthropicKey) throw new Error("Anthropic API key is not configured");
    const body: Record<string, unknown> = {
      model: opts.anthropicModel,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 4000,
    };
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": opts.anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return data.content?.map((c) => c.text || "").join("") || "";
  }

  if (opts.provider === "google") {
    if (!opts.googleKey) throw new Error("Google API key is not configured");
    const body = {
      contents: [
        { role: "user", parts: [{ text: `${opts.system}\n\n${opts.user}` }] },
      ],
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxTokens ?? 4000,
        responseMimeType: opts.expectJson ? "application/json" : "text/plain",
      },
    };
    const configured = opts.googleModel || GOOGLE_MODEL_FALLBACKS[0];
    const candidates = [configured, ...GOOGLE_MODEL_FALLBACKS.filter((m) => m !== configured)];
    let firstError: string | null = null;
    for (const model of candidates) {
      const out = await googleGenerateContent(model, opts.googleKey, body);
      if (out.ok) return out.text;
      // Auth errors (401/403) are not model problems — fail fast, don't waste calls.
      if (!out.retry) throw new Error(out.message);
      firstError ??= out.message;
    }
    throw new Error(firstError || "Google API error");
  }

  if (opts.provider === "openrouter") {
    if (!opts.openrouterKey) throw new Error("OpenRouter API key is not configured");
    const body: Record<string, unknown> = {
      model: opts.openrouterModel,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 4000,
    };
    if (opts.expectJson) body.response_format = { type: "json_object" };
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${opts.openrouterKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`OpenRouter API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content || "";
  }

  // openai
  if (!opts.openaiKey) throw new Error("OpenAI API key is not configured");
  const body: Record<string, unknown> = {
    model: opts.openaiModel,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4000,
  };
  if (opts.expectJson) body.response_format = { type: "json_object" };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${opts.openaiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content || "";
}