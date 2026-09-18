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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${opts.googleModel}:generateContent?key=${opts.googleKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error(`Google API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: Array<{ text?: string }> } }[] };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
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