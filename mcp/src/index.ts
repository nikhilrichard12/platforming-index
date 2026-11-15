#!/usr/bin/env node
/**
 * PlatInform MCP server.
 *
 * The reuse decision happens while an engineer designs, not when procurement
 * raises a part number. Every team runs a different NPD or PLM system but
 * every team now runs an agent, so the check is delivered here: any agent can
 * call it from inside whatever tool the engineer is already using.
 *
 * This server holds no data. It calls the PlatInform app, which owns
 * the parts data, the rules, and the index.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.PLATFORMING_INDEX_URL ?? "http://localhost:3000").replace(/\/$/, "");

/* ---------- products ---------- */

const PRODUCTS: Record<string, string> = {
  "VRK-1000": "RackLine 1 kVA Rack UPS",
  "VRK-3000": "RackLine 3 kVA Rack UPS",
  "VMX-20": "ModuLine 20 kW Modular UPS",
  "VSI-5": "SunLine 5 kW Solar Inverter",
  "VSI-10": "SunLine 10 kW Solar Inverter",
  "VBS-50": "StorLine 50 kWh Battery Cabinet",
};

/** Engineers say "the battery cabinet", not "VBS-50". Accept both. */
function toProductId(input: string): string {
  const raw = (input ?? "").trim();
  const upper = raw.toUpperCase();
  if (PRODUCTS[upper]) return upper;

  const needle = raw.toLowerCase();
  for (const [id, name] of Object.entries(PRODUCTS)) {
    if (name.toLowerCase() === needle) return id;
  }
  for (const [id, name] of Object.entries(PRODUCTS)) {
    if (needle && (name.toLowerCase().includes(needle) || needle.includes(name.toLowerCase()))) {
      return id;
    }
  }
  // "battery cabinet", "modular ups", "solar inverter", "rack ups"
  const words = needle.split(/\s+/).filter((w) => w.length > 3);
  if (words.length) {
    for (const [id, name] of Object.entries(PRODUCTS)) {
      const hay = name.toLowerCase();
      if (words.every((w) => hay.includes(w))) return id;
    }
  }
  return upper || raw;
}

const productField = z
  .string()
  .describe(
    "Which product the part is for. A product id (VRK-1000, VRK-3000, VMX-20, VSI-5, VSI-10, VBS-50) or its name, for example 'StorLine 50 kWh Battery Cabinet' or 'battery cabinet'."
  );

/* ---------- formatting ---------- */

/**
 * The one money format, the same as the app's lib/voltaraData.ts:
 * two decimals under $1,000, no decimals above, K at ten thousand, M at a
 * million. A unit price and a yearly total read the same way everywhere.
 */
const usd = (n: number): string => {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e6) return sign + "$" + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e4) return sign + "$" + Math.round(v / 1e3).toLocaleString("en-US") + "K";
  if (v >= 1e3) return sign + "$" + Math.round(v).toLocaleString("en-US");
  return sign + "$" + v.toFixed(2);
};

const px = usd;

/** Country of origin is data. The adjective is only for the sentence. */
const ORIGIN_ADJECTIVE: Record<string, string> = {
  "United States": "US",
  Mexico: "Mexican",
  Germany: "German",
  "Czech Republic": "Czech",
  Taiwan: "Taiwanese",
  Vietnam: "Vietnamese",
};

const originAdjective = (origin: string) => ORIGIN_ADJECTIVE[origin] ?? origin;

const date = (iso: string) => (iso ?? "").slice(0, 10);

/** Plain answer first, the JSON after it for the agent to read if it wants. */
function reply(text: string, data: unknown) {
  return {
    content: [
      { type: "text" as const, text },
      { type: "text" as const, text: "```json\n" + JSON.stringify(data, null, 2) + "\n```" },
    ],
  };
}

