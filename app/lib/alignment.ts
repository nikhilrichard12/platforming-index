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
