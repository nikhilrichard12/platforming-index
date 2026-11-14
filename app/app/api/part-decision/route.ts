import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import { DecisionSource, REASON_KINDS, ReasonKind } from "@/lib/rules";
import { listDecisions, record } from "@/lib/rules.server";

export const runtime = "nodejs";

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  return NextResponse.json({ decisions: listDecisions() }, { headers });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400, headers });
  }

  const decision = body.decision;
  if (decision !== "reuse" && decision !== "exception") {
    return NextResponse.json(
      { error: "decision must be reuse or exception" },
      { status: 400, headers }
    );
  }

  const reasonKind = body.reasonKind as ReasonKind | undefined;
  if (decision === "exception") {
    if (!reasonKind || !REASON_KINDS.some((k) => k.id === reasonKind)) {
      return NextResponse.json(
        {
          error: "an exception needs a reasonKind",
          reasonKinds: REASON_KINDS,
        },
        { status: 400, headers }
      );
    }
  }

  const result = record({
    description: String(body.description ?? ""),
    product: String(body.product ?? ""),
    decision,
    matchedPart: body.matchedPart ? String(body.matchedPart) : undefined,
    suggestedPn: body.suggestedPn ? String(body.suggestedPn) : undefined,
    reasonKind,
    reasonText: body.reasonText ? String(body.reasonText) : undefined,
    role: body.role ? String(body.role) : undefined,
    source: (body.source as DecisionSource) ?? "dashboard",
  });

  return NextResponse.json(
    {
      recorded: result.decision,
      rule: result.rule,
      indexScoreUnchanged: true,
      note: "An exception does not lower the Platforming Index score. Complexity a rule requires is not complexity anyone chose.",
    },
    { headers }
  );
}
