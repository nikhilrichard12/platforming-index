import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import { REASON_KINDS } from "@/lib/rules";
import { listRules, reset } from "@/lib/rules.server";

export const runtime = "nodejs";

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  const product = req.nextUrl.searchParams.get("product") ?? undefined;
  return NextResponse.json(
    { rules: listRules(product), reasonKinds: REASON_KINDS },
    { headers }
  );
}

/** Clears every rule and decision. For resetting between demos. */
export function DELETE(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  reset();
  return NextResponse.json({ cleared: true }, { headers });
}
