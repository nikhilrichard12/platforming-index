export type Role =
  | "CEO"
  | "CFO / Finance"
  | "Sales / Commercial"
  | "Marketing / Product"
  | "Engineering / R&D"
  | "Supply Chain / Procurement"
  | "Operations / Manufacturing";

export type DecisionLevel = "I decide" | "I influence" | "I execute";

export type Metric =
  | "Revenue"
  | "Margin"
  | "On-time launch"
  | "Cost"
  | "Inventory / working capital"
  | "Quality"
  | "Lead time"
  | "Nothing on complexity";

export type Product =
  | "RackLine 1 kVA Rack UPS"
  | "RackLine 3 kVA Rack UPS"
  | "ModuLine 20 kW Modular UPS"
  | "SunLine 5 kW Solar Inverter"
  | "SunLine 10 kW Solar Inverter"
  | "StorLine 50 kWh Battery Cabinet";

export type ArchitectureOwner =
  | "Nobody"
  | "Engineering"
  | "Product"
  | "Cross-functional group"
  | "Not sure";

export type PlatformingBlocker =
  | "Engineering effort"
  | "Ownership"
  | "Incentives"
  | "Customer demands"
  | "Lack of data";

export interface UserProfile {
  role: Role | "";
  decisionLevel: DecisionLevel | "";
  products: Product[];
  metrics: Metric[];
  // beliefs
  customersNeedEveryVariant: number; // 1-5
  architectureOwner: ArchitectureOwner | "";
  measuredOnComplexity: "Yes" | "Partly" | "No" | "";
  checksForExistingPart: number; // 1-5
  biggestBlocker: PlatformingBlocker | "";
  // optional
  currentDecision: string;
}

export const EMPTY_PROFILE: UserProfile = {
  role: "",
  decisionLevel: "",
  products: [],
  metrics: [],
  customersNeedEveryVariant: 0,
  architectureOwner: "",
  measuredOnComplexity: "",
  checksForExistingPart: 0,
  biggestBlocker: "",
  currentDecision: "",
};

export const PRODUCTS: Product[] = [
  "RackLine 1 kVA Rack UPS",
  "RackLine 3 kVA Rack UPS",
  "ModuLine 20 kW Modular UPS",
  "SunLine 5 kW Solar Inverter",
  "SunLine 10 kW Solar Inverter",
  "StorLine 50 kWh Battery Cabinet",
];

export const ROLES: Role[] = [
  "CEO",
  "CFO / Finance",
  "Sales / Commercial",
  "Marketing / Product",
  "Engineering / R&D",
  "Supply Chain / Procurement",
  "Operations / Manufacturing",
];

export const METRICS: Metric[] = [
  "Revenue",
  "Margin",
  "On-time launch",
  "Cost",
  "Inventory / working capital",
  "Quality",
  "Lead time",
  "Nothing on complexity",
];
