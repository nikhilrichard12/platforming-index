import { CORE_PRODUCTS } from "./index";
import { groupParts, REVIEW, SAME, similarity } from "./similarity";
import { Part, PartRow, VoltaraFile } from "./voltaraData";

/**
 * Two ways to group 252 part numbers.
 *
 * "reviewed" is the grouping in data/derived/voltara_parts.json, where an
 * engineer has confirmed every merge. "matcher" is what lib/similarity.ts
 * reaches on its own, with no key and no person. Every figure that depends on
 * grouping — the index, the core count, the price gap — can be computed from
 * either, which is the point: the score is only as good as the matching
 * underneath it, and the dashboard can show both.
 */

export type GroupingId = "matcher" | "reviewed";

export const GROUPING_LABEL: Record<GroupingId, string> = {
  matcher: "Matcher only",
  reviewed: "After review",
};

export interface Grouping {
  id: GroupingId;
  /** Part numbers, clustered. Every one of the 252 appears exactly once. */
  groups: string[][];
}

/** A pair the matcher scored into the review band, for a person to confirm. */
export interface ReviewPair {
  a: string;
  b: string;
  descA: string;
  descB: string;
  score: number;
  reason: string;
  /** True when the reviewed data puts these two in the same group. */
  confirmed: boolean;
}

export function allRows(file: Pick<VoltaraFile, "parts">): PartRow[] {
  return file.parts.flatMap((p) => p.rows);
}

/** The grouping already in the file: the one an engineer confirmed. */
export function reviewedGrouping(file: Pick<VoltaraFile, "parts">): Grouping {
  return { id: "reviewed", groups: file.parts.map((p) => p.rows.map((r) => r.pn)) };
}

/**
 * What the matcher reaches on its own. 252 descriptions, every pair scored,
 * merged only where it says "same". This is O(n squared) on 252 rows, so it
 * runs once on the server and the result is passed down as data.
 */
export function matcherGrouping(file: Pick<VoltaraFile, "parts">): Grouping {
  const rows = allRows(file);
  const result = groupParts(rows.map((r) => ({ pn: r.pn, description: r.desc })));
  return { id: "matcher", groups: result.groups.map((g) => g.members) };
}

/** The merges the matcher left for a person: scored between 0.60 and 0.85. */
export function reviewQueue(file: Pick<VoltaraFile, "parts">): ReviewPair[] {
  const rows = allRows(file);
  const partOf = new Map<string, string>();
  file.parts.forEach((p) => p.rows.forEach((r) => partOf.set(r.pn, p.id)));

  const out: ReviewPair[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const s = similarity(rows[i].desc, rows[j].desc);
      if (s.score < REVIEW || s.score >= SAME) continue;
      out.push({
        a: rows[i].pn,
        b: rows[j].pn,
        descA: rows[i].desc,
        descB: rows[j].desc,
        score: s.score,
        reason: s.reasons[s.reasons.length - 1] ?? "",
        confirmed: partOf.get(rows[i].pn) === partOf.get(rows[j].pn),
      });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}

/**
 * The parts list as a grouping sees it. Prices, suppliers and products are
 * recomputed from the rows that landed in each group; the yearly price gap is
 * the volume behind every row times what it pays above the cheapest row in its
 * own group, which is the same arithmetic in both groupings.
 */
export function regroup(file: VoltaraFile, grouping: Grouping): VoltaraFile {
  if (grouping.id === "reviewed") return file;

  const rowOf = new Map<string, { row: PartRow; cat: string }>();
  file.parts.forEach((p) =>
    p.rows.forEach((r) => rowOf.set(r.pn, { row: r, cat: p.cat }))
  );

  const parts: Part[] = grouping.groups.map((members, i) => {
    const found = members.map((pn) => rowOf.get(pn)).filter(Boolean) as {
      row: PartRow;
      cat: string;
    }[];
    const rows = found.map((f) => f.row);
    const prices = rows.map((r) => r.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const products = new Set(rows.flatMap((r) => r.products));
    const suppliers = new Set(rows.map((r) => r.supplier));

    // Most common category among the rows, so a group reads as one kind.
    const cats = new Map<string, number>();
    found.forEach((f) => cats.set(f.cat, (cats.get(f.cat) ?? 0) + 1));
    const cat = [...cats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    return {
      id: `M${String(i + 1).padStart(3, "0")}`,
      // The longest description reads best as the group's name: an abbreviated
      // row is the same part written short.
      name: rows.reduce((best, r) => (r.desc.length > best.length ? r.desc : best), ""),
      cat,
      products: products.size,
      min,
      max,
      spend: rows.reduce((n, r) => n + (r.spend ?? 0), 0),
      gap: Math.round(rows.reduce((n, r) => n + (r.qty ?? 0) * (r.price - min), 0)),
      suppliers: suppliers.size,
      rows,
    };
  });

  const summary = {
    ...file.summary,
    realParts: parts.length,
    sharedParts: parts.filter((p) => p.products >= 2).length,
    coreCandidates: parts.filter((p) => p.products >= CORE_PRODUCTS).length,
    uniqueParts: parts.filter((p) => p.products < 2).length,
    yearlyPriceGapUsd: parts.reduce((n, p) => n + p.gap, 0),
    multiSupplierParts: parts.filter((p) => p.suppliers > 1).length,
  };

  return { ...file, parts, summary };
}

/**
 * The same price gap arithmetic applied to a grouping, so the two groupings
 * can be compared without the stored figure's method getting in the way.
 */
export function priceGapOf(file: VoltaraFile, grouping: Grouping): number {
  if (grouping.id === "reviewed") {
    return file.parts.reduce(
      (n, p) =>
        n +
        Math.round(
          p.rows.reduce((m, r) => m + (r.qty ?? 0) * (r.price - p.min), 0)
        ),
      0
    );
  }
  return regroup(file, grouping).summary.yearlyPriceGapUsd;
}
