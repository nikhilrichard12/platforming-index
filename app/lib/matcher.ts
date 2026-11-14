import { Part, PartRow, VoltaraData } from "./voltaraData";

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

/** A rating carries more signal than a common noun. */
function weight(token: string): number {
  return /\d/.test(token) ? 2 : 1;
}

function sumWeight(tokens: Iterable<string>): number {
  let total = 0;
  for (const t of tokens) total += weight(t);
  return total;
}

export interface PartMatch {
  name: string;
  partNumberCount: number;
  products: number;
  bestRow: { pn: string; products: string[]; supplier: string; price: number; po: string };
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

export function matchPart(
  data: VoltaraData,
  description: string,
  unitsPerYear: number
): PartMatch | null {
  const query = tokenize(description);
  if (query.length === 0) return null;
  const queryWeight = sumWeight(query);

  let best: { part: Part; score: number; matched: string[] } | null = null;

  for (const part of data.parts) {
    const partTokens = tokenize(part.name);
    const partSet = new Set(partTokens);
    const matched = [...new Set(query.filter((t) => partSet.has(t)))];
    if (matched.length < 2) continue;

    const matchedWeight = sumWeight(matched);
    const partCoverage = matchedWeight / sumWeight(partSet);
    const queryCoverage = matchedWeight / queryWeight;
    const score = 0.65 * partCoverage + 0.35 * queryCoverage;

    if (!best || score > best.score) best = { part, score, matched };
  }

  if (!best) return null;

  const { part } = best;
  const row = cheapestRow(part);
  return {
    name: part.name,
    partNumberCount: part.rows.length,
    products: part.products,
    bestRow: {
      pn: row.pn,
      products: row.products,
      supplier: row.supplier,
      price: row.price,
      po: row.po,
    },
    minPrice: part.min,
    maxPrice: part.max,
    yearlySavingVsHighest: Math.round((part.max - part.min) * unitsPerYear),
    confidence: Math.round(Math.min(1, best.score) * 100) / 100,
    matchedTokens: best.matched,
    rows: part.rows,
  };
}
