import { Role } from "./types";
import { VoltaraData, findPart, priceSpan, px, usd } from "./voltaraData";

/**
 * Ported from docs/design/reference-prototype.html: four role lenses, four
 * numbers each, every number with the question it asks and the answer it gets.
 * Answers are plain text with [POxxxxxx] evidence tags, rendered by the same
 * formatter as live assistant replies.
 */

export type RoleKey = "cfo" | "eng" | "supply" | "sales";

export interface RoleKpi {
  value: string;
  label: string;
  source: string;
  question: string;
  answer: (d: VoltaraData) => string;
}

export interface RoleView {
  name: string;
  lens: string;
  beliefs: string;
  suggested: string[];
  kpis: (d: VoltaraData) => RoleKpi[];
}

/** The seven survey roles map onto the four ported lenses. */
const ROLE_KEYS: Record<Role, RoleKey> = {
  CEO: "cfo",
  "CFO / Finance": "cfo",
  "Engineering / R&D": "eng",
  "Operations / Manufacturing": "eng",
  "Supply Chain / Procurement": "supply",
  "Sales / Commercial": "sales",
  "Marketing / Product": "sales",
};

export function roleKeyFor(role: Role | ""): RoleKey {
  return role ? ROLE_KEYS[role] : "cfo";
}

const cite = (po: string) => `[${po}]`;

function priceGapAnswer(d: VoltaraData): string {
  const top3 = d.byGap.slice(0, 3);
  const gap = d.summary.yearlyPriceGapUsd;
  const spend = d.summary.yearlySpendUsd;
  const first = top3[0];
  return [
    `Voltara buys the same part at different prices depending on which product line orders it. If every line paid the lowest price Voltara already gets, spend drops by ${usd(gap)} a year, ${((gap / spend) * 100).toFixed(1)}% of ${usd(spend)}.`,
    `Largest gaps: ${top3.map((g) => `${g.name} (${usd(g.gap)})`).join(", ")}. ${cite(first.rows[0].po)} ${cite(first.rows[first.rows.length - 1].po)}`,
    `This is a gap, not booked savings. Capturing it needs supplier negotiation and engineering sign-off.`,
  ].join("\n\n");
}

