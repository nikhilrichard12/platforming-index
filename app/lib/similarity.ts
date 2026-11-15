import { headNoun, tokenizeWithSource } from "./matcher";

/**
 * How we know two part numbers are the same part.
 *
 * Two descriptions are compared on three things, in the order an engineer
 * checks them: is it the same kind of thing, do its ratings agree, and does
 * the rest of the wording line up. The weights are fixed and printed on
 * screen, and the thresholds are deliberately shy: anything under 0.85 goes
 * to a person. This file never reads the answer key. It is graded against it
 * in engine/evaluate_matcher.ts and nowhere else.
 */

/* ---------- parsing ---------- */

/** A number welded to its unit by the tokenizer: 120mm, 470uf, 24vdc, 6channel. */
const SPEC = /^(\d+(?:\.\d+)?)([a-z%]+)$/;

/** A thread or screw size: m4x10, m20. */
const THREAD = /^m\d+(?:x\d+)?$/;

/** A bare count that the tokenizer could not weld to anything. */
const BARE_NUMBER = /^\d+(?:\.\d+)?$/;

/**
 * Generic component nouns, not Voltara's parts list. The type is the last of
 * these a description mentions, so "wire fan guard" is a guard and "cooling
 * fan, axial" is still a fan.
 */
const COMPONENT_NOUNS = new Set([
  "fan", "guard", "heatsink", "sink", "pad", "duct", "hvac",
  "capacitor", "resistor", "inductor", "transformer", "varistor", "fuse",
  "holder", "relay", "contactor", "breaker", "filter", "busbar", "lug",
  "module", "board", "card", "backplane", "controller", "sensor", "display",
  "supply", "gateway", "switch", "block", "terminal", "connector", "cable",
  "harness", "ribbon", "gland", "grommet", "gasket", "tie", "standoff",
  "screw", "nut", "washer", "bolt", "rivet", "clip", "bracket",
  "battery", "pack", "cell", "cabinet", "enclosure", "housing", "chassis", "frame",
  "sled", "panel", "plate", "unit", "assembly", "kit", "shunt", "driver",
]);

/** A few spellings that mean the same thing. */
const NOUN_SYNONYM: Record<string, string> = {
  sink: "heatsink",
  heatsinks: "heatsink",
  fans: "fan",
  screws: "screw",
  capacitors: "capacitor",
  // An enclosure and a cabinet are the same kind of thing in a parts list.
  enclosure: "cabinet",
  enclosures: "cabinet",
  housing: "cabinet",
};

export interface Spec {
  value: string;
  unit: string;
}

export type Lane = "type" | "ratings" | "wording";

/** One word of a description, in the lane it was read into. */
export interface Chip {
  /** The word as the parts list wrote it. */
  raw: string;
  /** What the matcher read it as, after abbreviations and synonyms. */
  token: string;
  expanded: boolean;
  lane: Lane;
  /** Set when the chip is a rating. */
  unit?: string;
  value?: string;
}

export interface ParsedPart {
  /** The kind of thing this is. Empty when the description says nothing. */
  type: string;
  specs: Spec[];
  /** Everything else: adjectives, trade words, leftovers. */
  words: string[];
  /** Every word of the description, labelled with the lane it landed in. */
  chips: Chip[];
  /** True when there is nothing here to compare, like "SEE DWG". */
  empty: boolean;
}

export function parsePart(description: string): ParsedPart {
  const tokens = tokenizeWithSource(description ?? "");
  const specs: Spec[] = [];
  const words: string[] = [];
  const chips: Chip[] = [];

  for (const { raw, token: t, expanded } of tokens) {
    const spec = SPEC.exec(t);
    if (spec) {
      specs.push({ value: spec[1], unit: spec[2] });
      chips.push({
        raw,
        token: t,
        expanded,
        lane: "ratings",
        unit: spec[2],
        value: spec[1],
      });
      continue;
    }
    if (THREAD.test(t)) {
      specs.push({ value: t, unit: "thread" });
      chips.push({ raw, token: t, expanded, lane: "ratings", unit: "thread", value: t });
      continue;
    }
    if (BARE_NUMBER.test(t)) {
      specs.push({ value: t, unit: "count" });
      chips.push({ raw, token: t, expanded, lane: "ratings", unit: "count", value: t });
      continue;
    }
    const word = NOUN_SYNONYM[t] ?? t;
    words.push(word);
    chips.push({
      raw,
      token: word,
      expanded: expanded || word !== t,
      lane: "wording",
    });
  }

  // The type is the last component noun mentioned, or the head noun if the
  // description uses a word we do not know.
  let type = "";
  for (const w of words) if (COMPONENT_NOUNS.has(w)) type = NOUN_SYNONYM[w] ?? w;
  if (!type) type = NOUN_SYNONYM[headNoun(description ?? "")] ?? headNoun(description ?? "");

  const leftovers = words.filter((w) => w !== type);
  const empty = !type && specs.length === 0;

  // The word that names the kind of thing moves out of the wording lane. A
  // type read from the head noun may not be a word the description wrote.
  let typed = false;
  for (let i = chips.length - 1; i >= 0; i--) {
    if (!typed && chips[i].lane === "wording" && chips[i].token === type) {
      chips[i] = { ...chips[i], lane: "type" };
      typed = true;
    }
  }

  return { type, specs, words: leftovers, chips, empty };
}

