import { Part, PartRow, usd } from "./voltaraData";

/**
 * Country of origin, read from the data and never guessed from a supplier
 * name. Ostrava Thermal ships from the United States; Norwick Components does
 * not. A compliance rule is about where a part comes from, so the only
 * trustworthy answer is the origin field on the purchase row.
 */

export const ORIGIN_ADJECTIVE: Record<string, string> = {
  "United States": "US",
  Mexico: "Mexican",
  Germany: "German",
  "Czech Republic": "Czech",
  Taiwan: "Taiwanese",
  Vietnam: "Vietnamese",
};

/** Patterns a rule writer actually uses, in their own words. */
const NAMED: [RegExp, string][] = [
  [/\b(us|u\.s\.|usa|united states|domestic|american)[\s-]/i, "United States"],
  [/\b(us|u\.s\.|usa|united states|domestic|american)\b/i, "United States"],
  [/\bmexic(o|an)\b/i, "Mexico"],
  [/\bgerman(y)?\b/i, "Germany"],
  [/\bczech\b/i, "Czech Republic"],
  [/\btaiwan(ese)?\b/i, "Taiwan"],
  [/\bvietnam(ese)?\b/i, "Vietnam"],
];

/** The country a rule asks for, or null when the rule does not name one. */
export function originFromText(text: string): string | null {
  for (const [pattern, country] of NAMED) {
    if (pattern.test(text)) return country;
  }
  return null;
}

export interface OriginSource {
  supplier: string;
  origin: string;
  partNumber: string;
  price: number;
  po: string;
}

/** The cheapest row of this same part that already ships from that country. */
export function sourceFrom(part: Part, country: string): OriginSource | null {
  const rows = part.rows.filter((r: PartRow) => r.origin === country);
  if (rows.length === 0) return null;
  const best = rows.reduce((lo, r) => (r.price < lo.price ? r : lo), rows[0]);
  return {
    supplier: best.supplier,
    origin: best.origin,
    partNumber: best.pn,
    price: best.price,
    po: best.po,
  };
}

/** The one sentence every surface prints for a compliant source. */
export function originLine(s: OriginSource): string {
  const adjective = ORIGIN_ADJECTIVE[s.origin] ?? s.origin;
  return `Same part, ${adjective}-origin source: ${s.supplier}, ${usd(s.price)}`;
}
