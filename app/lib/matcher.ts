import { Part, PartRow, VoltaraData } from "./voltaraData";
// similarity.ts imports tokenize and headNoun from here. The cycle is safe
// because neither module calls the other while it is still loading.
import { similarity } from "./similarity";

/**
 * Text matcher for the new part check. Deliberately small and explainable: a
 * requisition line is normalized, then scored against every part name by
 * shared tokens, with tokens carrying digits weighted double because a rating
 * ("120mm", "470uf") separates two parts that otherwise read alike.
 *
 * This does not replace the engine's matcher. It answers one question at the
 * moment someone types a description, and a match is a suggestion until
 * engineering approves it.
 */

const ABBREVIATIONS: Record<string, string> = {
  scr: "screw",
  cap: "capacitor",
  res: "resistor",
  conn: "connector",
  brd: "board",
  ctrl: "control",
  hs: "heatsink",
  xfmr: "transformer",
  ind: "inductor",
  term: "terminal",
  blk: "block",
  sens: "sensor",
  temp: "temperature",
  elec: "electrolytic",
  pwr: "power",
  mach: "machine",
  assy: "assembly",
};

/** Units that bind to the number in front of them: "120 mm" is one token. */
const UNITS = new Set([
  "mm", "cm", "m", "in", "v", "vdc", "vac", "a", "ma", "w", "kw", "kva", "kwh",
  "uf", "nf", "pf", "mh", "uh", "k", "ohm", "ohms", "hz", "khz", "awg", "pole",
  "ch", "channel",
]);

const STOP = new Set(["the", "a", "an", "of", "for", "and", "with", "type", "new"]);

/** A bare volt reading is written both ways in this data; settle on vdc. */
function settleUnit(token: string): string {
  return token.replace(/^(\d+)v$/, "$1vdc");
}

export function tokenize(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[_,()[\]{}/\\.;:"'+]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  // "M4 x 10" is one part rating, not three tokens.
  const joinedX: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "x" && joinedX.length > 0 && /\d/.test(raw[i + 1] ?? "")) {
      joinedX[joinedX.length - 1] += "x" + raw[++i];
    } else {
      joinedX.push(raw[i]);
    }
  }

  // "120 mm" and "24 vdc" bind the unit to the number in front of it.
  const joinedUnits: string[] = [];
  for (const token of joinedX) {
    const prev = joinedUnits[joinedUnits.length - 1];
    if (UNITS.has(token) && prev && /\d$/.test(prev)) {
      joinedUnits[joinedUnits.length - 1] = prev + token;
    } else {
      joinedUnits.push(token);
    }
  }

  return joinedUnits
    .map((t) => ABBREVIATIONS[t] ?? t)
    .map(settleUnit)
    .filter((t) => t.length > 0 && !STOP.has(t));
}

/**
 * Words that trail a rating rather than naming the thing: "Isolated Gate
 * Driver Board 6 Channel" is a board, not a channel.
 */
const TRAILING = new Set(["channel", "pole", "phase", "rev", "type", "series", "pack", "kit"]);

/**
 * The noun at the end of a part name, once ratings and trailing descriptors
 * are stripped. A fan guard is a guard, not a fan, so only parts sharing a
 * head noun are offered as substitutes for one another.
 */
export function headNoun(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[_,()/\\.-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/\d/.test(w));
  while (words.length > 1) {
    const last = words[words.length - 1];
    if (TRAILING.has(last) || last.length <= 1) words.pop();
    else break;
  }
  return words[words.length - 1] ?? "";
}

export interface PartMatch {
  name: string;
  partNumberCount: number;
  products: number;
  bestRow: {
    pn: string;
    products: string[];
    supplier: string;
    origin: string;
    price: number;
    po: string;
  };
  minPrice: number;
  maxPrice: number;
  yearlySavingVsHighest: number;
  confidence: number;
  matchedTokens: string[];
  rows: PartRow[];
}

/** Lowest average price Voltara already pays for this part. */
function cheapestRow(part: Part): PartRow {
  return part.rows.reduce((lo, r) => (r.price < lo.price ? r : lo), part.rows[0]);
}

/** Every part scoring above the floor, best first. */
export function matchCandidates(
  data: VoltaraData,
  description: string,
  unitsPerYear: number,
  limit = 3
): PartMatch[] {
  const query = tokenize(description);
  if (query.length === 0) return [];

  const scored: { part: Part; score: number; matched: string[] }[] = [];

  // One definition of "same part" for the whole product: the check, the plan
  // and the grouping all score through lib/similarity.ts.
  for (const part of data.parts) {
    const s = similarity(description, part.name);
    if (s.score <= 0) continue;
    const partSet = new Set(tokenize(part.name));
    const matched = [...new Set(query.filter((t) => partSet.has(t)))];
    scored.push({ part, score: s.score, matched });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((hit) => toMatch(hit.part, hit.score, hit.matched, unitsPerYear));
}

export function matchPart(
  data: VoltaraData,
  description: string,
  unitsPerYear: number
): PartMatch | null {
  return matchCandidates(data, description, unitsPerYear, 1)[0] ?? null;
}

function toMatch(
  part: Part,
  score: number,
  matched: string[],
  unitsPerYear: number
): PartMatch {
  const row = cheapestRow(part);
  return {
    name: part.name,
    partNumberCount: part.rows.length,
    products: part.products,
    bestRow: {
      pn: row.pn,
      products: row.products,
      supplier: row.supplier,
      origin: row.origin,
      price: row.price,
      po: row.po,
    },
    minPrice: part.min,
    maxPrice: part.max,
    yearlySavingVsHighest: Math.round((part.max - part.min) * unitsPerYear),
    confidence: Math.round(Math.min(1, score) * 100) / 100,
    matchedTokens: matched,
    rows: part.rows,
  };
}
