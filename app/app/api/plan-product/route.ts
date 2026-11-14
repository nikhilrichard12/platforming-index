import { NextRequest, NextResponse } from "next/server";
import { loadVoltaraData } from "@/lib/voltaraData.server";
import { matchCandidates } from "@/lib/matcher";
import { corsHeaders, preflight } from "@/lib/cors";
import { blockingRules, logActivity } from "@/lib/rules.server";
import { callerOf } from "@/lib/sources.server";
import { originFromText, sourceFrom } from "@/lib/origin";
import {
  NEED_CAP,
  PLAN_FLOOR,
  PLAN_NOTE,
  PlanResult,
  PlannedNeed,
  headline,
  keepFragment,
  splitFragments,
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
    /** Page text, read by the panel. Parsed rather than trusted as a list. */
    text?: string;
    /** A badge scan: answer, but leave no trace in the activity log. */
    quiet?: boolean;
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
  const pageText = String(body.text ?? "").trim();
  const data = loadVoltaraData();

  /**
   * A page is read, a list is trusted. Fragments from page text only count as
   * a need when the matcher recognises them or they read like a component, so
   * navigation and prose do not become requirements.
   */
  const considered = pageText ? splitFragments(pageText).slice(0, 120) : [];
  const fromPage = considered
    .filter((fragment) => {
      const best = matchCandidates(data, fragment.text, 0, 1)[0];
      return keepFragment(fragment, best?.confidence ?? 0);
    })
    .map((f) => f.text)
    .slice(0, NEED_CAP);

  const needs =
    given.length > 0
      ? given.slice(0, NEED_CAP)
      : pageText
      ? fromPage
      : splitNeeds(description).slice(0, NEED_CAP);

  if (needs.length === 0 && !pageText) {
    return NextResponse.json(
      {
        error: "nothing to check",
        hint: "Pass needs as a list, or a description with one need per line.",
      },
      { status: 400, headers }
    );
  }

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
      origin: best.bestRow.origin,
      po: best.bestRow.po,
      products: best.products,
      partNumberCount: best.partNumberCount,
    };

    if (blocked.length > 0) {
      // A rule about origin is answered by the same part from a compliant
      // supplier, so the concept does not have to carry a new part number.
      const originRule = blocked.find((r) => r.kind === "compliance_or_origin");
      const wanted = originRule ? originFromText(originRule.text) : null;
      const part = data.parts.find((p) => p.name === best.name);
      const complianceSource =
        wanted && part ? sourceFrom(part, wanted) ?? undefined : undefined;

      return {
        ...row,
        status: "blocked by rule",
        complianceSource,
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
    // What the reader looked at, so a page that yields nothing can show it.
    considered: considered.slice(0, 12).map((f) => f.text),
  };

  if (body.quiet) {
    return NextResponse.json(result, { headers });
  }

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
