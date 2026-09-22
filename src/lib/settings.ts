import type { ProviderSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const SETTINGS_KEY = "st.settings";

const DEPRECATED_MODEL_FIXES: Record<string, string> = {
  "gemini-1.5-flash": "gemini-3.1-flash-lite",
  "gemini-1.5-pro": "gemini-3.1-flash-lite",
  "gemini-2.5-flash": "gemini-3.1-flash-lite",
  "gemini-2.5-pro": "gemini-3.1-flash-lite",
  "gemini-flash-1.5": "gemini-3.1-flash-lite",
  "google/gemini-flash-1.5": "google/gemini-3.1-flash-lite",
  "google/gemini-1.5-flash": "google/gemini-3.1-flash-lite",
  "google/gemini-2.5-flash": "google/gemini-3.1-flash-lite",
  "claude-3-5-sonnet-20241022": "claude-3-7-sonnet-latest",
  "claude-3-haiku-20240307": "claude-3-5-haiku-latest",
  "claude-3-sonnet-20240229": "claude-3-7-sonnet-latest",
};

function migrateModels(s: Partial<ProviderSettings>): Partial<ProviderSettings> {
  const out = { ...s };
  for (const key of ["openaiModel", "anthropicModel", "googleModel", "openrouterModel"] as const) {
    const value = out[key];
    if (typeof value === "string" && DEPRECATED_MODEL_FIXES[value]) {
      out[key] = DEPRECATED_MODEL_FIXES[value];
    }
  }
  return out;
}

export function loadSettings(): ProviderSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...migrateModels(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: ProviderSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

const DATA_MODE_KEY = "st.dataMode";

export type DataMode = "local" | "supabase";

export function getDataMode(): DataMode {
  if (typeof window === "undefined") return "local";
  return (localStorage.getItem(DATA_MODE_KEY) as DataMode) || "local";
}

export function setDataMode(mode: DataMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DATA_MODE_KEY, mode);
}