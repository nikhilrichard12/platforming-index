import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import { listActivity } from "@/lib/rules.server";

export const runtime = "nodejs";

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

/** The newest 50 calls, whoever made them. Polled by the Connections tab. */
export function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  return NextResponse.json({ activity: listActivity(50) }, { headers });
}
