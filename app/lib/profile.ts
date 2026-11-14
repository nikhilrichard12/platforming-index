import { EMPTY_PROFILE, UserProfile } from "./types";
import { BallparkAnswers, EMPTY_BALLPARK } from "./ballpark";

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

/* ---------- the ballpark answers ---------- */

const BALLPARK_KEY = "platforming_ballpark";

export function saveBallpark(a: BallparkAnswers): void {
  try {
    localStorage.setItem(BALLPARK_KEY, JSON.stringify(a));
  } catch {}
}

export function loadBallpark(): BallparkAnswers {
  try {
    const raw = localStorage.getItem(BALLPARK_KEY);
    if (!raw) return { ...EMPTY_BALLPARK };
    return { ...EMPTY_BALLPARK, ...(JSON.parse(raw) as BallparkAnswers) };
  } catch {
    return { ...EMPTY_BALLPARK };
  }
}

export function clearBallpark(): void {
  try {
    localStorage.removeItem(BALLPARK_KEY);
  } catch {}
}
