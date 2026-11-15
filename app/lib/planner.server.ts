import { loadInterfaces, loadVoltaraData } from "./voltaraData.server";
import { matchCandidates } from "./matcher";
import { matchInterface } from "./interfaces";
import { blockingRules } from "./rules.server";
import { originFromText, sourceFrom } from "./origin";
import {
  DISPLAY_FLOOR,
  Landing,
  PlannedNeed,
  shorthandScore,
  statusFor,
  worthShowing,
} from "./plan";
import { Part } from "./voltaraData";

/** The cheapest row of a part, for a match the shorthand pass found. */
function cheapest(part: Part) {
  const row = part.rows.reduce((lo, r) => (r.price < lo.price ? r : lo), part.rows[0]);
  return {
    pn: row.pn,
    products: row.products,
    supplier: row.supplier,
    origin: row.origin,
    price: row.price,
    po: row.po,
  };
}

/**
 * Where a list of needs lands against what the company already has. One
 * implementation, used by POST /api/plan-product and by the interface
 * benchmark on GET /api/index, so the two can never disagree.
 */
export function planNeeds(product: string, needs: string[]): PlannedNeed[] {
  const data = loadVoltaraData();
  const interfaces = loadInterfaces();

  return needs.map((need) => {
    const strict = matchCandidates(data, need, 0, 1)[0] ?? null;

    // A page is written by a person, not copied from the catalogue. When the
    // strict matcher finds nothing, the shorthand pass looks for the name
    // under the noun: "gate driver 6ch" is the gate driver board.
    // A mid-band match has to share a rating or real words, not just a noun.
    const showable = strict ? worthShowing(need, strict.name) : false;
    let best = showable ? strict : null;
    let confidence = showable ? (strict?.confidence ?? 0) : 0;
    if (confidence < DISPLAY_FLOOR) {
      let found: { part: Part; score: number } | null = null;
      for (const candidate of data.parts) {
        const score = shorthandScore(need, candidate.name);
        if (score > (found?.score ?? 0)) found = { part: candidate, score };
      }
      if (found && found.score >= DISPLAY_FLOOR) {
        confidence = found.score;
        best = {
          name: found.part.name,
          partNumberCount: found.part.rows.length,
          products: found.part.products,
          bestRow: cheapest(found.part),
          minPrice: found.part.min,
          maxPrice: found.part.max,
          yearlySavingVsHighest: 0,
          confidence: found.score,
          matchedTokens: [],
          rows: found.part.rows,
        };
      }
    }

    // A part worth showing is a part worth drawing, so the floor for both is
    // the review band, not the confident one.
    const part =
      best && confidence >= DISPLAY_FLOOR
        ? data.parts.find((p) => p.name === best!.name)
        : undefined;

    // Interface first, then part, then nothing: designing to an interface
    // brings its brackets, harness, firmware and tests with it, which a part
    // on its own does not. A part that belongs to an interface lights it even
    // when the words on the page say nothing about the boundary.
    const hit =
      matchInterface(need, interfaces, part) ??
      (part
        ? (() => {
            const owner = interfaces.find((i) => i.parts.includes(part.id));
            return owner
              ? {
                  interface: owner,
                  agreed: [],
                  why: `${part.name} is part of the ${owner.name}`,
                }
              : null;
          })()
        : null);
    const iface = hit
      ? {
          id: hit.interface.id,
          name: hit.interface.name,
          subsystem: hit.interface.subsystem,
          spec: hit.interface.spec,
          products: hit.interface.products,
          since: hit.interface.since,
          inherits: hit.interface.inherits,
          why: hit.why,
        }
      : undefined;
    const landing: Landing = iface ? "interface" : part ? "part" : "new";

    if (!best || !part) {
      return { need, status: "new part needed", confidence, landing, iface };
    }

    // The same rules an engineer would meet at design time.
    const blocked = blockingRules(best.name, product);
    const row = {
      need,
      confidence,
      landing,
      iface,
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
}
