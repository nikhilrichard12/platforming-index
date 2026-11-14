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

export interface Rule {
  id: string;
  at: string;
  scope: { product: string };
  kind: ReasonKind;
  text: string;
  appliesToPart: string;
  createdFromDecisionId: string;
}
