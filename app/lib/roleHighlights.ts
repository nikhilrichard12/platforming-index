import { Role } from "./types";
import { ROLE_VIEWS, RoleKpi } from "./roleViews";
import { VoltaraData } from "./voltaraData";

/**
 * Which existing metrics each role sees first. The survey's role question
 * decides the group, it is fixed for the session, and every group reads the
 * same data and the same layout: only which metrics lead changes. Nothing here
 * computes a number. Each tile is a KPI that roleViews.ts already defines.
 */

export type RoleGroup = "ceo" | "cfo" | "engineering" | "sales";

/** The seven survey roles, folded into the four groups a dashboard leads with. */
const GROUP_OF: Record<Role, RoleGroup> = {
  CEO: "ceo",
  "CFO / Finance": "cfo",
  // Procurement leads with what Finance leads with: price gap, spend, suppliers.
  "Supply Chain / Procurement": "cfo",
  "Engineering / R&D": "engineering",
  "Operations / Manufacturing": "engineering",
  "Sales / Commercial": "sales",
  "Marketing / Product": "sales",
};

export function groupOf(role: Role): RoleGroup {
  return GROUP_OF[role];
}

/** ?role= on the dashboard URL, for demos. It overrides the survey role. */
const PARAM_ROLE: Record<string, Role> = {
  cfo: "CFO / Finance",
  engineering: "Engineering / R&D",
  sales: "Sales / Commercial",
  ceo: "CEO",
};

export function roleFromParam(value: string | null): Role | "" {
  return value ? PARAM_ROLE[value.toLowerCase()] ?? "" : "";
}

/**
 * The three KPI tiles each group leads with, by the label roleViews.ts gives
 * them. The CEO keeps the three the dashboard has always opened on.
 */
const TILES: Record<RoleGroup, string[]> = {
  ceo: [
    "Yearly price gap on shared parts",
    "Duplicate part numbers carried",
    "One capacitor, three suppliers",
  ],
  cfo: [
    "Yearly price gap on shared parts", // annual price gap
    "Yearly parts spend in scope", // spend exposure
    "Parts with two or more suppliers", // purchasing fragmentation
  ],
  engineering: [
    "Part numbers versus real parts", // shared parts
    "Parts that fit a common core", // reuse across products
    "Lines waiting for your review", // items needing engineering review
  ],
  sales: [
    "Products kept in the plan", // product-line coverage
    "Shared parts customers never see", // existing options across the portfolio
    "Parts unique to one product",
  ],
};

/**
 * The tiles for a group. A label no role view defines is skipped, not
 * invented, so a renamed metric shrinks the row instead of showing a made-up one.
 */
export function tilesFor(group: RoleGroup, data: VoltaraData): RoleKpi[] {
  const all = Object.values(ROLE_VIEWS).flatMap((v) => v.kpis(data));
  return TILES[group]
    .map((label) => all.find((k) => k.label === label))
    .filter((k): k is RoleKpi => !!k);
}

/** Things on the page, besides the tiles, a group's own metrics live in. They read brighter; nothing is boxed. */
export type Emphasis =
  | "score" // the overall platforming score
  | "dimensions" // the four-dimension breakdown
  | "alignment" // the Alignment tab: where leadership agrees and disagrees
  | "interfaces" // how much of a new product starts from an existing interface
  | "shared" // the Inventory filter for shared parts
  | "review"; // the Inventory filter for lines needing engineering review

const EMPHASIS: Record<RoleGroup, Emphasis[]> = {
  ceo: ["score", "dimensions", "alignment"],
  cfo: [],
  engineering: ["interfaces", "shared", "review"],
  sales: [],
};

export function emphasisFor(group: RoleGroup): Set<Emphasis> {
  return new Set(EMPHASIS[group]);
}
