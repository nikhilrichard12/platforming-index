import { NeedTone, StageItem } from "./models/planStage";
import type { StageSubject } from "./models/parts";
import { PlannedNeed } from "./plan";
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
  /**
   * What the page said when this was checked. A chat keeps one address while
   * its answers change, so the address alone cannot say whether a stored result
   * still describes what is on screen.
   */
  textKey?: string;
}

/** A short fingerprint of the text the panel read, to tell whether a page has changed. */
export function textKey(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${text.length}:${(h >>> 0).toString(36)}`;
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

/* ---------- what the stage draws for one page ---------- */

/**
 * Every need this page raised, as something to draw: the part it landed on,
 * tinted by what it landed on. Nothing else goes on the stage.
 */
export function stageItemsFor(
  needs: PlannedNeed[],
  parts: { id: string; name: string; cat: string }[]
): StageItem[] {
  return needs.map((n) => ({
    key: n.need,
    tone:
      n.status === "blocked by rule"
        ? "blocked"
        : (n.landing as NeedTone),
    part: n.part ? parts.find((p) => p.name === n.part) : undefined,
  }));
}

/** Counts per tone, for the legend under the stage. */
export function stageCounts(items: StageItem[]): Record<NeedTone, number> {
  const out: Record<NeedTone, number> = {
    interface: 0,
    part: 0,
    new: 0,
    blocked: 0,
  };
  items.forEach((i) => (out[i.tone] += 1));
  return out;
}

/** A new set of needs is a new model, so the stage knows when to redraw. */
export function planSubject(items: StageItem[]): StageSubject | null {
  if (items.length === 0) return null;
  return {
    key: `plan:${items.map((i) => `${i.tone}:${i.key}`).join("|")}`,
    label: `${items.length} ${items.length === 1 ? "need" : "needs"} on this page`,
    twin: false,
    caption: "Only what this page asks for. Illustrative shapes, not CAD.",
    plan: items,
  };
}

/* ---------- which product the page is about ---------- */

export interface ResolvedProduct {
  id: string;
  name: string;
  /** True when the page named it; false when it is the closest match. */
  named: boolean;
}

/** "VRK-3000", "vrk3000" and "RackLine 3 kVA" all name the same product. */
function mentions(text: string, product: { id: string; name: string }): boolean {
  const loose = product.id.replace(/-/g, "-?");
  if (new RegExp(`\\b${loose}\\b`, "i").test(text)) return true;
  // The family and its rating: "RackLine 3 kVA", "StorLine 50 kWh".
  const words = product.name.split(/\s+/).slice(0, 3).join(" ");
  return words.length > 6 && text.toLowerCase().includes(words.toLowerCase());
}

/**
 * The product this page is about. Named on the page if it says so; otherwise
 * the existing product that shares the most interfaces with what the page
 * needs, which the panel labels as the closest one rather than pretending.
 */
export function resolveProduct(
  text: string,
  products: { id: string; name: string }[],
  matchedInterfaces: { products: string[] }[],
  partsByProduct?: (id: string) => number
): ResolvedProduct | null {
  if (products.length === 0) return null;

  for (const product of products) {
    if (mentions(text, product)) {
      return { id: product.id, name: product.name, named: true };
    }
  }

  const score = (id: string) =>
    matchedInterfaces.filter((i) => i.products.includes(id)).length;
  const best = [...products].sort(
    (a, b) =>
      score(b.id) - score(a.id) ||
      (partsByProduct?.(b.id) ?? 0) - (partsByProduct?.(a.id) ?? 0) ||
      a.id.localeCompare(b.id)
  )[0];
  return { id: best.id, name: best.name, named: false };
}

/** Every part a product carries, as the stage draws them. */
export function partsOfProduct(
  parts: { id: string; name: string; rows: { products: string[] }[] }[],
  productId: string
): { id: string; name: string }[] {
  return parts
    .filter((p) => p.rows.some((r) => r.products.includes(productId)))
    .map((p) => ({ id: p.id, name: p.name }));
}

/**
 * The line beside a lit cluster. It says what kind of boundary this is and
 * how long the company has been building to it.
 */
export function stageLabelFor(iface: {
  subsystem: string;
  products: string[];
  since: number | null;
}): string {
  const n = iface.products.length;
  return `${iface.subsystem} interface. On ${n} ${n === 1 ? "product" : "products"}${
    iface.since ? ` since ${iface.since}` : ""
  }.`;
}

/** What an interface gives a product that designs to it, in one line. */
export function inheritLine(inherits: string[]): string {
  return `You inherit: ${inherits.map((x) => x.toLowerCase()).join(", ")}.`;
}
