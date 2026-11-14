import { NextRequest, NextResponse } from "next/server";
import { loadVoltaraData } from "@/lib/voltaraData.server";
import { matchCandidates } from "@/lib/matcher";
import { corsHeaders, preflight } from "@/lib/cors";
import { blockingRules, logActivity } from "@/lib/rules.server";
import { callerOf } from "@/lib/sources.server";
import {
  PLAN_FLOOR,
  PLAN_NOTE,
  PlanResult,
  PlannedNeed,
  headline,
  splitNeeds,
  statusFor,
  summarize,
} from "@/lib/plan";

export const runtime = "nodejs";

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  let body: {
    product_name?: string;
    description?: string;
    needs?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400, headers });
  }

  const name = String(body.product_name ?? "").trim() || "Unnamed concept";
  const description = String(body.description ?? "").trim();
  const given = Array.isArray(body.needs)
    ? body.needs.map((n) => String(n).trim()).filter(Boolean)
    : [];
  const needs = given.length > 0 ? given : splitNeeds(description);

  if (needs.length === 0) {
    return NextResponse.json(
      {
        error: "nothing to check",
        hint: "Pass needs as a list, or a description with one need per line.",
      },
      { status: 400, headers }
    );
  }

  const data = loadVoltaraData();

  const planned: PlannedNeed[] = needs.map((need) => {
    const best = matchCandidates(data, need, 0, 1)[0] ?? null;
    const confidence = best?.confidence ?? 0;

    if (!best || confidence < PLAN_FLOOR) {
      return { need, status: "new part needed", confidence };
    }

    // The same rules an engineer would meet at design time.
    const blocked = blockingRules(best.name, name);
    const row = {
      need,
      confidence,
      part: best.name,
      partNumber: best.bestRow.pn,
      price: best.minPrice,
      supplier: best.bestRow.supplier,
      po: best.bestRow.po,
      products: best.products,
      partNumberCount: best.partNumberCount,
    };

    if (blocked.length > 0) {
      return {
        ...row,
        status: "blocked by rule",
        rule: {
          id: blocked[0].id,
          text: blocked[0].text,
          kind: blocked[0].kind,
        },
      };
    }

    return { ...row, status: statusFor(best.products) };
  });

  const summary = summarize(planned);
  const result: PlanResult = {
    product: { name, description },
    needs: planned,
    summary,
    note: PLAN_NOTE,
  };

  const caller = callerOf(req);
  logActivity({
    ...caller,
    tool: "plan_product",
    product: name,
    detail: {
      description: name,
      productName: name,
      needsChecked: summary.total,
      needsCovered: summary.covered,
      newPartsNeeded: summary.projectedNewPartNumbers,
    },
    summary: `Planned ${name}: ${headline(summary)}`,
  });

  return NextResponse.json(result, { headers });
}
