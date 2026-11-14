import type { UserProfile } from "./types";

/**
 * Level one: the ballpark.
 *
 * Eight answers, no data, two minutes. It exists to tell a leader whether
 * complexity is worth an afternoon, not what it costs. Every number it
 * produces is an estimate from a named constant, printed as a range, and the
 * screen shows the arithmetic. Level two measures the same thing from a parts
 * list and replaces all of it.
 */

/* ---------- the eight answers ---------- */

export const PART_NUMBER_BANDS = [
  { label: "Under 1,000", value: 500 },
  { label: "1,000 to 10,000", value: 5000 },
  { label: "10,000 to 50,000", value: 25000 },
  { label: "Over 50,000", value: 75000 },
] as const;

export const REVENUE_BANDS = [
  "Under $50M",
  "$50M to $250M",
  "$250M to $1B",
  "Over $1B",
] as const;

export const ACQUISITION_BANDS = ["0", "1 to 2", "3 to 5", "6 or more"] as const;

export const ALIGNMENT_ANSWERS = ["Yes", "Partly", "No", "No acquisitions"] as const;

export const PLATFORMING_ANSWERS = [
  "Never",
  "Tried and it stalled",
  "Underway",
  "Running",
] as const;

export const TARGET_ANSWERS = ["Yes", "No", "Not sure"] as const;

export const OWNER_ANSWERS = [
  "One owner",
  "Each team",
  "Nobody in particular",
] as const;

export type RevenueBand = (typeof REVENUE_BANDS)[number];
export type AcquisitionBand = (typeof ACQUISITION_BANDS)[number];
export type AlignmentAnswer = (typeof ALIGNMENT_ANSWERS)[number];
export type PlatformingAnswer = (typeof PLATFORMING_ANSWERS)[number];
export type TargetAnswer = (typeof TARGET_ANSWERS)[number];
export type OwnerAnswer = (typeof OWNER_ANSWERS)[number];

export interface BallparkAnswers {
  partNumbers: number | null;
  revenue: RevenueBand | "";
  productLines: number | null;
  acquisitions: AcquisitionBand | "";
  alignment: AlignmentAnswer | "";
  platforming: PlatformingAnswer | "";
  complexityTarget: TargetAnswer | "";
  partNumberOwner: OwnerAnswer | "";
  /** The reader's own cost per part number, when they edit it. */
  costPerPartNumber?: number;
}

export const EMPTY_BALLPARK: BallparkAnswers = {
  partNumbers: null,
  revenue: "",
  productLines: null,
  acquisitions: "",
  alignment: "",
  platforming: "",
  complexityTarget: "",
  partNumberOwner: "",
};

export function isComplete(a: BallparkAnswers): boolean {
  return (
    !!a.partNumbers &&
    a.partNumbers > 0 &&
    !!a.revenue &&
    !!a.productLines &&
    a.productLines > 0 &&
    !!a.acquisitions &&
    !!a.alignment &&
    !!a.platforming &&
    !!a.complexityTarget &&
    !!a.partNumberOwner
  );
}

/* ---------- the constants, each with where it came from ---------- */

export interface Assumption<T> {
  value: T;
  source: string;
}

export const ASSUMPTIONS = {
  baseDuplicateShare: {
    value: 0.3,
    source:
      "Kearney's platforming work repeatedly finds roughly a third of part numbers are duplicates before any consolidation. Starting point, not a measurement.",
  } as Assumption<number>,

  acquisitionPenaltyPartly: {
    value: 0.05,
    source:
      "Assumption: each acquisition band adds duplicates when parts and suppliers were only partly aligned afterwards.",
  } as Assumption<number>,

  acquisitionPenaltyNo: {
    value: 0.08,
    source:
      "Assumption: an acquisition with no alignment afterwards leaves a second parts list behind, so the penalty is higher.",
  } as Assumption<number>,

  platformingCredit: {
    value: 0.1,
    source:
      "Assumption: a platforming programme that is underway or running has already removed some duplicates.",
  } as Assumption<number>,

  shareFloor: {
    value: 0.1,
    source: "Assumption: no parts list of any size is completely free of duplicates.",
  } as Assumption<number>,

  shareCap: {
    value: 0.5,
    source:
      "Assumption: above half, the estimate says more about the questionnaire than the company.",
  } as Assumption<number>,

  costPerPartNumberPerYear: {
    value: 100,
    source: "assumption, edit me",
  } as Assumption<number>,

  rangeSpread: {
    value: 0.3,
    source:
      "Assumption: eight answers cannot do better than plus or minus 30 percent. The measured index replaces the range with a figure.",
  } as Assumption<number>,
} as const;

