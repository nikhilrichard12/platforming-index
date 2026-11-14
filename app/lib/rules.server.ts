import fs from "fs";
import path from "path";
import {
  Activity,
  ActivityDetail,
  ActivitySource,
  Decision,
  DecisionSource,
  ReasonKind,
  Rule,
  reasonLabel,
} from "./rules";

/**
 * The decisions and rules store, on disk at data/derived/decisions.json.
 *
 * The point of the store is that declining a suggestion teaches the system
 * something. An engineer who says "this cabinet needs US-origin cooling
 * parts" is stating a rule, not just skipping a prompt, so the exception
 * writes a rule scoped to that product and that part. The next engineer sees
 * the rule instead of the same suggestion.
 *
 * An exception never lowers the index score. Complexity that a compliance
 * requirement forces is not complexity anyone chose.
 */

interface Store {
  decisions: Decision[];
  rules: Rule[];
  activity: Activity[];
}

const FILE = path.join(process.cwd(), "..", "data", "derived", "decisions.json");

function read(): Store {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<Store>;
    return {
      decisions: raw.decisions ?? [],
      rules: raw.rules ?? [],
      activity: raw.activity ?? [],
    };
  } catch {
    // No file yet, or it was reset. An empty store is the valid starting state.
    return { decisions: [], rules: [], activity: [] };
  }
}

function write(store: Store): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2) + "\n", "utf8");
}

/** Newest first, capped so the file cannot grow without bound. */
export function listActivity(limit = 50): Activity[] {
  return [...read().activity].reverse().slice(0, limit);
}

export function logActivity(entry: {
  source: ActivitySource;
  agentName?: string;
  tool: string;
  summary: string;
  product?: string;
  detail?: ActivityDetail;
}): Activity {
  const store = read();
  const record: Activity = {
    id: `A${String(store.activity.length + 1).padStart(5, "0")}`,
    at: new Date().toISOString(),
    ...entry,
  };
  store.activity.push(record);
  if (store.activity.length > 500) store.activity.splice(0, store.activity.length - 500);
  write(store);
  return record;
}

export function listDecisions(): Decision[] {
  return [...read().decisions].reverse();
}

export function listRules(product?: string): Rule[] {
  const rules = read().rules.filter((r) => !product || r.scope.product === product);
  return rules.reverse();
}

/** Rules that block this part for this product. */
export function blockingRules(partName: string, product: string): Rule[] {
  if (!partName || !product) return [];
  return read().rules.filter(
    (r) => r.appliesToPart === partName && r.scope.product === product
  );
}

export interface RecordInput {
  description: string;
  product: string;
  decision: "reuse" | "exception";
  matchedPart?: string;
  suggestedPn?: string;
  reasonKind?: ReasonKind;
  reasonText?: string;
  role?: string;
  source: DecisionSource;
}

export interface RecordResult {
  decision: Decision;
  rule: Rule | null;
  /** Stated on every exception so nobody reads it as a penalty. */
  indexScoreUnchanged: true;
}

export function record(input: RecordInput): RecordResult {
  const store = read();
  const at = new Date().toISOString();

  const decision: Decision = {
    id: `D${String(store.decisions.length + 1).padStart(4, "0")}`,
    at,
    description: input.description.trim(),
    product: input.product.trim(),
    matchedPart: input.matchedPart,
    suggestedPn: input.suggestedPn,
    decision: input.decision,
    reasonKind: input.decision === "exception" ? input.reasonKind : undefined,
    reasonText: input.reasonText?.trim() || undefined,
    role: input.role,
    source: input.source,
  };
  store.decisions.push(decision);

  // Declining teaches the system a rule; accepting only records.
  let rule: Rule | null = null;
  if (decision.decision === "exception" && decision.matchedPart) {
    rule = {
      id: `R${String(store.rules.length + 1).padStart(4, "0")}`,
      at,
      scope: { product: decision.product },
      kind: decision.reasonKind ?? "other",
      text: decision.reasonText || reasonLabel(decision.reasonKind),
      appliesToPart: decision.matchedPart,
      createdFromDecisionId: decision.id,
    };
    store.rules.push(rule);
  }

  write(store);
  return { decision, rule, indexScoreUnchanged: true };
}

export function reset(): void {
  write({ decisions: [], rules: [], activity: [] });
}
