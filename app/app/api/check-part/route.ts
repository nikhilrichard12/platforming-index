import { NextRequest, NextResponse } from "next/server";
import { loadVoltaraData } from "@/lib/voltaraData.server";
import { headNoun, matchCandidates } from "@/lib/matcher";
import { corsHeaders, preflight } from "@/lib/cors";
import { Rule } from "@/lib/rules";
import { blockingRules, listRules, logActivity } from "@/lib/rules.server";
import { callerOf } from "@/lib/sources.server";

export const runtime = "nodejs";

/** Above this, the card stands on its own. Below the floor, say nothing. */
const CONFIDENT = 0.6;
const POSSIBLE = 0.35;

export interface Alternative {
  name: string;
  partNumber: string;
  price: number;
  supplier: string;
  products: number;
}

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

/**
 * Substitutes for a blocked part: same head noun, so a fan is only replaced by
 * a fan and never by a fan guard, and not itself blocked for this product.
 */
function alternativesFor(
  data: ReturnType<typeof loadVoltaraData>,
  blockedName: string,
  product: string
): Alternative[] {
  const noun = headNoun(blockedName);
  if (!noun) return [];
  const blocked = new Set(listRules(product).map((r: Rule) => r.appliesToPart));

  return data.parts
    .filter(
      (p) =>
        p.name !== blockedName && !blocked.has(p.name) && headNoun(p.name) === noun
    )
    .sort((a, b) => b.products - a.products || a.min - b.min)
    .slice(0, 3)
    .map((p) => {
      const best = p.rows.reduce((lo, r) => (r.price < lo.price ? r : lo), p.rows[0]);
      return {
        name: p.name,
        partNumber: best.pn,
        price: best.price,
        supplier: best.supplier,
        products: p.products,
      };
    });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  let body: { description?: string; product?: string; unitsPerYear?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ match: null, error: "bad_json" }, { status: 400, headers });
  }

  const description = (body.description ?? "").trim();
  const product = (body.product ?? "").trim();
  const units = Number.isFinite(body.unitsPerYear) ? Number(body.unitsPerYear) : 0;
  if (!description) {
    return NextResponse.json({ match: null, level: "none", candidates: [] }, { headers });
  }

  const data = loadVoltaraData();
  const candidates = matchCandidates(data, description, units, 3);
  const best = candidates[0] ?? null;
  const confidence = best?.confidence ?? 0;

  const level =
    confidence >= CONFIDENT ? "match" : confidence >= POSSIBLE ? "possible" : "none";

  const blockedBy = best && level === "match" ? blockingRules(best.name, product) : [];
  const alternatives =
    blockedBy.length > 0 && best ? alternativesFor(data, best.name, product) : [];

  const caller = callerOf(req);
  logActivity({
    ...caller,
    tool: "check_part",
    product: product || undefined,
    detail: {
      description,
      level,
      blocked: blockedBy.length > 0,
      partName: best && level === "match" ? best.name : undefined,
      partNumbers:
        best && level === "match"
          ? best.rows.map((r) => ({ pn: r.pn, product: r.products[0] }))
          : undefined,
      recommendedPn: best && level === "match" ? best.bestRow.pn : undefined,
      minPrice: best && level === "match" ? best.minPrice : undefined,
      savingUsd: best && level === "match" ? best.yearlySavingVsHighest : undefined,
      po: best && level === "match" ? best.bestRow.po : undefined,
      candidates: level === "possible" ? candidates.map((c) => c.name) : undefined,
      ruleText: blockedBy[0]?.text,
    },
    summary:
      level === "match"
        ? blockedBy.length > 0
          ? `Checked "${description}": ${best!.name} blocked by a rule`
          : `Checked "${description}": reuse ${best!.bestRow.pn}`
        : level === "possible"
        ? `Checked "${description}": ${candidates.length} possible match${candidates.length === 1 ? "" : "es"}`
        : `Checked "${description}": no match`,
  });

  return NextResponse.json(
    {
      match: level === "match" ? best : null,
      level,
      confidence,
      candidates: level === "possible" ? candidates : [],
      blockedBy: blockedBy.length > 0 ? blockedBy : null,
      alternatives,
      product,
      unitsPerYear: units,
    },
    { headers }
  );
}
