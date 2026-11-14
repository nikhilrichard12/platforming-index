import { NextRequest, NextResponse } from "next/server";
import { loadVoltaraData } from "@/lib/voltaraData.server";
import { matchPart } from "@/lib/matcher";
import { corsHeaders, preflight } from "@/lib/cors";
import { Rule } from "@/lib/rules";
import { blockingRules, listRules } from "@/lib/rules.server";

export const runtime = "nodejs";

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
 * Other parts in the same category that no rule blocks for this product.
 * Most widely shared first, then cheapest, because an engineer picking a
 * replacement wants the one already proven across the line.
 */
function alternativesFor(
  data: ReturnType<typeof loadVoltaraData>,
  categoryOf: string,
  excludeName: string,
  product: string
): Alternative[] {
  const blocked = new Set(
    listRules(product).map((r: Rule) => r.appliesToPart)
  );
  return data.parts
    .filter(
      (p) =>
        p.cat === categoryOf && p.name !== excludeName && !blocked.has(p.name)
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
  if (!description) return NextResponse.json({ match: null }, { headers });

  const data = loadVoltaraData();
  const match = matchPart(data, description, units);

  if (!match) {
    return NextResponse.json({ match: null, product, unitsPerYear: units }, { headers });
  }

  // A rule set by an earlier exception outranks the suggestion.
  const blockedBy = blockingRules(match.name, product);
  const part = data.parts.find((p) => p.name === match.name);
  const alternatives =
    blockedBy.length > 0 && part
      ? alternativesFor(data, part.cat, match.name, product)
      : [];

  return NextResponse.json(
    {
      match,
      blockedBy: blockedBy.length > 0 ? blockedBy : null,
      alternatives,
      product,
      unitsPerYear: units,
    },
    { headers }
  );
}
