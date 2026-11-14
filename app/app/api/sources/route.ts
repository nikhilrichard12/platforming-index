import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import { loadSources } from "@/lib/sources.server";

export const runtime = "nodejs";

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  return NextResponse.json(loadSources(), { headers });
}
