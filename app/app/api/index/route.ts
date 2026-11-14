import { NextRequest, NextResponse } from "next/server";
import { loadVoltaraData } from "@/lib/voltaraData.server";
import { corsHeaders, preflight } from "@/lib/cors";

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
  return NextResponse.json(
    {
      company: data.company,
      period: data.period,
      index: data.index,
      read: "Sharing parts, not yet a platform.",
      steps: STEPS,
      summary: data.summary,
    },
    { headers }
  );
}
