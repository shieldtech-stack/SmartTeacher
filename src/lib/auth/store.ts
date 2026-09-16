import { getDeviceId } from "@/lib/db/supabase-client";

let currentAuthUserId: string | null = null;

export function setAuthUserId(id: string | null): void {
  currentAuthUserId = id || null;
}

export function getAuthUserId(): string | null {
  return currentAuthUserId;
}

export function isSignedIn(): boolean {
  return currentAuthUserId !== null;
}

export function getCloudUserId(): string {
  return currentAuthUserId || getDeviceId();
}