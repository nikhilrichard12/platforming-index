import { NextRequest, NextResponse } from "next/server";
import {
  loadMatcherGrouping,
  loadSurvey,
  loadVoltaraData,
} from "@/lib/voltaraData.server";
import { corsHeaders, preflight } from "@/lib/cors";
import { computeIndex, computeIndexFor, scoreMethod } from "@/lib/index";
import { priceGapOf, regroup, reviewedGrouping } from "@/lib/grouping";
import { applyAlignment } from "@/lib/alignment";
import { listAlignment, listDecisions, logActivity } from "@/lib/rules.server";
import { callerOf } from "@/lib/sources.server";

export const runtime = "nodejs";

const STEPS = [
  "cut cost on today's products",
  "consolidate duplicate part numbers",
  "build a common core with modules for the next generation",
];

/** The figures that move when the grouping changes. */
function summaryOf(
  file: { summary: { realParts: number; coreCandidates: number; sharedParts: number; uniqueParts: number; partNumbers: number; yearlyPriceGapUsd: number } },
  index: { score: number; dimensions: { name: string; score: number }[] }
) {
  const s = file.summary;
  return {
    partNumbers: s.partNumbers,
    realParts: s.realParts,
    coreCandidates: s.coreCandidates,
    sharedParts: s.sharedParts,
    uniqueParts: s.uniqueParts,
    yearlyPriceGapUsd: s.yearlyPriceGapUsd,
    score: index.score,
    dimensions: index.dimensions.map((d) => ({ name: d.name, score: d.score })),
  };
}

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

/** The score and the headline numbers, for callers outside the app. */
export function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  const data = loadVoltaraData();
  const survey = applyAlignment(loadSurvey(), listAlignment());
  const decisions = listDecisions();
  const index = computeIndex(data, survey, decisions);

  // The same score from each grouping of the 252 part numbers. The headline
  // stays the reviewed one; the matcher's own groups are what it reaches with
  // no key and no person, and the gap between them is the cost of matching.
  const matcher = loadMatcherGrouping();
  const reviewed = reviewedGrouping(data);
  const both = {
    matcherOnly: {
      ...summaryOf(regroup(data, matcher), computeIndexFor(data, matcher, survey, decisions)),
      priceGapSameArithmetic: priceGapOf(data, matcher),
      groups: matcher.groups.length,
    },
    reviewed: {
      ...summaryOf(data, index),
      priceGapSameArithmetic: priceGapOf(data, reviewed),
      groups: reviewed.groups.length,
    },
  };

  // A screen refreshing its own score is not an event worth logging.
  if (req.nextUrl.searchParams.get("quiet") !== "1") {
    logActivity({
      ...callerOf(req),
      tool: "get_index",
      summary: `Read the index, ${index.score} of 100`,
    });
  }

  return NextResponse.json(
    {
      company: data.company,
      period: data.period,
      index,
      grouping: both,
      method: scoreMethod(index),
      read: "Sharing parts, not yet a platform.",
      steps: STEPS,
      summary: data.summary,
    },
    { headers }
  );
}
