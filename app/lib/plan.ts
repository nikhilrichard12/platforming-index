import { ReasonKind } from "./rules";
import { SAME } from "./similarity";

/**
 * The concept check. Before a part number exists, a product is still a list of
 * things it needs, and most of those things the company already buys. This
 * answers that question against the same parts data and the same rules the
 * part check uses.
 */

export type NeedStatus =
  | "in core"
  | "shared"
  | "exists, unique"
  | "blocked by rule"
  | "new part needed";

export const NEED_STATUSES: NeedStatus[] = [
  "in core",
  "shared",
  "exists, unique",
  "blocked by rule",
  "new part needed",
];

/**
 * A need only counts as existing when the matcher is confident. The same
 * threshold lib/similarity.ts calls "same", so a plan never claims coverage
 * the part check would send to a person.
 */
export const PLAN_FLOOR = SAME;

export interface PlannedNeed {
  need: string;
  status: NeedStatus;
  confidence: number;
  part?: string;
  partNumber?: string;
  price?: number;
  supplier?: string;
  origin?: string;
  po?: string;
  products?: number;
  partNumberCount?: number;
  rule?: { id: string; text: string; kind: ReasonKind };
  /** Same part from a supplier whose origin already satisfies the rule. */
  complianceSource?: {
    supplier: string;
    origin: string;
    partNumber: string;
    price: number;
    po: string;
  };
}

export interface PlanSummary {
  total: number;
  byStatus: Record<NeedStatus, number>;
  covered: number;
  coveredPercent: number;
  projectedNewPartNumbers: number;
}

export interface PlanResult {
  product: { name: string; description: string };
  needs: PlannedNeed[];
  summary: PlanSummary;
  note: string;
  /** Fragments the reader looked at, kept so an empty result can show them. */
  considered?: string[];
}

/** A list marker, not a rating: "6 pole" keeps its 6, "6. pole" loses it. */
const BULLET = /^\s*(?:[-–—*•]+|\d{1,2}[.)])\s*/;

/**
 * A concept arrives as prose. One need per line, or per comma when the whole
 * thing is written on one line.
 */
export function splitNeeds(description: string): string[] {
  const lines = description
    .split(/\r?\n/)
    .map((l) => l.replace(BULLET, "").trim())
    .filter(Boolean);

  const parts = lines.length > 1 ? lines : (lines[0] ?? "").split(/[,;]/);

  return parts
    .map((p) => p.replace(BULLET, "").trim())
    .filter((p) => p.length > 1);
}

export function statusFor(products: number): NeedStatus {
  if (products >= 5) return "in core";
  if (products >= 2) return "shared";
  return "exists, unique";
}

export function summarize(needs: PlannedNeed[]): PlanSummary {
  const byStatus = Object.fromEntries(
    NEED_STATUSES.map((s) => [s, 0])
  ) as Record<NeedStatus, number>;
  needs.forEach((n) => (byStatus[n.status] += 1));

  const covered =
    byStatus["in core"] + byStatus["shared"] + byStatus["exists, unique"];
  // A blocked need still ends in a new part number for that product.
  const projectedNewPartNumbers =
    byStatus["new part needed"] + byStatus["blocked by rule"];

  return {
    total: needs.length,
    byStatus,
    covered,
    coveredPercent: needs.length
      ? Math.round((covered / needs.length) * 100)
      : 0,
    projectedNewPartNumbers,
  };
}

/** The one line a person should read first. */
export function headline(s: PlanSummary): string {
  const core = s.byStatus["in core"];
  const fresh = s.projectedNewPartNumbers;
  return `${s.covered} of ${s.total} needs already exist. ${core} sit in the common core. ${fresh} need new parts.`;
}

/**
 * A fictional concept for the demo: the product Voltara does not build yet,
 * written the way an engineer would list what it needs rather than in part
 * names, so the matcher has real work to do.
 */
export const SAMPLE_CONCEPT = {
  name: "VBS-30 Outdoor Battery Cabinet",
  description: [
    "Cabinet enclosure, outdoor rated, 50 kWh class",
    "Battery module, LFP, 5 kWh",
    "Contactor, DC, 150 A",
    "Busbar, copper, 200 A",
    "IGBT module, half bridge, 1200 V 100 A",
    "DC link capacitor, electrolytic, 470 uF 450 V",
    "Gate driver board, isolated, 6 channel",
    "Control board with DSP",
    "Current sensor, hall effect, 100 A",
    "Temperature sensor, NTC 10k",
    "Cooling fan, axial, 120 mm 24 VDC",
    "Fan guard, wire, 120 mm",
    "Heatsink, extruded aluminum, 200 mm",
    "Terminal block, 6 pole, 30 A",
    "Bidirectional 30 kW power conversion module",
    "Liquid cooling cold plate",
    "Cellular 4G telemetry gateway",
    "Anti-theft door intrusion switch",
  ].join("\n"),
};

export const PLAN_NOTE =
  "A plan does not change the Platforming Index score. The score moves when an engineer records a decision on a real part.";

