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

/**
 * What an engineer decided. Reuse and exception are about one part. The two
 * interface kinds are about the boundary a product designs to, which is the
 * thing that actually carries into the next generation: adopting one settles
 * every need it covers, proposing one leaves something for the next product
 * to find. Neither changes the index score.
 */
export type DecisionKind =
  | "reuse"
  | "exception"
  | "interface_adopted"
  | "interface_proposed";

export const DECISION_KINDS: DecisionKind[] = [
  "reuse",
  "exception",
  "interface_adopted",
  "interface_proposed",
];
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
  decision: DecisionKind;
  reasonKind?: ReasonKind;
  reasonText?: string;
  role?: string;
  source: DecisionSource;
  /** Set when the decision is about an interface rather than a part. */
  interfaceId?: string;
  interfaceName?: string;
  /** The needs an adopted interface covers, or the need a proposal came from. */
  covers?: string[];
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
  origin?: string;
  candidates?: string[];
  /** Set when a rule blocks the matched part for this product. */
  ruleText?: string;
  /** Set by a concept plan. */
  productName?: string;
  needsChecked?: number;
  needsCovered?: number;
  newPartsNeeded?: number;
  decision?: DecisionKind;
  reasonKind?: ReasonKind;
  ruleId?: string;
  /** Set when the decision was about an interface. */
  interfaceId?: string;
  interfaceName?: string;
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

/**
 * What a row did, in words. The log is read by people, so it names the action
 * rather than the function that performed it.
 */
const ACTION_LABEL: Record<string, string> = {
  check_part: "Part check",
  plan_product: "Page check",
  record_decision: "Decision",
  adopt_interface: "Interface adopted",
  propose_interface: "Interface proposed",
  get_rules: "Rules read",
  get_index: "Index read",
  open_dashboard: "Dashboard opened",
  sync: "Sync",
  reset: "Reset",
};

export function actionLabel(tool: string): string {
  if (ACTION_LABEL[tool]) return ACTION_LABEL[tool];
  const words = tool.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const ACTIVITY_LABEL: Record<ActivitySource, string> = {
  // The product has two front doors, the panel and the dashboard. A third
  // label only appears if someone drives the API from outside them.
  agent: "Integration",
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

export interface Rule {
  id: string;
  at: string;
  scope: { product: string };
  kind: ReasonKind;
  text: string;
  appliesToPart: string;
  createdFromDecisionId: string;
}