/**
 * A description that tells us nothing a matcher can read: no rating, and no
 * word that names a kind of component. "SEE DWG" on its own is unusable;
 * "MACHINE SCREW - SEE DWG" is a screw with no rating, which is a review.
 */
export function isUnusable(description: string): boolean {
  const parsed = parsePart(description);
  if (parsed.empty) return true;
  return parsed.specs.length === 0 && !COMPONENT_NOUNS.has(parsed.type);
}

/* ---------- comparing ---------- */

export const WEIGHTS = { type: 0.5, specs: 0.35, words: 0.15 };
export const SAME = 0.85;
export const REVIEW = 0.6;
/** One rating that disagrees is enough to hold the whole thing back. */
export const CONFLICT_CAP = 0.3;

export type Verdict = "same" | "review" | "different";

export interface SpecCheck {
  unit: string;
  a: string | null;
  b: string | null;
  agrees: boolean;
}

/** One line of the arithmetic, so a screen can print what was actually used. */
export interface Term {
  label: string;
  weight: number;
  value: number;
  contribution: number;
}

export interface Similarity {
  score: number;
  type: number;
  specs: number;
  words: number;
  verdict: Verdict;
  reasons: string[];
  parsedA: ParsedPart;
  parsedB: ParsedPart;
  /** Every unit either side mentions, lined up. */
  checks: SpecCheck[];
  /** The weighted lines that add up to the score. */
  terms: Term[];
  /** Set when a rule overrode the arithmetic. */
  override: string | null;
}

function byUnit(parsed: ParsedPart): Map<string, string> {
  const out = new Map<string, string>();
  // A unit repeated in one description keeps its first value, which is the
  // one the description leads with.
  for (const s of parsed.specs) if (!out.has(s.unit)) out.set(s.unit, s.value);
  return out;
}

export function similarity(a: string, b: string): Similarity {
  const parsedA = parsePart(a);
  const parsedB = parsePart(b);
  const reasons: string[] = [];

  const unitsA = byUnit(parsedA);
  const unitsB = byUnit(parsedB);
  const shared = [...unitsA.keys()].filter((u) => unitsB.has(u));

  const checks: SpecCheck[] = [...new Set([...unitsA.keys(), ...unitsB.keys()])].map(
    (unit) => ({
      unit,
      a: unitsA.get(unit) ?? null,
      b: unitsB.get(unit) ?? null,
      agrees: unitsA.get(unit) === unitsB.get(unit) && unitsA.has(unit),
    })
  );

  const unusable = isUnusable(a) || isUnusable(b);

  const type = parsedA.type && parsedA.type === parsedB.type ? 1 : 0;
  if (type === 1) reasons.push(`Both are a ${parsedA.type}`);
  else if (parsedA.type && parsedB.type)
    reasons.push(`A ${parsedA.type} is not a ${parsedB.type}`);

  const agreed = shared.filter((u) => unitsA.get(u) === unitsB.get(u));
  const conflicts = shared.filter((u) => unitsA.get(u) !== unitsB.get(u));
  /**
   * Neither description carries a rating, so there is no specs dimension to
   * score. The weight moves to the two dimensions that do exist rather than
   * holding a pair of identical descriptions at 0.83 forever. When one side
   * has ratings and the other does not, the half mark still applies: the
   * silence is a real gap and a person should look.
   */
  const noSpecsAnywhere = parsedA.specs.length === 0 && parsedB.specs.length === 0;
  let specs: number;
  if (shared.length === 0) {
    specs = 0.5;
    reasons.push(
      noSpecsAnywhere
        ? "neither description carries a rating, so ratings are not scored"
        : "no specs to compare"
    );
  } else {
    specs = agreed.length / shared.length;
    if (agreed.length > 0)
      reasons.push(
        `${agreed.length} of ${shared.length} ratings agree (${agreed.join(", ")})`
      );
    for (const u of conflicts)
      reasons.push(`${u} differs: ${unitsA.get(u)} against ${unitsB.get(u)}`);
  }

  const setA = new Set(parsedA.words);
  const setB = new Set(parsedB.words);
  const union = new Set([...setA, ...setB]);
  const overlap = [...setA].filter((w) => setB.has(w));
  const words = union.size === 0 ? 1 : overlap.length / union.size;

  // With no ratings anywhere the weight moves to the dimensions that exist.
  const divisor = noSpecsAnywhere ? WEIGHTS.type + WEIGHTS.words : 1;
  const terms: Term[] = [
    { label: "Same kind of thing", weight: WEIGHTS.type / divisor, value: type },
    ...(noSpecsAnywhere
      ? []
      : [{ label: "Ratings agree", weight: WEIGHTS.specs, value: specs }]),
    { label: "Rest of the wording", weight: WEIGHTS.words / divisor, value: words },
  ].map((t) => ({ ...t, contribution: t.weight * t.value }));

  let score = terms.reduce((n, t) => n + t.contribution, 0);
  let override: string | null = null;

  // A different kind of thing is never the same part, whatever else matches.
  if (type === 0) {
    score = 0;
    override = `a ${parsedA.type || "description with no kind of thing in it"} is not a ${
      parsedB.type || "description with no kind of thing in it"
    }, so the score is 0`;
  } else if (conflicts.length > 0 && score > CONFLICT_CAP) {
    score = CONFLICT_CAP;
    override = `held at ${CONFLICT_CAP.toFixed(2)} by a rating that disagrees`;
    reasons.push(override);
  }

  let verdict: Verdict =
    score >= SAME ? "same" : score >= REVIEW ? "review" : "different";
  if (unusable) {
    verdict = "review";
    reasons.push("one description says nothing a matcher can read");
  }

  return {
    score: Math.round(score * 100) / 100,
    type,
    specs: Math.round(specs * 100) / 100,
    words: Math.round(words * 100) / 100,
    verdict,
    reasons,
    parsedA,
    parsedB,
    checks,
    terms: terms.map((t) => ({
      ...t,
      contribution: Math.round(t.contribution * 100) / 100,
    })),
    override,
  };
}