/* ---------- reading a page ---------- */

/** Clause markers that introduce a list of parts inside a sentence. */
const CLAUSE = /\b(?:such as|including|includes|comprising|consisting of|made up of|uses|with)\b/i;

/** Units that mark a fragment as a component rather than a sentence. */
const UNIT = /\b\d+(?:\.\d+)?\s?(?:mm|cm|m|in|v|vdc|vac|a|ma|w|kw|kva|kwh|wh|uf|nf|pf|mh|uh|k|ohm|hz|khz|awg|pole|ch|channel|phase|u|%)\b/i;

/** A rating written as one token: M4x10, 470uF, 120mm, 1200V. */
const RATING = /\b[a-z]*\d+(?:\.\d+)?[a-z]+\d*\b/i;

const NOISE =
  /^(?:the|a|an|and|or|but|then|also|next|this|that|these|those|it|we|they|you|i)\b/i;

/** A leading article adds nothing to a component name. */
const ARTICLE = /^(?:a|an|the|and|with|of|for)\s+/i;

const MARKER = /^\s*(?:[-–—*•]|\d{1,2}[.)])\s+/;

/** "You will also need a DC contactor" is a sentence about a contactor. */
const LEAD_VERB =
  /^.*?\b(?:need|needs|needed|require|requires|required|use|uses|using|add|adds|include|includes|including|specify|specifies|choose|chooses)\b\s+/i;

/** "forced air: a 120 mm axial fan" names the fan after the colon. */
const PREFIX_COLON = /^[^:]{0,48}:\s*/;

/** A bare rating is not a component: "6 channel", "30 A". */
const BARE_RATING = /^\d+(?:\.\d+)?\s*[a-z]{1,9}$/i;

/** One sentence, cut at the clause that introduces a list, then at commas. */
function itemsInSentence(sentence: string): string[] {
  const parts = sentence.split(CLAUSE);
  const tail = parts.length > 1 ? parts.slice(1).join(" ") : sentence;
  return tail.split(/,| and (?=[a-z0-9])/i);
}

/**
 * A page is prose, not a list. Cut it into fragments a matcher can score:
 * paragraphs first (hard wrapping rejoined), then bullets and numbering, then
 * sentences, then the clause inside a sentence that introduces components.
 */
export interface Fragment {
  text: string;
  /** Came from a bulleted or numbered line, so it was written on purpose. */
  listed: boolean;
}

export function splitFragments(text: string): Fragment[] {
  const out: Fragment[] = [];

  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const listed = lines.filter((l) => MARKER.test(l)).length;
    const isList = listed >= Math.max(1, lines.length - 1);

    // A list keeps its lines. Prose is rejoined, because a page wraps mid
    // sentence and a wrapped line is not a requirement.
    const units = isList ? lines : [lines.join(" ")];

    for (const unit of units) {
      const cleaned = unit.replace(MARKER, "").trim();
      // A bullet is already one need. Commas inside it are part of the name,
      // so only prose is cut further.
      const sentences = isList ? [cleaned] : cleaned.split(/(?<=[.!?])\s+|;/);
      for (const sentence of sentences) {
        for (const raw of isList ? [sentence] : itemsInSentence(sentence)) {
          const p = raw
            .trim()
            .replace(MARKER, "")
            .replace(PREFIX_COLON, "")
            .replace(LEAD_VERB, "")
            .trim()
            .replace(ARTICLE, "")
            .replace(/^[^a-z0-9]+/i, "")
            .replace(/[.;:,]+$/, "")
            .trim();
          if (p.length >= 3 && p.length <= 90 && !BARE_RATING.test(p)) {
            out.push({ text: p, listed: isList });
          }
        }
      }
    }
  }

  // Dedupe, keeping the order the page reads in.
  const seen = new Set<string>();
  return out.filter((p) => {
    const key = p.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * A bullet was written on purpose, so a short noun phrase counts even without
 * a rating. Prose has to earn its place: it matches a part, or it reads like
 * a component.
 */
export function keepFragment(fragment: Fragment, confidence: number): boolean {
  if (confidence >= PLAN_FLOOR) return true;
  if (looksLikeComponent(fragment.text)) return true;
  if (!fragment.listed) return false;
  const words = fragment.text.split(/\s+/);
  return words.length >= 2 && words.length <= 7 && !NOISE.test(fragment.text);
}

/**
 * Does this read as a component rather than a sentence? A noun with a rating
 * or a unit, and no sentence opener.
 */
export function looksLikeComponent(fragment: string): boolean {
  const f = fragment.trim();
  if (NOISE.test(f)) return false;
  const words = f.split(/\s+/);
  if (words.length < 2 || words.length > 9) return false;
  if (!/[a-z]{3}/i.test(f)) return false;
  return UNIT.test(f) || RATING.test(f);
}

/** Nothing useful survived, so ask rather than show an empty panel. */
export const ASK_FLOOR = 3;

/** How many needs one page may contribute. */
export const NEED_CAP = 30;
