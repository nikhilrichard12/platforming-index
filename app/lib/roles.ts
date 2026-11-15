import { Role } from "./types";

export interface RoleConfig {
  emphasis: string;
  /** One sentence on why a duplicate part number matters to this role. */
  ballparkWhy: string;
  kpiFocus: string[];
  suggestedQuestions: string[];
  agentGreeting: (name?: string) => string;
}

const configs: Record<Role, RoleConfig> = {
  "CEO": {
    emphasis: "Portfolio-level complexity and strategic optionality",
    ballparkWhy:
      "Every duplicate part number is a small tax on launch speed, and it compounds across the portfolio you are judged on.",
    kpiFocus: ["Time to market", "Cost", "Complexity"],
    suggestedQuestions: [
      "Which product families have the highest complexity risk?",
      "What is the board-level case for platforming investment?",
      "How does our complexity index compare to industry benchmarks?",
    ],
    agentGreeting: () =>
      "I've loaded Voltara's portfolio data and your profile. As CEO, I'll focus on strategic impact: where complexity is eroding margin, slowing launches, and limiting your next product generation.",
  },
  "CFO / Finance": {
    emphasis: "Cost exposure from part-number proliferation and working capital",
    ballparkWhy:
      "Duplicate part numbers are working capital you own twice and buying power you never use.",
    kpiFocus: ["Cost", "Complexity", "Time to market"],
    suggestedQuestions: [
      "What is the annual cost of carrying duplicate part numbers?",
      "How much working capital is tied up in low-volume SKUs?",
      "What savings are achievable in the first 12 months?",
    ],
    agentGreeting: () =>
      "I've loaded Voltara's spend data and your financial profile. I'll lead with cost and working capital exposure, with every figure traced to a source row or stated assumption.",
  },
  "Sales / Commercial": {
    emphasis: "Lead time and variant proliferation vs. customer demand",
    ballparkWhy:
      "Duplicate part numbers lengthen lead times on the variants customers least care about.",
    kpiFocus: ["Time to market", "Cost", "Complexity"],
    suggestedQuestions: [
      "Which variants do customers actually differentiate on?",
      "How does lead time compare across product families?",
      "What is the revenue at risk from long delivery windows?",
    ],
    agentGreeting: () =>
      "I've loaded Voltara's product and delivery data alongside your commercial profile. I'll focus on where complexity is creating lead time risk and limiting your ability to promise fast delivery.",
  },
  "Marketing / Product": {
    emphasis: "Portfolio coherence and market differentiation",
    ballparkWhy:
      "Duplicate part numbers are variants the market never asked for, carried at full cost.",
    kpiFocus: ["Time to market", "Complexity", "Cost"],
    suggestedQuestions: [
      "Which features are genuinely differentiated versus commodity?",
      "How many variants exist where customers see no difference?",
      "What would a modular product line look like for Voltara?",
    ],
    agentGreeting: () =>
      "I've loaded Voltara's portfolio data and your product profile. I'll focus on where the product line is coherent and where complexity is diluting the brand promise.",
  },
  "Engineering / R&D": {
    emphasis: "Part reuse, sustaining burden, and design-for-platform",
    ballparkWhy:
      "Duplicate part numbers are sustaining work your team repeats on parts that were already solved.",
    kpiFocus: ["Complexity", "Time to market", "Cost"],
    suggestedQuestions: [
      "Which assemblies have the highest potential for shared cores?",
      "How many sustaining engineering hours are tied to redundant parts?",
      "What is the engineering cost of adding one new part number?",
    ],
    agentGreeting: () =>
      "I've loaded Voltara's BOM data and your engineering profile. I'll focus on reuse opportunities, sustaining burden, and what a common-core architecture could look like.",
  },
  "Supply Chain / Procurement": {
    emphasis: "Supplier consolidation, price variance, and inventory efficiency",
    ballparkWhy:
      "Duplicate part numbers split volume across suppliers, so you pay several prices for one part.",
    kpiFocus: ["Cost", "Complexity", "Time to market"],
    suggestedQuestions: [
      "Which parts are bought from multiple suppliers at different prices?",
      "What is the savings from paying the lowest existing price on shared parts?",
      "Which suppliers could be consolidated without supply risk?",
    ],
    agentGreeting: () =>
      "I've loaded Voltara's purchase order data and your procurement profile. I'll focus on price variance, supplier consolidation, and the inventory cost of part proliferation.",
  },
  "Operations / Manufacturing": {
    emphasis: "Production complexity, changeover cost, and lead time drivers",
    ballparkWhy:
      "Duplicate part numbers mean more changeovers, more lines on the floor, and more ways to pick the wrong one.",
    kpiFocus: ["Time to market", "Cost", "Complexity"],
    suggestedQuestions: [
      "Which product families create the most production changeover?",
      "How does BOM depth correlate with manufacturing lead time?",
      "What is the operational cost of the current part-number count?",
    ],
    agentGreeting: () =>
      "I've loaded Voltara's BOM and lead time data alongside your operations profile. I'll focus on production complexity, changeover, and the manufacturing cost of part proliferation.",
  },
};

