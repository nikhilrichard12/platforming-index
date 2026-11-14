import { EMPTY_PROFILE, UserProfile } from "./types";

/**
 * The side panel. It rides along with whatever page the engineer is reading,
 * so everything here is about one question: how much of what this page
 * describes does the company already buy?
 */

export interface PageContext {
  url: string;
  title: string;
  text: string;
  selection: string;
}

export const EMPTY_CONTEXT: PageContext = { url: "", title: "", text: "", selection: "" };

/**
 * One test identity for the panel, so the demo needs no survey. Swap this for
 * the saved profile when the panel is wired to a real sign in.
 */
export const TEST_PROFILE: UserProfile & { company: string } = {
  ...EMPTY_PROFILE,
  role: "Engineering / R&D",
  decisionLevel: "I decide",
  company: "Voltara Power Systems",
};

/** Messages the extension and the panel exchange. */
export const PANEL_READY = "platforming-index:panel-ready";
export const PANEL_CONTEXT = "platforming-index:context";

/** One stored result per page, so reopening the panel is instant. */
const KEY = "platforming_panel";

export interface StoredPlan<T> {
  at: string;
  title: string;
  product: string;
  plan: T;
}

export function readStored<T>(url: string): StoredPlan<T> | null {
  if (!url) return null;
  try {
    const raw = localStorage.getItem(`${KEY}:${url}`);
    return raw ? (JSON.parse(raw) as StoredPlan<T>) : null;
  } catch {
    return null;
  }
}

export function writeStored<T>(url: string, value: StoredPlan<T>): void {
  if (!url) return;
  try {
    localStorage.setItem(`${KEY}:${url}`, JSON.stringify(value));
  } catch {
    /* a full or blocked store only costs us the shortcut */
  }
}

const PRODUCTISH =
  /\b(cabinet|enclosure|inverter|ups|storage|battery|module|rack|system|unit|drive|charger|pack|controller|platform|appliance|assembly|product|spec|requirements?)\b/i;

/**
 * A page title is only sometimes a product name. Use it when it reads like
 * one, and say nothing rather than invent a name when it does not.
 */
export function productFromTitle(title: string, firstHeading = ""): string {
  const candidates = [firstHeading, title].map((t) => (t ?? "").trim()).filter(Boolean);
  for (const raw of candidates) {
    const cleaned = raw
      .split(/[|·—–]|\s-\s/)[0]
      // "Market sizing: commercial battery storage" names the thing after
      // the colon, not the piece of work in front of it.
      .replace(/^[^:]{0,40}:\s*/, "")
      .replace(/\b(product )?requirements?\b|\bspecification\b|\bspec\b/gi, "")
      .trim();
    if (cleaned.length >= 4 && cleaned.length <= 60 && PRODUCTISH.test(raw)) {
      return cleaned;
    }
  }
  return "";
}

/** The three questions worth asking about the page in front of you. */
export function panelQuestions(product: string): string[] {
  const name = product || "this page";
  return [
    `How much of ${name} already exists?`,
    "Which needs force a new part number?",
    "What would reusing these parts save?",
  ];
}