/* ---------- point tables for the score ---------- */

export const POINTS = {
  /** Shared architecture: how far platforming has actually got. */
  platforming: {
    Never: 10,
    "Tried and it stalled": 25,
    Underway: 50,
    Running: 75,
  } as Record<PlatformingAnswer, number>,

  /** Shared architecture, adjusted by what happened after acquisitions. */
  alignment: {
    Yes: 15,
    Partly: 5,
    No: 0,
    "No acquisitions": 10,
  } as Record<AlignmentAnswer, number>,

  /** Decision ownership: who may create a part number. */
  partNumberOwner: {
    "One owner": 80,
    "Each team": 35,
    "Nobody in particular": 15,
  } as Record<OwnerAnswer, number>,

  /** Incentives, from the belief answers when they exist. */
  measuredOnComplexity: { Yes: 80, Partly: 50, No: 20 } as Record<string, number>,
  /** Each step of "checks for an existing part first" above or below neutral. */
  checksForExistingPartStep: 5,
  incentivesWithoutBeliefs: 50,

  /** Complexity control: is there a target, and how much was bolted on. */
  complexityTarget: { Yes: 75, No: 25, "Not sure": 35 } as Record<TargetAnswer, number>,
  acquisitionDrag: 5,
} as const;

/** Where the answers put the company on Kearney's three steps. */
export const STEP_FROM_PLATFORMING: Record<PlatformingAnswer, number> = {
  Never: 1,
  "Tried and it stalled": 1,
  Underway: 2,
  Running: 3,
};

export const STEP_LABELS = [
  "Cut cost today",
  "Consolidate duplicates",
  "Common core, modules",
];

/* ---------- the arithmetic ---------- */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 0 for "0", 1 for "1 to 2", 2 for "3 to 5", 3 for "6 or more". */
export function acquisitionBandIndex(band: AcquisitionBand | ""): number {
  const i = ACQUISITION_BANDS.indexOf(band as AcquisitionBand);
  return i < 0 ? 0 : i;
}

export interface ShareWorking {
  base: number;
  bands: number;
  penaltyEach: number;
  penalty: number;
  credit: number;
  share: number;
  clamped: boolean;
}

/** The duplicate share, with the working kept so the screen can print it. */
export function duplicateShare(a: BallparkAnswers): ShareWorking {
  const base = ASSUMPTIONS.baseDuplicateShare.value;
  const bands = acquisitionBandIndex(a.acquisitions);
  const penaltyEach =
    a.alignment === "Partly"
      ? ASSUMPTIONS.acquisitionPenaltyPartly.value
      : a.alignment === "No"
      ? ASSUMPTIONS.acquisitionPenaltyNo.value
      : 0;
  const penalty = bands * penaltyEach;
  const credit =
    a.platforming === "Underway" || a.platforming === "Running"
      ? ASSUMPTIONS.platformingCredit.value
      : 0;

  const raw = base + penalty - credit;
  const share = clamp(raw, ASSUMPTIONS.shareFloor.value, ASSUMPTIONS.shareCap.value);
  return { base, bands, penaltyEach, penalty, credit, share, clamped: share !== raw };
}

export interface Range {
  low: number;
  high: number;
}

/** Eight answers buy a range, not a figure. */
export function spread(value: number, round = 1): Range {
  const s = ASSUMPTIONS.rangeSpread.value;
  const to = (n: number) => Math.max(0, Math.round(n / round) * round);
  return { low: to(value * (1 - s)), high: to(value * (1 + s)) };
}