export const ROLE_VIEWS: Record<RoleKey, RoleView> = {
  cfo: {
    name: "Finance",
    lens: "cash, spend, margin and payback. Speak in dollars per year.",
    beliefs:
      "Customers do not need every variant. Engineering owns architecture decisions. Nobody is measured on complexity.",
    suggested: [
      "Where is the biggest price gap?",
      "What would it take to capture the price gap?",
      "Which of these numbers are still assumptions?",
    ],
    kpis: (d) => {
      const cap = findPart(d, "dc link capacitor");
      const fan = findPart(d, "axial fan");
      const dupes = d.summary.partNumbers - d.summary.realParts;
      return [
        {
          value: usd(d.summary.yearlyPriceGapUsd),
          label: "Yearly price gap on shared parts",
          source: "voltara_spend_cube.csv",
          question: `Why is the yearly price gap on shared parts ${usd(d.summary.yearlyPriceGapUsd)}?`,
          answer: priceGapAnswer,
        },
        {
          value: String(dupes),
          label: "Duplicate part numbers carried",
          source: "voltara_boms.csv",
          question: `Why do we carry ${dupes} duplicate part numbers, and what do they cost?`,
          answer: () =>
            [
              `${d.summary.partNumbers} part numbers describe ${d.summary.realParts} real parts, so ${dupes} are duplicates. Each one has its own stock, orders, and records.`,
              `The yearly cost per duplicate depends on your carrying cost. That stays an assumption until finance sets it.`,
              `Example: one fan has ${fan.rows.length} part numbers. ${fan.rows.slice(0, 3).map((r) => cite(r.po)).join(" ")}`,
            ].join("\n\n"),
        },
        {
          value: priceSpan(cap.min, cap.max),
          label: "One capacitor, three suppliers",
          source: "voltara_spend_cube.csv",
          question: "Why do we pay three different prices for the DC link capacitor?",
          answer: () =>
            [
              `The ${cap.name} comes from ${cap.suppliers} suppliers. ${cap.rows.map((r) => `${r.products.join(" and ")} pays ${px(r.price)} at ${r.supplier}`).join("; ")}.`,
              `Moving all volume to the lowest price closes a ${usd(cap.gap)} yearly gap on this one part. ${cap.rows.slice(0, 4).map((r) => cite(r.po)).join(" ")}`,
            ].join("\n\n"),
        },
        {
          value: usd(d.summary.yearlySpendUsd),
          label: "Yearly parts spend in scope",
          source: "voltara_spend_cube.csv",
          question: `What makes up the ${usd(d.summary.yearlySpendUsd)} yearly parts spend?`,
          answer: () =>
            [
              `${usd(d.summary.yearlySpendUsd)} covers every purchase order for the six products across ${d.period}, including spare and warranty buys.`,
              `${d.summary.sharedParts} of ${d.summary.realParts} parts are shared across products. Those carry the ${usd(d.summary.yearlyPriceGapUsd)} price gap.`,
            ].join("\n\n"),
        },
      ];
    },
  },

  eng: {
    name: "Engineering",
    lens: "engineering hours, part count, validation effort and design reuse.",
    beliefs:
      "Customers do not need every variant. Nobody owns architecture decisions. Nobody is measured on complexity.",
    suggested: [
      "Which parts fit a common core?",
      "What do I need to review?",
      "Why does one fan have six part numbers?",
    ],
    kpis: (d) => {
      const fan = findPart(d, "axial fan");
      const hours = d.summary.sustainingHoursPerYear;
      return [
        {
          value: `${hours.toLocaleString("en-US")} hrs`,
          label: "Sustaining hours per year",
          source: "voltara_product_master.csv",
          question: `Where do the ${hours.toLocaleString("en-US")} sustaining hours a year go?`,
          answer: () =>
            [
              `The six products log ${hours.toLocaleString("en-US")} sustaining hours a year. The modular UPS takes the most at 3,400. [product_master]`,
              `Every duplicate part number adds drawings, qualifications, and change orders. The data does not split hours by cause, so the share tied to duplicates is unknown.`,
            ].join("\n\n"),
        },
        {
          value: `${d.summary.partNumbers} to ${d.summary.realParts}`,
          label: "Part numbers versus real parts",
          source: "voltara_boms.csv",
          question: `Why do ${d.summary.partNumbers} part numbers map to only ${d.summary.realParts} real parts?`,
          answer: () =>
            [
              `Each product team numbered and named parts its own way. ${d.summary.partNumbers} part numbers describe ${d.summary.realParts} real parts.`,
              `Example: ${fan.name} appears under ${fan.rows.length} part numbers. ${fan.rows.slice(0, 3).map((r) => cite(r.po)).join(" ")}`,
            ].join("\n\n"),
        },
        {
          value: String(d.summary.coreCandidates),
          label: "Parts that fit a common core",
          source: "voltara_boms.csv",
          question: `Which ${d.summary.coreCandidates} parts fit a common core, and why?`,
          answer: () =>
            [
              `${d.summary.coreCandidates} parts appear in five or six of the six products, including the control board, gate driver, auxiliary power supply, heatsink, and fan.`,
              `Those are the first candidates for a shared core on the next generation. Each needs an engineering check that one spec covers every product. ${fan.rows.slice(0, 2).map((r) => cite(r.po)).join(" ")}`,
            ].join("\n\n"),
        },
        {
          value: String(d.summary.needsReviewLines),
          label: "Lines waiting for your review",
          source: "voltara_boms.csv",
          question: `Which ${d.summary.needsReviewLines} lines need engineering review, and why?`,
          answer: () =>
            [
              `${d.summary.needsReviewLines} parts list lines on the battery cabinet say only "SEE DWG". Text matching cannot confirm those, so a person checks the drawing.`,
              `Until you approve them they stay out of every savings figure. ${d.reviewRows.slice(0, 3).map((x) => cite(x.row.po)).join(" ")}`,
            ].join("\n\n"),
        },
      ];
    },
  },

  supply: {
    name: "Supply chain",
    lens: "suppliers, pooled volume, unit price and negotiation leverage.",
    beliefs:
      "Customers do not need every variant. Nobody owns architecture decisions. Nobody is measured on complexity.",
    suggested: [
      "Where should I negotiate first?",
      "Why does the battery cabinet pay more?",
      "Which parts have the most suppliers?",
    ],
    kpis: (d) => {
      const fan = findPart(d, "axial fan");
      const cap = findPart(d, "dc link capacitor");
      const premium = Math.round((fan.max / fan.min - 1) * 100);
      return [
        {
          value: usd(d.summary.yearlyPriceGapUsd),
          label: "Yearly price gap to negotiate",
          source: "voltara_spend_cube.csv",
          question: `Where does the ${usd(d.summary.yearlyPriceGapUsd)} price gap come from, and where should I negotiate first?`,
          answer: priceGapAnswer,
        },
        {
          value: `${premium}%`,
          label: "Premium paid by the smallest line",
          source: "voltara_spend_cube.csv",
          question: `Why does the smallest product line pay ${premium}% more for the same fan?`,
          answer: () =>
            [
              `The battery cabinet buys the ${fan.name} at ${px(fan.max)}. The 1 kVA rack UPS buys the same fan at ${px(fan.min)}. ${cite(fan.rows[0].po)} ${cite(fan.rows[fan.rows.length - 1].po)}`,
              `The cabinet orders small volumes under its own part number, so it never gets the pooled price.`,
            ].join("\n\n"),
        },
        {
          value: `${d.summary.multiSupplierParts} of ${d.summary.realParts}`,
          label: "Parts with two or more suppliers",
          source: "voltara_spend_cube.csv",
          question: `Why are ${d.summary.multiSupplierParts} of ${d.summary.realParts} parts bought from more than one supplier?`,
          answer: () =>
            [
              `${d.summary.multiSupplierParts} of the ${d.summary.realParts} real parts come from more than one supplier, mostly because each product team sourced separately.`,
              `Pooling volume under one part number gives one negotiation per part. ${cap.rows.slice(0, 3).map((r) => cite(r.po)).join(" ")}`,
            ].join("\n\n"),
        },
        {
          value: String(d.summary.suppliers),
          label: "Suppliers in scope",
          source: "voltara_spend_cube.csv",
          question: "Which suppliers carry the most spend?",
          answer: () =>
            [
              `${d.summary.suppliers} suppliers serve the six products across ${d.period}.`,
              `Consolidating duplicate part numbers concentrates volume with fewer of them, part by part.`,
            ].join("\n\n"),
        },
      ];
    },
  },

  sales: {
    name: "Sales",
    lens: "lead time, product variety and what customers will notice.",
    beliefs:
      "Customers need every variant. Product management owns architecture decisions. Nobody is measured on complexity.",
    suggested: [
      "Will any product or option go away?",
      "How does this affect lead time?",
      "What stays unique to each product?",
    ],
    kpis: (d) => {
      const fan = findPart(d, "axial fan");
      const { leadTimeWeeksMin: lo, leadTimeWeeksMax: hi } = d.summary;
      return [
        {
          value: String(d.summary.uniqueParts),
          label: "Parts unique to one product",
          source: "voltara_boms.csv",
          question: "Which parts stay unique to one product, and does consolidation touch them?",
          answer: () =>
            [
              `${d.summary.uniqueParts} of ${d.summary.realParts} parts belong to a single product: enclosures, battery packs, MPPT boards. Those carry the differences customers see.`,
              `Consolidation targets the other ${d.summary.sharedParts}, such as screws, fans, and control boards.`,
            ].join("\n\n"),
        },
        {
          value: String(d.summary.sharedParts),
          label: "Shared parts customers never see",
          source: "voltara_boms.csv",
          question: `What are the ${d.summary.sharedParts} shared parts, and would a customer notice a change?`,
          answer: () =>
            [
              `${d.summary.sharedParts} parts appear in two or more products. They are internal components such as fans, fuses, terminal blocks, and hardware.`,
              `Changing their part numbers or supplier does not change what you sell. ${fan.rows.slice(0, 2).map((r) => cite(r.po)).join(" ")}`,
            ].join("\n\n"),
        },
        {
          value: `${lo} to ${hi} wks`,
          label: "Lead time across the line",
          source: "voltara_product_master.csv",
          question: `Why does lead time run from ${lo} to ${hi} weeks across the line?`,
          answer: () =>
            [
              `Lead time runs from ${lo} weeks on the rack UPS to ${hi} weeks on the battery cabinet. [product_master]`,
              `The cabinet waits on parts it orders in small lots under its own numbers. Pooled stock shortens that wait. The size of the improvement is not in the data yet.`,
            ].join("\n\n"),
        },
        {
          value: "6 of 6",
          label: "Products kept in the plan",
          source: "voltara_product_master.csv",
          question: "Does this plan remove any product or option?",
          answer: () =>
            [
              `The plan keeps all six products. Step 1 changes what Voltara pays. Step 2 changes part numbers. Neither changes what you sell.`,
              `Step 3 applies to the next generation, where new variants start from a shared core.`,
            ].join("\n\n"),
        },
      ];
    },
  },
};

export function roleViewFor(role: Role | ""): RoleView {
  return ROLE_VIEWS[roleKeyFor(role)];
}
