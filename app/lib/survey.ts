import { Role, UserProfile } from "./types";

export type FunctionName = "CEO" | "CFO" | "Engineering" | "Sales" | "Supply chain";

export interface SurveyQuestion {
  id: string;
  text: string;
  answers: Record<string, string>;
  decision: string;
}

export interface SurveyFile {
  company: string;
  note: string;
  functions: FunctionName[];
  questions: SurveyQuestion[];
  benchmark: { source: string; text: string };
}

/** The seven survey roles map onto the five functions in the sample responses. */
const FUNCTION_OF: Record<Role, FunctionName> = {
  CEO: "CEO",
  "CFO / Finance": "CFO",
  "Engineering / R&D": "Engineering",
  "Operations / Manufacturing": "Engineering",
  "Sales / Commercial": "Sales",
  "Marketing / Product": "Sales",
  "Supply Chain / Procurement": "Supply chain",
};

export function functionFor(role: Role | ""): FunctionName | null {
  return role ? FUNCTION_OF[role] : null;
}

function variantAnswer(scale: number): string {
  if (!scale) return "Not answered";
  if (scale >= 4) return "Yes";
  if (scale === 3) return "Mostly";
  return "No";
}

function ownerAnswer(owner: UserProfile["architectureOwner"]): string {
  if (!owner) return "Not answered";
  if (owner === "Product") return "Product management";
  if (owner === "Cross-functional group") return "Cross-functional";
  return owner;
}

/**
 * The signed-in user's own function column carries their real answers; the
 * other four stay as sample responses.
 */
export function applyOwnAnswers(
  survey: SurveyFile,
  profile: UserProfile
): { questions: SurveyQuestion[]; you: FunctionName | null } {
  const you = functionFor(profile.role);
  if (!you) return { questions: survey.questions, you: null };

  const own: Record<string, string> = {
    variants: variantAnswer(profile.customersNeedEveryVariant),
    ownership: ownerAnswer(profile.architectureOwner),
    measured: profile.measuredOnComplexity || "Not answered",
  };

  const questions = survey.questions.map((q) =>
    own[q.id] && own[q.id] !== "Not answered"
      ? { ...q, answers: { ...q.answers, [you]: own[q.id] } }
      : q
  );

  return { questions, you };
}

/** A question is a split when the five functions do not all say the same thing. */
export function isSplit(q: SurveyQuestion, functions: FunctionName[]): boolean {
  const values = functions.map((f) => q.answers[f]);
  return new Set(values).size > 1;
}

/** Answers that differ from the majority get tinted, as in the tariff table. */
export function minorityFunctions(
  q: SurveyQuestion,
  functions: FunctionName[]
): Set<FunctionName> {
  const counts = new Map<string, number>();
  for (const f of functions) {
    const v = q.answers[f];
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const out = new Set<FunctionName>();
  const top = Math.max(...counts.values());
  // Everyone agrees, or two answers tie for the lead: nothing is the odd one out.
  if (top === functions.length) return out;
  for (const f of functions) {
    if ((counts.get(q.answers[f]) ?? 0) < top) out.add(f);
  }
  return out;
}
