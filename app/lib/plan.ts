import { ReasonKind } from "./rules";

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

/** Below this the matcher is guessing, so the need counts as a new part. */
export const PLAN_FLOOR = 0.35;

export interface PlannedNeed {
  need: string;
  status: NeedStatus;
  confidence: number;
  part?: string;
  partNumber?: string;
  price?: number;
  supplier?: string;
  po?: string;
  products?: number;
  partNumberCount?: number;
  rule?: { id: string; text: string; kind: ReasonKind };
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
