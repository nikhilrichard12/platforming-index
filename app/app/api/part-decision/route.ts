import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";

export const runtime = "nodejs";

export interface PartDecision {
  id: string;
  description: string;
  product: string;
  decision: "reuse" | "exception";
  partNumber?: string;
  reason?: string;
  at: string;
}

/**
 * In-memory for the demo: decisions live as long as the server process does,
 * nothing is written to disk and nothing leaves the machine. Parked on
 * globalThis so the list survives the module reloads the dev server does on
 * every edit, which would otherwise empty it mid-demo.
 */
const store = globalThis as unknown as { __piDecisions?: PartDecision[] };
store.__piDecisions ??= [];
const decisions = store.__piDecisions;

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  return NextResponse.json({ decisions: [...decisions].reverse() }, { headers });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  let body: Partial<PartDecision> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400, headers });
  }

  if (body.decision !== "reuse" && body.decision !== "exception") {
    return NextResponse.json({ error: "decision must be reuse or exception" }, { status: 400, headers });
  }

  const record: PartDecision = {
    id: `D${String(decisions.length + 1).padStart(4, "0")}`,
    description: (body.description ?? "").trim(),
    product: (body.product ?? "").trim(),
    decision: body.decision,
    partNumber: body.partNumber,
    reason: body.reason?.trim() || undefined,
    at: new Date().toISOString(),
  };
  decisions.push(record);

  return NextResponse.json({ recorded: record }, { headers });
}