export function getRoleConfig(role: Role): RoleConfig {
  return configs[role];
}

export const ALL_ROLES = Object.keys(configs) as Role[];

/** The name a reader sees. No slashes: "CFO view", not "CFO / Finance view". */
const SHORT_NAME: Record<Role, string> = {
  CEO: "CEO",
  "CFO / Finance": "CFO",
  "Sales / Commercial": "Sales",
  "Marketing / Product": "Product",
  "Engineering / R&D": "Engineering",
  "Supply Chain / Procurement": "Supply chain",
  "Operations / Manufacturing": "Operations",
};

export function shortRole(role: Role | ""): string {
  return role ? SHORT_NAME[role] : "";
}

/* ---------- what each function carries ---------- */

import { FunctionName } from "./survey";
import { VoltaraData, usd } from "./voltaraData";

export interface FunctionFigure {
  /** The headline number, already formatted. */
  value: string;
  /** Where it came from, in words. */
  source: string;
}

export interface FunctionIdentity {
  function: FunctionName;
  /** The role this function reads the dashboard as. */
  role: Role;
  /** How this function counts complexity. */
  unit: string;
  /** The one figure that matters to them, in their own unit. */
  figure: (data: VoltaraData, score: number) => FunctionFigure;
  /** The same score, said in their unit. */
  meaning: (data: VoltaraData, score: number) => string;
}

export const FUNCTIONS: FunctionName[] = [
  "CEO",
  "CFO",
  "Engineering",
  "Supply chain",
  "Sales",
];

export const FUNCTION_IDENTITY: Record<FunctionName, FunctionIdentity> = {
  CEO: {
    function: "CEO",
    role: "CEO",
    unit: "index points",
    figure: (_d, score) => ({
      value: `${score} of 100`,
      source: "Parts list and survey",
    }),
    meaning: (d, score) =>
      `For the CEO, ${score} means ${score} of 100 and step ${d.index.step} of three.`,
  },
  CFO: {
    function: "CFO",
    role: "CFO / Finance",
    unit: "dollars a year",
    figure: (d) => ({
      value: usd(d.summary.yearlyPriceGapUsd),
      source: "Purchase history",
    }),
    meaning: (d, score) =>
      `For Finance, ${score} means ${usd(d.summary.yearlyPriceGapUsd)} a year.`,
  },
  Engineering: {
    function: "Engineering",
    role: "Engineering / R&D",
    unit: "engineering hours a year",
    figure: (d) => ({
      value: d.summary.sustainingHoursPerYear.toLocaleString("en-US"),
      source: "Product master",
    }),
    meaning: (d, score) =>
      `For Engineering, ${score} means ${d.summary.sustainingHoursPerYear.toLocaleString(
        "en-US"
      )} sustaining hours a year.`,
  },
  "Supply chain": {
    function: "Supply chain",
    role: "Supply Chain / Procurement",
    unit: "suppliers and part numbers",
    figure: (d) => ({
      value: `${d.summary.suppliers} and ${
        d.summary.partNumbers - d.summary.realParts
      }`,
      source: "Purchase history",
    }),
    meaning: (d, score) =>
      `For Supply chain, ${score} means ${d.summary.suppliers} suppliers and ${
        d.summary.partNumbers - d.summary.realParts
      } duplicate part numbers.`,
  },
  Sales: {
    function: "Sales",
    role: "Sales / Commercial",
    unit: "weeks of lead time",
    figure: (d) => ({
      value: `${d.summary.leadTimeWeeksMin} to ${d.summary.leadTimeWeeksMax}`,
      source: "Product master",
    }),
    meaning: (d, score) =>
      `For Sales, ${score} means ${d.summary.leadTimeWeeksMin} to ${d.summary.leadTimeWeeksMax} weeks of lead time.`,
  },
};
