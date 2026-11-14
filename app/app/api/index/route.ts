import { NextRequest, NextResponse } from "next/server";
import { loadVoltaraData } from "@/lib/voltaraData.server";
import { corsHeaders, preflight } from "@/lib/cors";
import { liveIndex } from "@/lib/rules";
import { listDecisions, logActivity } from "@/lib/rules.server";
import { callerOf } from "@/lib/sources.server";

export const runtime = "nodejs";

const STEPS = [
  "cut cost on today's products",
  "consolidate duplicate part numbers",
  "build a common core with modules for the next generation",
];

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

/** The score and the headline numbers, for callers outside the app. */
export function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  const data = loadVoltaraData();
  const index = liveIndex(data.index, listDecisions());

  logActivity({
    ...callerOf(req),
    tool: "get_index",
    summary: `Read the index, ${index.score} of 100`,
  });

  return NextResponse.json(
    {
      company: data.company,
      period: data.period,
      index,
      read: "Sharing parts, not yet a platform.",
      steps: STEPS,
      summary: data.summary,
    },
    { headers }
  );
}
