import { Role } from "./types";

export interface RoleConfig {
  emphasis: string;
  kpiFocus: string[];
  suggestedQuestions: string[];
  agentGreeting: (name?: string) => string;
}

const configs: Record<Role, RoleConfig> = {
  "CEO": {
    emphasis: "Portfolio-level complexity and strategic optionality",
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
