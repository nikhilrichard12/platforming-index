import { loadInterfaces, loadVoltaraData } from "./voltaraData.server";
import { matchCandidates } from "./matcher";
import { matchInterface } from "./interfaces";
import { blockingRules } from "./rules.server";
import { originFromText, sourceFrom } from "./origin";
import { Landing, PLAN_FLOOR, PlannedNeed, statusFor } from "./plan";

/**
 * Where a list of needs lands against what the company already has. One
 * implementation, used by POST /api/plan-product and by the interface
 * benchmark on GET /api/index, so the two can never disagree.
 */
export function planNeeds(product: string, needs: string[]): PlannedNeed[] {
  const data = loadVoltaraData();
  const interfaces = loadInterfaces();

  return needs.map((need) => {
    const best = matchCandidates(data, need, 0, 1)[0] ?? null;
    const confidence = best?.confidence ?? 0;
    const part =
      best && confidence >= PLAN_FLOOR
        ? data.parts.find((p) => p.name === best.name)
        : undefined;

    // Interface first, then part, then nothing: designing to an interface
    // brings its brackets, harness, firmware and tests with it, which a part
    // on its own does not.
    const hit = matchInterface(need, interfaces, part);
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

    if (!best || confidence < PLAN_FLOOR) {
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