/**
 * What engine/evaluate_matcher.ts measured, as written to
 * data/derived/matcher_eval.json. The app displays this; it never grades.
 */
export interface MatcherEval {
  ranAt: string;
  partNumbers: number;
  trueParts: number;
  groupsFound: number;
  pairwisePrecision: number;
  pairwiseRecall: number;
  truePairs: number;
  mergedPairs: number;
  correctMerges: number;
  wrongMerges: number;
  missedMerges: number;
  sentToReview: number;
  unusableDescriptions: number;
  worst: {
    kind: string;
    score: number;
    a: string;
    b: string;
    truthA: string;
    truthB: string;
  }[];
  note: string;
}

/* ---------- grouping ---------- */

export interface GroupRow {
  pn: string;
  description: string;
}

export interface PartGroup {
  /** The part numbers the matcher believes are one part. */
  members: string[];
  /** The description it grouped them under. */
  label: string;
}

export interface GroupResult {
  groups: PartGroup[];
  /** Pairs a person has to look at, and rows nothing could be said about. */
  review: { a: string; b: string; score: number; reason: string }[];
  unusable: string[];
}

/**
 * Cluster part numbers using only the pairs the matcher calls "same". Review
 * pairs are reported, never merged: the whole point is that a person decides
 * the ones it is unsure about.
 */
export function groupParts(rows: GroupRow[]): GroupResult {
  const parent = new Map<string, string>();
  rows.forEach((r) => parent.set(r.pn, r.pn));
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const union = (x: string, y: string) => {
    const a = find(x);
    const b = find(y);
    if (a !== b) parent.set(a, b);
  };

  const review: GroupResult["review"] = [];
  const unusable = rows.filter((r) => isUnusable(r.description)).map((r) => r.pn);

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const s = similarity(rows[i].description, rows[j].description);
      if (s.verdict === "same") union(rows[i].pn, rows[j].pn);
      else if (s.verdict === "review" && s.score >= REVIEW)
        review.push({
          a: rows[i].pn,
          b: rows[j].pn,
          score: s.score,
          reason: s.reasons[s.reasons.length - 1] ?? "",
        });
    }
  }

  const byRoot = new Map<string, string[]>();
  rows.forEach((r) => {
    const root = find(r.pn);
    byRoot.set(root, [...(byRoot.get(root) ?? []), r.pn]);
  });

  const label = new Map(rows.map((r) => [r.pn, r.description]));
  const groups: PartGroup[] = [...byRoot.values()].map((members) => ({
    members,
    label: label.get(members[0]) ?? "",
  }));

  return { groups, review, unusable };
}
