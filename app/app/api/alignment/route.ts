import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import { ALIGNMENT, AlignmentQuestionId } from "@/lib/alignment";
import { DecisionSource } from "@/lib/rules";
import {
  clearAlignment,
  listAlignment,
  logActivity,
  recordAlignment,
} from "@/lib/rules.server";
import { callerOf } from "@/lib/sources.server";

export const runtime = "nodejs";

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

/** What leadership has decided on the three split questions. */
export function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  return NextResponse.json({ alignment: listAlignment() }, { headers });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  let body: { question?: string; choice?: string; source?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400, headers });
  }

  const question = body.question as AlignmentQuestionId;
  const choice = String(body.choice ?? "").trim();
  if (!ALIGNMENT[question]) {
    return NextResponse.json(
      { error: "question must be ownership, measured or variants" },
      { status: 400, headers }
    );
  }
  if (!choice) {
    return NextResponse.json({ error: "a choice is required" }, { status: 400, headers });
  }

  const decision = recordAlignment({
    question,
    choice,
    source: (body.source as DecisionSource) ?? "dashboard",
  });

  logActivity({
    ...callerOf(req),
    tool: "record_alignment",
    summary: `${ALIGNMENT[question].action}: ${choice}`,
  });

  return NextResponse.json(
    {
      recorded: decision,
      note: "Leadership decisions change the survey answers the index reads. Nothing about the parts changes.",
    },
    { headers }
  );
}

/** Clears one question, or all three when none is named. */
export async function DELETE(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  const question = req.nextUrl.searchParams.get("question") as AlignmentQuestionId | null;
  clearAlignment(question && ALIGNMENT[question] ? question : undefined);

  logActivity({
    ...callerOf(req),
    tool: "reset",
    summary: question ? `Undid ${ALIGNMENT[question].action}` : "Leadership decisions reset",
  });

  return NextResponse.json({ cleared: true, question: question ?? "all" }, { headers });
}
