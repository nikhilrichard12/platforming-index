import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import {
  DECISION_KINDS,
  DecisionKind,
  Decision,
  DecisionSource,
  REASON_KINDS,
  Rule,
  ReasonKind,
  reasonLabel,
} from "@/lib/rules";
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

/** What the log says this decision did, in words a person reads. */
function summaryFor(result: { decision: Decision; rule: Rule | null }): string {
  const d = result.decision;
  switch (d.decision) {
    case "reuse":
      return `Reused ${d.suggestedPn ?? "an existing part"} for ${d.product}`;
    case "interface_adopted":
      return `Designing ${d.product} to ${d.interfaceName ?? d.interfaceId ?? "an existing interface"}, settling ${d.covers?.length ?? 0} needs`;
    case "interface_proposed":
      return `Proposed a new interface for ${d.description} on ${d.product}`;
    default:
      return `Exception on ${d.matchedPart ?? "a part"}${reasonSuffix(d.reasonKind)}, rule ${result.rule?.id ?? "not created"}`;
  }
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400, headers });
  }

  const decision = body.decision as DecisionKind;
  if (!DECISION_KINDS.includes(decision)) {
    return NextResponse.json(
      { error: `decision must be one of ${DECISION_KINDS.join(", ")}` },
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
    interfaceId: body.interfaceId ? String(body.interfaceId) : undefined,
    interfaceName: body.interfaceName ? String(body.interfaceName) : undefined,
    covers: Array.isArray(body.covers) ? body.covers.map(String) : undefined,
  });

  const d = result.decision;
  const tool =
    d.decision === "interface_adopted"
      ? "adopt_interface"
      : d.decision === "interface_proposed"
        ? "propose_interface"
        : "record_decision";

  const caller = callerOf(req);
  logActivity({
    ...caller,
    tool,
    product: result.decision.product || undefined,
    detail: {
      description: result.decision.description,
      partName: result.decision.matchedPart,
      recommendedPn: result.decision.suggestedPn,
      decision: result.decision.decision,
      reasonKind: result.decision.reasonKind,
      ruleId: result.rule?.id,
    },
    summary: summaryFor(result),
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