function failure(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

/**
 * The app logs who called. The client name comes from the MCP initialize
 * handshake, so the dashboard can show "Claude Code" rather than "an agent".
 */
function agentName(): string {
  return server.server.getClientVersion()?.name ?? "Agent";
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-pi-source": "agent",
      "x-pi-agent": agentName(),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(body?.error ?? `${path} returned ${res.status}`);
  return body;
}

const SUGGESTION_NOTE = "A match is a suggestion until engineering confirms fit.";

/* ---------- types the app returns ---------- */

interface Match {
  name: string;
  partNumberCount: number;
  products: number;
  bestRow: {
    pn: string;
    products: string[];
    supplier: string;
    origin: string;
    price: number;
    po: string;
  };
  minPrice: number;
  maxPrice: number;
  yearlySavingVsHighest: number;
  confidence: number;
}
interface Rule {
  id: string;
  at: string;
  scope: { product: string };
  kind: string;
  text: string;
  appliesToPart: string;
}
interface Alternative {
  name: string;
  partNumber: string;
  price: number;
  supplier: string;
  origin: string;
  products: number;
}
interface OriginSource {
  supplier: string;
  origin: string;
  partNumber: string;
  price: number;
  po: string;
}
interface CheckResponse {
  match: Match | null;
  level: "match" | "possible" | "none";
  confidence: number;
  candidates: Match[];
  blockedBy: Rule[] | null;
  complianceSource: OriginSource | null;
  alternatives: Alternative[];
}

/* ---------- server ---------- */

const server = new McpServer({ name: "platforming-index", version: "0.1.0" });

interface PlannedNeed {
  need: string;
  status: "in core" | "shared" | "exists, unique" | "blocked by rule" | "new part needed";
  confidence: number;
  part?: string;
  partNumber?: string;
  price?: number;
  supplier?: string;
  po?: string;
  origin?: string;
  products?: number;
  rule?: { id: string; text: string; kind: string };
  complianceSource?: {
    supplier: string;
    origin: string;
    partNumber: string;
    price: number;
    po: string;
  };
}
interface PlanResponse {
  product: { name: string; description: string };
  needs: PlannedNeed[];
  summary: {
    total: number;
    byStatus: Record<string, number>;
    covered: number;
    coveredPercent: number;
    projectedNewPartNumbers: number;
  };
  note: string;
}

/** A concept has no product id yet, so keep its name unless it names a real product. */
function toProductRef(input: string): string {
  const raw = (input ?? "").trim();
  const id = toProductId(raw);
  return PRODUCTS[id] ? id : raw;
}

server.registerTool(
  "plan_product",
  {
    title: "Check a product concept against the existing core",
    description:
      "Call this when the user describes a new product, a concept, or a list of requirements, before any part is chosen. Call check_part later for each individual part. Each matched need carries an origin field with the country of origin: use that field for any origin, compliance or tariff question, and never infer a country from a supplier name.",
    inputSchema: {
      product_name: z
        .string()
        .describe("What the concept is called, for example 'VBS-30 Outdoor Battery Cabinet'."),
      description: z
        .string()
        .optional()
        .describe(
          "The concept in the user's own words. One need per line, or a comma separated list. Used when needs is not given."
        ),
      needs: z
        .array(z.string())
        .optional()
        .describe(
          "The functions or parts the product needs, in plain words, for example ['120mm cooling fan', 'DC link capacitor', 'enclosure latch']."
        ),
    },
  },
  async ({ product_name, description, needs }) => {
    const ref = toProductRef(product_name);
    const res = await api<PlanResponse>("/api/plan-product", {
      method: "POST",
      body: JSON.stringify({
        product_name: ref,
        description: description ?? "",
        needs: needs ?? [],
      }),
    });

    const s = res.summary;
    const lines = res.needs
      .map((n) => {
        const evidence =
          n.status === "new part needed"
            ? "no match in the parts data"
            : n.status === "blocked by rule"
            ? `${n.part}, blocked by ${n.rule?.id}: "${n.rule?.text}"` +
              (n.complianceSource
                ? ` Same part, ${originAdjective(n.complianceSource.origin)}-origin source: ${n.complianceSource.supplier}, ${px(n.complianceSource.price)} (${n.complianceSource.partNumber})`
                : "")
            : `${n.part}, ${n.partNumber} at ${px(n.price ?? 0)} from ${n.supplier}, origin ${n.origin}, [${n.po}], in ${n.products} products`;
        return `  - ${n.need}: ${n.status}, ${evidence}`;
      })
      .join("\n");

    return reply(
      `${s.covered} of ${s.total} needs already exist at Voltara. ` +
        `${s.byStatus["in core"] ?? 0} ${(s.byStatus["in core"] ?? 0) === 1 ? "sits" : "sit"} in the common core, ${s.byStatus["shared"] ?? 0} shared by two to four products, ` +
        `${s.byStatus["exists, unique"] ?? 0} exist on one product only. ` +
        `${s.projectedNewPartNumbers} would need ${s.projectedNewPartNumbers === 1 ? "a new part number" : "new part numbers"}, which is ${100 - s.coveredPercent} percent of the concept.\n\n` +
        `${lines}\n\n` +
        `Start from the ${s.covered} that exist and design the rest around them. Call check_part for each part once the engineer picks one. ` +
        `${res.note} ${SUGGESTION_NOTE}`,
      res
    );
  }
);

server.registerTool(
  "check_part",
  {
    title: "Check whether this part already exists",
    description:
      "Call this before specifying, designing in, or requesting any component, so the engineer reuses an existing part when one exists. Returns the matching part Voltara already buys, how many part numbers it already carries, the best price and supplier, the yearly saving against the highest price paid, and the part number to reuse. Every purchase row carries an origin field with the country of origin: use that field when the question is about origin, compliance, tariffs or sourcing, and never infer a country from a supplier name. If a rule from an earlier exception blocks that part for this product, returns the rule, a compliant source for the same part when one exists, and alternative parts.",
    inputSchema: {
      description: z
        .string()
        .describe("The component as the engineer would write it, for example 'Fan, axial, 120 mm, 24 VDC'."),
      product: productField,
      unitsPerYear: z
        .number()
        .optional()
        .describe("Expected annual volume. Used to size the saving. Defaults to 1000."),
    },
  },
  async ({ description, product, unitsPerYear }) => {
    const productId = toProductId(product);
    const units = unitsPerYear ?? 1000;
    const res = await api<CheckResponse>("/api/check-part", {
      method: "POST",
      body: JSON.stringify({ description, product: productId, unitsPerYear: units }),
    });

    if (!res.match) {
      if (res.level === "possible" && res.candidates.length) {
        const list = res.candidates
          .map((c) => `  - ${c.name}, ${c.partNumberCount} part numbers, best price ${px(c.minPrice)}`)
          .join("\n");
        return reply(
          `Not sure yet from "${description}". Possible matches:\n${list}\n\n` +
            `Ask the engineer for the rating or the size before suggesting a reuse. ${SUGGESTION_NOTE}`,
          res
        );
      }
      return reply(
        `No part in Voltara's data matches "${description}". Nothing to reuse, so a new part number is reasonable here. ${SUGGESTION_NOTE}`,
        { match: null, product: productId }
      );
    }

    const m = res.match;
    if (res.blockedBy?.length) {
      const rule = res.blockedBy[0];
      const compliant = res.complianceSource;
      const sameSource = compliant
        ? `Same part, ${originAdjective(compliant.origin)}-origin source: ${compliant.supplier}, ${px(compliant.price)} (${compliant.partNumber}) [${compliant.po}]. ` +
          `That satisfies the rule without a new part number, only a different source.\n\n`
        : "";
      const alts = res.alternatives.length
        ? "Alternatives that no rule blocks:\n" +
          res.alternatives
            .map(
              (a) =>
                `  - ${a.name}, ${a.partNumber} at ${px(a.price)} from ${a.supplier}, origin ${a.origin}, already in ${a.products} products`
            )
            .join("\n")
        : "No approved alternative yet. Request a new part and note the rule.";
      return reply(
        `${m.name} is blocked for ${productId} by a rule set on ${date(rule.at)}: "${rule.text}"\n\n` +
          `Do not suggest reusing it here. ${sameSource}${alts}\n\n` +
          `${SUGGESTION_NOTE}`,
        res
      );
    }

    return reply(
      `Voltara already buys this part: ${m.name}.\n\n` +
        `It carries ${m.partNumberCount} part numbers today. The best price paid is ${px(m.minPrice)} from ${m.bestRow.supplier}, country of origin ${m.bestRow.origin} [${m.bestRow.po}], against ${px(m.maxPrice)} at the worst. ` +
        `At ${units.toLocaleString("en-US")} units a year that gap is worth ${usd(m.yearlySavingVsHighest)}.\n\n` +
        `Reuse ${m.bestRow.pn} rather than raising a new number. A new number would make ${m.partNumberCount + 1} part numbers for one part.\n\n` +
        `${SUGGESTION_NOTE}`,
      res
    );
  }
);

server.registerTool(
  "record_decision",
  {
    title: "Record what the engineer decided",
    description:
      "Call this when the engineer accepts or declines a suggested part. If they decline, ask why and pass the reason. A declined suggestion becomes a rule for that product and that part, so nobody is asked the same question again. Declining never lowers the PlatInform score.",
    inputSchema: {
      description: z.string().describe("The component the engineer asked for."),
      product: productField,
      decision: z
        .enum(["reuse", "exception"])
        .describe("'reuse' if they accepted the existing part, 'exception' if they declined it."),
      matchedPart: z
        .string()
        .optional()
        .describe("The part name check_part returned. Needed for an exception to become a rule."),
      suggestedPn: z.string().optional().describe("The part number check_part suggested."),
      reasonKind: z
        .enum(["compliance_or_origin", "customer_requirement", "technical_fit", "other"])
        .optional()
        .describe("Required for an exception. Why the existing part cannot be used."),
      reasonText: z
        .string()
        .optional()
        .describe("The engineer's own words. This becomes the rule text other engineers read."),
      role: z.string().optional().describe("The engineer's function, if known."),
    },
  },
  async (args) => {
    if (args.decision === "exception" && !args.reasonKind) {
      return failure(
        "An exception needs a reason. Ask the engineer why the existing part will not work and pass reasonKind as one of: compliance_or_origin, customer_requirement, technical_fit, other."
      );
    }
    const productId = toProductId(args.product);
    const res = await api<{ recorded: { id: string }; rule: Rule | null }>("/api/part-decision", {
      method: "POST",
      body: JSON.stringify({ ...args, product: productId, source: "mcp" }),
    });

    if (res.rule) {
      return reply(
        `Recorded. New rule ${res.rule.id} for ${productId}: "${res.rule.text}" applies to ${res.rule.appliesToPart}. ` +
          `Anyone checking that part for ${productId} now sees this rule instead of the suggestion. ` +
          `The Complexity Index does not drop: complexity a rule requires is not complexity anyone chose.`,
        res
      );
    }
    return reply(
      `Recorded as ${res.recorded.id}. ${args.decision === "reuse" ? "Reuse noted against this product." : "No rule created, because no matched part was supplied."}`,
      res
    );
  }
);

server.registerTool(
  "get_rules",
  {
    title: "List the rules in force",
    description:
      "Call this to see which parts are already ruled out, and why, before suggesting anything. Each rule came from an engineer declining a suggestion. Newest first.",
    inputSchema: {
      product: z.string().optional().describe("Limit to one product. Omit for every rule."),
    },
  },
  async ({ product }) => {
    const query = product ? `?product=${encodeURIComponent(toProductId(product))}` : "";
    const res = await api<{ rules: Rule[] }>(`/api/rules${query}`);
    if (res.rules.length === 0) {
      return reply(
        "No rules in force. Nothing has been ruled out yet, so every suggestion stands on the data alone.",
        res
      );
    }
    const lines = res.rules
      .map((r) => `  - ${r.scope.product}: ${r.appliesToPart} is ruled out. "${r.text}" (${r.kind.replace(/_/g, " ")}, set ${date(r.at)})`)
      .join("\n");
    return reply(`${res.rules.length} rule${res.rules.length === 1 ? "" : "s"} in force:\n${lines}`, res);
  }
);

server.registerTool(
  "get_index",
  {
    title: "Get the Complexity Index",
    description:
      "Call this when someone asks how the product line is doing overall, how complex it is, or how far along platforming is. Returns the score out of 100, what it means, the four dimensions behind it, which of the three steps the company is on, and the headline part and spend numbers.",
    inputSchema: {},
  },
  async () => {
    const res = await api<{
      index: { score: number; status: string; step: number; dimensions: { name: string; score: number; basis: string }[] };
      summary: Record<string, number>;
      read: string;
      steps: string[];
    }>("/api/index");

    const dims = res.index.dimensions.map((d) => `  - ${d.name}: ${d.score}. ${d.basis}`).join("\n");
    const s = res.summary;
    return reply(
      `Complexity Index ${res.index.score} of 100, ${res.index.status}. ${res.read}\n\n` +
        `Four dimensions, equal weights:\n${dims}\n\n` +
        `Voltara is on step ${res.index.step} of three: ${res.steps[res.index.step - 1]}.\n\n` +
        `Behind it: ${s.partNumbers} part numbers describe ${s.realParts} real parts, ${s.sharedParts} of them shared across products and ${s.coreCandidates} in five or more. ` +
        `Yearly parts spend ${usd(s.yearlySpendUsd)}, with ${usd(s.yearlyPriceGapUsd)} of price gap on shared parts. ` +
        `${s.needsReviewLines} lines still need engineering review.`,
      res
    );
  }
);

server.registerTool(
  "open_dashboard",
  {
    title: "Get the dashboard link",
    description:
      "Call this when the engineer wants to see the whole picture rather than one part: the score, the parts list, where the functions disagree, and the decisions recorded so far.",
    inputSchema: {},
  },
  async () => {
    const url = `${BASE}/dashboard`;
    return reply(
      `${url}\n\nThe dashboard shows the Complexity Index with its four dimensions, the four numbers that matter to your function, the yearly price gap by part, every part with its duplicate part numbers, where the functions disagree, and the rules and decisions recorded so far.`,
      { url }
    );
  }
);

await server.connect(new StdioServerTransport());
