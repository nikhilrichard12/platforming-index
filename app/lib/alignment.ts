import { SurveyFile } from "./survey";
import { DecisionSource } from "./rules";

/**
 * The three questions leadership splits on, and what deciding one does.
 *
 * A decision here is not a note. Naming an owner means every function now
 * names the same owner, and setting a target means every function now carries
 * one, so the two survey inputs the index reads change and the score follows.
 */

export type AlignmentQuestionId = "variants" | "ownership" | "measured";

export interface AlignmentDecision {
  id: string;
  at: string;
  question: AlignmentQuestionId;
  choice: string;
  source: DecisionSource;
}

export interface AlignmentConfig {
  id: AlignmentQuestionId;
  /** The decision itself, on the accent button. */
  action: string;
  /** What the picker asks, and what it offers. */
  prompt: string;
  options: string[];
  /** Which inventory filter shows the parts behind this question. */
  filter: "review" | "shared" | "core";
  filterLabel: string;
  /** The brief the assistant is asked to draft. */
  brief: string;
}

export const ALIGNMENT: Record<AlignmentQuestionId, AlignmentConfig> = {
  ownership: {
    id: "ownership",
    action: "Name one owner",
    prompt: "Who owns cross product part decisions from now on?",
    options: ["CEO", "CFO", "Engineering", "Sales", "Supply chain"],
    filter: "review",
    filterLabel: "Needs review",
    brief:
      "Draft a five sentence brief for the CEO, CFO, Engineering, Sales and Supply chain on who should own cross product part decisions at Voltara. Use the parts data for evidence and name the cost of leaving it unowned.",
  },
  measured: {
    id: "measured",
    action: "Set a complexity target",
    prompt: "Which target goes into next year's goals?",
    options: [
      "No new part number without a reuse check",
      "Part numbers per product line, held flat",
      "Reuse rate on new designs, 60 percent",
    ],
    filter: "core",
    filterLabel: "Core candidates",
    brief:
      "Draft a five sentence brief for the CEO, CFO, Engineering, Sales and Supply chain on setting one complexity target at Voltara. Say which team carries it, what it measures, and what it is worth using the price gap.",
  },
  variants: {
    id: "variants",
    action: "Agree what customers pay for",
    prompt: "Which differences does a customer actually pay for?",
    options: [
      "Only ratings a customer specifies",
      "Only variants with a named customer",
      "One configuration per power class",
    ],
    filter: "shared",
    filterLabel: "Shared",
    brief:
      "Draft a five sentence brief for the CEO, CFO, Engineering, Sales and Supply chain on which product differences customers actually pay for at Voltara. Use the unique parts figure and say what it costs to keep variants nobody asked for.",
  },
};

export const ALIGNMENT_IDS: AlignmentQuestionId[] = [
  "ownership",
  "measured",
  "variants",
];

/** Answers that name no owner, no target, and no agreement. */
export const WEAK_ANSWER = /^(nobody|no one|none|no|not sure|unclear|not answered)$/i;

export function decisionFor(
  decisions: AlignmentDecision[],
  id: AlignmentQuestionId
): AlignmentDecision | null {
  return decisions.find((d) => d.question === id) ?? null;
}

/**
 * The survey the index should read once leadership has decided. The decisions
 * are applied to the answers themselves, so there is one scoring path and the
 * disclosure on the index strip still prints the arithmetic it used.
 */
export function applyAlignment(
  survey: SurveyFile,
  decisions: AlignmentDecision[]
): SurveyFile {
  if (decisions.length === 0) return survey;

  const owner = decisionFor(decisions, "ownership");
  const target = decisionFor(decisions, "measured");
  if (!owner && !target) return survey;

  const questions = survey.questions.map((q) => {
    if (q.id === "ownership" && owner) {
      return {
        ...q,
        answers: Object.fromEntries(
          Object.keys(q.answers).map((f) => [f, owner.choice])
        ),
      };
    }
    if (q.id === "measured" && target) {
      return {
        ...q,
        answers: Object.fromEntries(Object.keys(q.answers).map((f) => [f, "Yes"])),
      };
    }
    return q;
  });

  return { ...survey, questions };
}

/** What the split costs, in figures the app already carries. */
export function costSentence(
  id: AlignmentQuestionId,
  s: {
    partNumbers: number;
    realParts: number;
    uniqueParts: number;
    sharedParts: number;
    yearlyPriceGapUsd: number;
  },
  money: (n: number) => string
): string {
  const duplicates = s.partNumbers - s.realParts;
  switch (id) {
    case "ownership":
      return `Nobody had to approve the ${duplicates} duplicate part numbers Voltara now carries, because no function owns the decision that creates one.`;
    case "measured":
      return `No function carries a complexity target, and the price gap on shared parts runs to ${money(
        s.yearlyPriceGapUsd
      )} a year.`;
    default:
      return `${s.uniqueParts} of ${s.realParts} parts exist on one product only. Each one is a difference somebody believed a customer would pay for.`;
  }
}

/* ---------- how far each function sits from the group ---------- */

export const RING_LABELS = ["Aligned", "1 apart", "2 apart", "3 apart"];

/** The answer most of the group gave, ignoring nobody and no one in particular. */
function commonAnswer(answers: string[]): string {
  const counts = new Map<string, number>();
  answers.forEach((a) => counts.set(a, (counts.get(a) ?? 0) + 1));
  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""
  );
}

export interface RingResult {
  /** How many open questions this function is apart from the group. */
  ring: number;
  /** Which question ids they are apart on. */
  apart: string[];
}

/**
 * A function's distance from the group: the number of still open questions
 * where its answer is not the group's answer. "Nobody", "No" and "Not sure"
 * always count as apart, because declining to take a position is not the same
 * as agreeing with one.
 */
export function computeRings(
  questions: { id: string; answers: Record<string, string> }[],
  functions: string[],
  decided: string[] = []
): Record<string, RingResult> {
  const out: Record<string, RingResult> = {};
  functions.forEach((f) => (out[f] = { ring: 0, apart: [] }));

  for (const q of questions) {
    if (decided.includes(q.id)) continue;
    const group = commonAnswer(functions.map((f) => q.answers[f] ?? ""));
    for (const f of functions) {
      const a = q.answers[f] ?? "";
      if (a !== group || WEAK_ANSWER.test(a.trim())) {
        out[f].ring += 1;
        out[f].apart.push(q.id);
      }
    }
  }
  return out;
}

/** Which decision would close this function's biggest open gap. */
export function nextDecisionFor(
  apart: string[],
  decided: string[]
): AlignmentQuestionId | null {
  const order: AlignmentQuestionId[] = ["ownership", "measured", "variants"];
  return (
    order.find((id) => apart.includes(id) && !decided.includes(id)) ?? null
  );
}
