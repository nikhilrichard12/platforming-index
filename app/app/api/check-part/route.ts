import { NextRequest, NextResponse } from "next/server";
import { loadVoltaraData } from "@/lib/voltaraData.server";
import { matchPart } from "@/lib/matcher";
import { corsHeaders, preflight } from "@/lib/cors";

export const runtime = "nodejs";

interface CheckRequest {
  description?: string;
  product?: string;
  unitsPerYear?: number;
}

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  let body: CheckRequest = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ match: null, error: "bad_json" }, { status: 400, headers });
  }

  const description = (body.description ?? "").trim();
  const units = Number.isFinite(body.unitsPerYear) ? Number(body.unitsPerYear) : 0;
  if (!description) return NextResponse.json({ match: null }, { headers });

  const match = matchPart(loadVoltaraData(), description, units);
  return NextResponse.json(
    { match, product: body.product ?? null, unitsPerYear: units },
    { headers }
  );
}
