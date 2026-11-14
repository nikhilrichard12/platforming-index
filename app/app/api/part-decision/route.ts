import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import { DecisionSource, REASON_KINDS, ReasonKind, reasonLabel } from "@/lib/rules";
import { listDecisions, logActivity, record } from "@/lib/rules.server";
import { callerOf } from "@/lib/sources.server";

export const runtime = "nodejs";

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  return NextResponse.json({ decisions: listDecisions() }, { headers });
}

function reasonSuffix(kind?: string) {
  return kind ? ` (${reasonLabel(kind)})` : "";
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

  const caller = callerOf(req);
  logActivity({
    ...caller,
    tool: "record_decision",
    product: result.decision.product || undefined,
    detail: {
      description: result.decision.description,
      partName: result.decision.matchedPart,
      recommendedPn: result.decision.suggestedPn,
      decision: result.decision.decision,
      reasonKind: result.decision.reasonKind,
      ruleId: result.rule?.id,
    },
    summary:
      result.decision.decision === "reuse"
        ? `Reused ${result.decision.suggestedPn ?? "an existing part"} for ${result.decision.product}`
        : `Exception on ${result.decision.matchedPart ?? "a part"}${reasonSuffix(result.decision.reasonKind)}, rule ${result.rule?.id ?? "not created"}`,
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
