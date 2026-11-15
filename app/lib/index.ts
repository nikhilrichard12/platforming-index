import { Decision, IndexShape } from "./rules";
import { SurveyFile } from "./survey";
import { VoltaraFile } from "./voltaraData";
// grouping.ts reads CORE_PRODUCTS from here. The cycle is safe because
// neither module calls the other while it is still loading.
import { Grouping, GroupingId, regroup } from "./grouping";

/**
 * The measured index, computed.
 *
 * Every dimension is a ratio of two numbers that exist in the data, so the
 * score can be rebuilt by hand from the parts list and the survey. Nothing
 * here is set by a person, and nothing is added to the score as a reward: a
 * recorded reuse retires a part number, and the formula does the rest.
 */

/** A part this many products share is a common core candidate. */
export const CORE_PRODUCTS = 5;

/** Answers that name a real owner. "Nobody" is agreement, not ownership. */
const NOT_AN_OWNER = /^(nobody|no one|none|not sure|unclear)$/i;

/** How much an answer about targets counts towards rewarding reuse. */
const TARGET_CREDIT: Record<string, number> = {
  yes: 1,
  partly: 0.5,
  sometimes: 0.5,
  no: 0,
};

export interface IndexWorking {
  coreParts: number;
  realParts: number;
  partNumbers: number;
  retired: number;
  activePartNumbers: number;
  ownerTop: { owner: string; count: number } | null;
  ownerRespondents: number;
  incentiveCredit: number;
  incentiveRespondents: number;
}

export interface ComputedIndex extends IndexShape {
  working: IndexWorking;
  /** Part numbers a recorded reuse has taken off the list. */
  avoided: number;
  /** Which grouping of the part numbers the score was computed from. */
  grouping: GroupingId;
}

const pct = (top: number, bottom: number) =>
  bottom > 0 ? Math.round((100 * top) / bottom) : 0;

/** Which question in the survey file asks about owners, and about targets. */
function answersFor(survey: SurveyFile | null, id: string): string[] {
  const q = survey?.questions.find((x) => x.id === id);
  return q ? Object.values(q.answers) : [];
}

export function computeIndex(
  file: Pick<VoltaraFile, "summary" | "index" | "parts">,
  survey: SurveyFile | null,
  decisions: Decision[]
): ComputedIndex {
  const s = file.summary;

  /* 1. Shared architecture: how much of the parts list is already common. */
  const coreParts = s.coreCandidates;
  const realParts = s.realParts;
  const sharedArchitecture = pct(coreParts, realParts);

  /* 2. Complexity control: how close the part number count is to the number
        of real parts. Every recorded reuse retires one part number. */
  const avoided = decisions.filter((d) => d.decision === "reuse").length;
  const partNumbers = s.partNumbers;
  const activePartNumbers = Math.max(realParts, partNumbers - avoided);
  const complexityControl = pct(realParts, activePartNumbers);

  /* 3. Decision ownership: do the functions name the same owner? */
  const ownerAnswers = answersFor(survey, "ownership");
  const counts = new Map<string, number>();
  ownerAnswers
    .filter((a) => !NOT_AN_OWNER.test(a.trim()))
    .forEach((a) => counts.set(a, (counts.get(a) ?? 0) + 1));
  const ownerTop =
    [...counts.entries()]
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count)[0] ?? null;
  const decisionOwnership = pct(ownerTop?.count ?? 0, ownerAnswers.length);

  /* 4. Incentives: do the targets people carry reward reuse? */
  const targetAnswers = answersFor(survey, "measured");
  const incentiveCredit = targetAnswers.reduce(
    (sum, a) => sum + (TARGET_CREDIT[a.trim().toLowerCase()] ?? 0),
    0
  );
  const incentives = pct(incentiveCredit, targetAnswers.length);

  const dimensions = [
    {
      name: "Shared architecture",
      score: sharedArchitecture,
      basis: `${coreParts} of ${realParts} real parts are used by ${CORE_PRODUCTS} or more products`,
      source: "parts list",
    },
    {
      name: "Decision ownership",
      score: decisionOwnership,
      basis: ownerTop
        ? `${ownerTop.count} of ${ownerAnswers.length} functions name ${ownerTop.owner}`
        : "No function names an owner",
      source: "survey",
    },
    {
      name: "Incentives",
      score: incentives,
      basis:
        incentiveCredit % 1 === 0
          ? `${incentiveCredit} of ${targetAnswers.length} functions carry a target that rewards reuse`
          : `${incentiveCredit} of ${targetAnswers.length} functions carry a target that rewards reuse, counting a partial answer as half`,
      source: "survey",
    },
    {
      name: "Complexity control",
      score: complexityControl,
      basis: `${realParts} real parts across ${activePartNumbers.toLocaleString(
        "en-US"
      )} active part numbers${avoided > 0 ? `, ${avoided} avoided so far` : ""}`,
      source: "parts list",
    },
  ];

  const score = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  );

  return {
    score,
    status: "measured",
    grouping: "reviewed",
    step: file.index.step,
    dimensions,
    avoided,
    working: {
      coreParts,
      realParts,
      partNumbers,
      retired: avoided,
      activePartNumbers,
      ownerTop,
      ownerRespondents: ownerAnswers.length,
      incentiveCredit,
      incentiveRespondents: targetAnswers.length,
    },
  };
}

/**
 * The same index, computed from a given grouping of the part numbers. Two of
 * the four dimensions are counts of real parts, so the matcher's own groups
 * and the groups an engineer confirmed do not produce the same score, and the
 * dashboard can show either.
 */
export function computeIndexFor(
  file: VoltaraFile,
  grouping: Grouping,
  survey: SurveyFile | null,
  decisions: Decision[]
): ComputedIndex {
  return {
    ...computeIndex(regroup(file, grouping), survey, decisions),
    grouping: grouping.id,
  };
}

/** The four formulas, with this company's numbers already in them. */
export function scoreMethod(index: ComputedIndex): {
  name: string;
  formula: string;
  result: string;
}[] {
  const w = index.working;
  const d = index.dimensions;
  return [
    {
      name: "Shared architecture",
      formula: `100 x ${w.coreParts} parts used by ${CORE_PRODUCTS} or more products / ${w.realParts} real parts`,
      result: String(d[0].score),
    },
    {
      name: "Decision ownership",
      formula: w.ownerTop
        ? `100 x ${w.ownerTop.count} functions naming ${w.ownerTop.owner} / ${w.ownerRespondents} functions asked`
        : `100 x 0 / ${w.ownerRespondents} functions asked`,
      result: String(d[1].score),
    },
    {
      name: "Incentives",
      formula: `100 x ${w.incentiveCredit} functions whose targets reward reuse / ${w.incentiveRespondents} functions asked`,
      result: String(d[2].score),
    },
    {
      name: "Complexity control",
      formula: `100 x ${w.realParts} real parts / ${w.activePartNumbers.toLocaleString(
        "en-US"
      )} active part numbers (${w.partNumbers.toLocaleString("en-US")} on the list${
        w.retired > 0 ? `, ${w.retired} retired by reuse` : ""
      })`,
      result: String(d[3].score),
    },
    {
      name: "Complexity Index",
      formula: `(${d.map((x) => x.score).join(" + ")}) / 4`,
      result: String(index.score),
    },
  ];
}
