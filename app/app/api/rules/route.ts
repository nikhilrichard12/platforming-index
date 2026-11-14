import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import { REASON_KINDS } from "@/lib/rules";
import { listRules, logActivity, reset } from "@/lib/rules.server";
import { callerOf } from "@/lib/sources.server";

export const runtime = "nodejs";

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  const product = req.nextUrl.searchParams.get("product") ?? undefined;
  const rules = listRules(product);
  // The dashboard polls this; only log a caller asking a real question.
  const caller = callerOf(req);
  if (caller.source !== "dashboard") {
    logActivity({
      ...caller,
      tool: "get_rules",
      product,
      summary: `Read ${rules.length} rule${rules.length === 1 ? "" : "s"} in force`,
    });
  }
  return NextResponse.json(
    { rules, reasonKinds: REASON_KINDS },
    { headers }
  );
}

/** Clears every rule and decision. For resetting between demos. */
export function DELETE(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  reset();
  // The reset clears the log too, so this entry is the first of the new run.
  logActivity({ ...callerOf(req), tool: "reset", summary: "Demo data reset" });
  return NextResponse.json({ cleared: true }, { headers });
}