export function costPerPartNumber(a: BallparkAnswers): number {
  return a.costPerPartNumber && a.costPerPartNumber > 0
    ? a.costPerPartNumber
    : ASSUMPTIONS.costPerPartNumberPerYear.value;
}

export interface BallparkDimension {
  name: string;
  score: number;
  basis: string;
}

export interface BallparkResult {
  share: ShareWorking;
  duplicatePartNumbers: number;
  duplicateRange: Range;
  yearlyCarryingCost: number;
  costRange: Range;
  costEach: number;
  score: number;
  scoreRange: Range;
  dimensions: BallparkDimension[];
  step: number;
}

/**
 * The four dimensions are the ones the measured index uses, so a reader can
 * put the two side by side. Each one is a point table and nothing else.
 */
export function ballparkDimensions(
  a: BallparkAnswers,
  beliefs?: UserProfile
): BallparkDimension[] {
  const sharedArchitecture = clamp(
    (POINTS.platforming[a.platforming as PlatformingAnswer] ?? 25) +
      (POINTS.alignment[a.alignment as AlignmentAnswer] ?? 0),
    0,
    100
  );

  const ownership = POINTS.partNumberOwner[a.partNumberOwner as OwnerAnswer] ?? 35;

  const hasBeliefs = !!beliefs?.measuredOnComplexity || !!beliefs?.checksForExistingPart;
  const incentives = hasBeliefs
    ? clamp(
        (POINTS.measuredOnComplexity[beliefs?.measuredOnComplexity ?? ""] ??
          POINTS.incentivesWithoutBeliefs) +
          ((beliefs?.checksForExistingPart ?? 3) - 3) * POINTS.checksForExistingPartStep,
        0,
        100
      )
    : POINTS.incentivesWithoutBeliefs;

  const complexityControl = clamp(
    (POINTS.complexityTarget[a.complexityTarget as TargetAnswer] ?? 35) -
      acquisitionBandIndex(a.acquisitions) * POINTS.acquisitionDrag,
    0,
    100
  );

  return [
    {
      name: "Shared architecture",
      score: sharedArchitecture,
      basis: `Platforming ${a.platforming || "not answered"}, alignment after acquisitions ${a.alignment || "not answered"}`,
    },
    {
      name: "Decision ownership",
      score: ownership,
      basis: `New part numbers decided by ${a.partNumberOwner || "not answered"}`,
    },
    {
      name: "Incentives",
      score: incentives,
      basis: hasBeliefs
        ? `Measured on complexity ${beliefs?.measuredOnComplexity}, checks for an existing part ${beliefs?.checksForExistingPart} of 5`
        : "No belief answers yet, so this sits at the neutral midpoint",
    },
    {
      name: "Complexity control",
      score: complexityControl,
      basis: `Complexity target ${a.complexityTarget || "not answered"}, ${a.acquisitions || "0"} acquisitions`,
    },
  ];
}

export function ballpark(a: BallparkAnswers, beliefs?: UserProfile): BallparkResult {
  const share = duplicateShare(a);
  const partNumbers = a.partNumbers ?? 0;
  const duplicatePartNumbers = Math.round(partNumbers * share.share);
  const costEach = costPerPartNumber(a);
  const yearlyCarryingCost = duplicatePartNumbers * costEach;

  const dimensions = ballparkDimensions(a, beliefs);
  const score = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  );
  const raw = spread(score);

  return {
    share,
    duplicatePartNumbers,
    duplicateRange: spread(duplicatePartNumbers, duplicatePartNumbers >= 1000 ? 10 : 1),
    yearlyCarryingCost,
    costRange: spread(yearlyCarryingCost, yearlyCarryingCost >= 10000 ? 1000 : 100),
    costEach,
    score,
    scoreRange: { low: clamp(raw.low, 0, 100), high: clamp(raw.high, 0, 100) },
    dimensions,
    step: STEP_FROM_PLATFORMING[a.platforming as PlatformingAnswer] ?? 1,
  };
}
