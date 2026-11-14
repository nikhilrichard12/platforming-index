/**
 * Decisions and the rules they produce: types and labels, safe on both sides.
 * The file store lives in rules.server.ts.
 *
 * The point of the store is that declining a suggestion teaches the system
 * something. An engineer who says "this cabinet needs US-origin cooling parts"
 * is stating a rule, not just skipping a prompt, so the exception writes a
 * rule scoped to that product and that part. The next engineer sees the rule
 * instead of the same suggestion.
 *
 * An exception never lowers the index score. Complexity that a compliance
 * requirement forces is not complexity anyone chose.
 */

export type DecisionSource = "dashboard" | "extension" | "mcp";
export type ReasonKind =
  | "compliance_or_origin"
  | "customer_requirement"
  | "technical_fit"
  | "other";

export const REASON_KINDS: { id: ReasonKind; label: string }[] = [
  { id: "compliance_or_origin", label: "Compliance or country of origin" },
  { id: "customer_requirement", label: "Customer requirement" },
  { id: "technical_fit", label: "Technical fit" },
  { id: "other", label: "Other" },
];

export function reasonLabel(kind?: string): string {
  return REASON_KINDS.find((k) => k.id === kind)?.label ?? "Other";
}

export interface Decision {
  id: string;
  at: string;
  description: string;
  product: string;
  matchedPart?: string;
  suggestedPn?: string;
  decision: "reuse" | "exception";
  reasonKind?: ReasonKind;
  reasonText?: string;
  role?: string;
  source: DecisionSource;
}

export type ActivitySource = "agent" | "extension" | "dashboard";

/**
 * What the call actually found, kept beside the one line summary so the live
 * stage on Connections can draw the call rather than paraphrase it. Every
 * field comes from the matcher or the decision store, none of it is composed
 * for the animation.
 */
export interface ActivityDetail {
  description?: string;
  level?: "match" | "possible" | "none";
  blocked?: boolean;
  partName?: string;
  /** One per existing part number, with the product that carries it. */
  partNumbers?: { pn: string; product: string }[];
  recommendedPn?: string;
  minPrice?: number;
  savingUsd?: number;
  po?: string;
  candidates?: string[];
  /** Set when a rule blocks the matched part for this product. */
  ruleText?: string;
  decision?: "reuse" | "exception";
  reasonKind?: ReasonKind;
  ruleId?: string;
}

export interface Activity {
  id: string;
  at: string;
  source: ActivitySource;
  agentName?: string;
  tool: string;
  summary: string;
  product?: string;
  detail?: ActivityDetail;
}

export const ACTIVITY_LABEL: Record<ActivitySource, string> = {
  agent: "Agent",
  extension: "Extension",
  dashboard: "Dashboard",
};

export interface IndexDimension {
  name: string;
  score: number;
  basis: string;
  source: string;
}

export interface IndexShape {
  score: number;
  status: string;
  dimensions: IndexDimension[];
  step: number;
}

/** Each recorded reuse lifts Complexity control by this much. */
export const REUSE_STEP = 2;

/**
 * The score with the loop closed: Complexity control rises as engineers reuse
 * parts, so the dashboard moves while the demo runs. An exception changes
 * nothing, because complexity a rule requires is not complexity anyone chose.
 */
export function liveIndex(base: IndexShape, decisions: Decision[]): IndexShape {
  const reuses = decisions.filter((d) => d.decision === "reuse").length;
  const dimensions = base.dimensions.map((d) =>
    d.name === "Complexity control"
      ? {
          ...d,
          score: Math.min(100, d.score + REUSE_STEP * reuses),
          basis:
            reuses === 0
              ? d.basis
              : `${reuses} reuse${reuses === 1 ? "" : "s"} recorded since the baseline`,
        }
      : d
  );
  const score = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  );
  return { ...base, score, dimensions };
}

export interface Rule {
  id: string;
  at: string;
  scope: { product: string };
  kind: ReasonKind;
  text: string;
  appliesToPart: string;
  createdFromDecisionId: string;
}
