import type { ProviderSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const SETTINGS_KEY = "st.settings";

export function loadSettings(): ProviderSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
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