import { EMPTY_PROFILE, UserProfile } from "./types";

const KEY = "platforming_profile";

export function saveProfile(p: UserProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    return JSON.parse(raw) as UserProfile;
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
