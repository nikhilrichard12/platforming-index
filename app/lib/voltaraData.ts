export interface PartRow {
  pn: string;
  desc: string;
  products: string[];
  price: number;
  supplier: string;
  /** Country of origin, joined from voltara_suppliers.csv by engine/add_origin.py. */
  origin: string;
  po: string;
}

export interface Part {
  id: string;
  name: string;
  cat: string;
  products: number;
  min: number;
  max: number;
  spend: number;
  gap: number;
  suppliers: number;
  rows: PartRow[];
}

export interface IndexDimension {
  name: string;
  score: number;
  basis: string;
  source: string;
}

export interface VoltaraFile {
  company: string;
  period: string;
  note: string;
  summary: {
    partNumbers: number;
    realParts: number;
    sharedParts: number;
    coreCandidates: number;
    uniqueParts: number;
    yearlySpendUsd: number;
    yearlyPriceGapUsd: number;
    needsReviewLines: number;
    suppliers: number;
    multiSupplierParts: number;
    partNumbersReusedAcrossProducts: number;
    sustainingHoursPerYear: number;
    leadTimeWeeksMin: number;
    leadTimeWeeksMax: number;
  };
  index: { score: number; status: string; dimensions: IndexDimension[]; step: number };
  parts: Part[];
  suppliers: { name: string; origin: string }[];
}

/** Everything the UI and the prompt read, derived once from the file. */
export interface VoltaraData extends VoltaraFile {
  byGap: Part[];
  reviewRows: { part: Part; row: PartRow }[];
  rowsByPo: Record<string, { part: Part; row: PartRow }>;
}

export const PRODUCT_MASTER = [
  { id: "VRK-1000", name: "RackLine 1 kVA Rack UPS", units: 18000, leadWeeks: 3, hours: 1800 },
  { id: "VRK-3000", name: "RackLine 3 kVA Rack UPS", units: 9500, leadWeeks: 4, hours: 2100 },
  { id: "VMX-20", name: "ModuLine 20 kW Modular UPS", units: 1200, leadWeeks: 10, hours: 3400 },
  { id: "VSI-5", name: "SunLine 5 kW Solar Inverter", units: 14000, leadWeeks: 3, hours: 1600 },
  { id: "VSI-10", name: "SunLine 10 kW Solar Inverter", units: 6000, leadWeeks: 4, hours: 1900 },
  { id: "VBS-50", name: "StorLine 50 kWh Battery Cabinet", units: 450, leadWeeks: 14, hours: 2900 },
];

export const SOURCE_FILES = {
  boms: "voltara_boms.csv",
  spend: "voltara_spend_cube.csv",
  products: "voltara_product_master.csv",
};

export function isReviewRow(row: PartRow): boolean {
  return /SEE DWG/i.test(row.desc);
}

export function findPart(data: VoltaraData, fragment: string): Part {
  const hit = data.parts.find((p) => p.name.toLowerCase().includes(fragment.toLowerCase()));
  if (!hit) throw new Error(`No part matching "${fragment}" in voltara_parts.json`);
  return hit;
}

/** Shape the raw file into the lookups the UI and the prompt read. */
export function deriveVoltaraData(raw: VoltaraFile): VoltaraData {
  const byGap = [...raw.parts].sort((a, b) => b.gap - a.gap);

  const reviewRows: { part: Part; row: PartRow }[] = [];
  const rowsByPo: Record<string, { part: Part; row: PartRow }> = {};
  for (const part of raw.parts) {
    for (const row of part.rows) {
      rowsByPo[row.po] = { part, row };
      if (isReviewRow(row)) reviewRows.push({ part, row });
    }
  }

  return { ...raw, byGap, reviewRows, rowsByPo };
}

/* Formatting, shared by the dashboard and the prompt. */

/**
 * The one money formatter. A unit price and a yearly total are the same kind
 * of number to a reader, so they are written the same way everywhere: the
 * dashboard, the cards, the popover, the prompt, the extension and the MCP
 * replies all call this.
 *
 *   $3.95        under $1,000, two decimals
 *   $781.89
 *   $1,355       $1,000 and above, no decimals
 *   $31K         $10,000 and above
 *   $1.13M       $1,000,000 and above
 */
export function usd(n: number): string {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1_000_000) return sign + "$" + (v / 1_000_000).toFixed(2) + "M";
  if (v >= 10_000)
    return sign + "$" + Math.round(v / 1_000).toLocaleString("en-US") + "K";
  if (v >= 1_000) return sign + "$" + Math.round(v).toLocaleString("en-US");
  return sign + "$" + v.toFixed(2);
}

/**
 * Heat tint for table cells, heat-low to heat-high, as in the tariff table.
 * t is 0 to 1 against the largest value in the column.
 */
const HEAT_LOW = [0x5e, 0x35, 0x36];
const HEAT_HIGH = [0xd9, 0x59, 0x5c];

export function heatColor(t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const [r, g, b] = HEAT_LOW.map((lo, i) => Math.round(lo + (HEAT_HIGH[i] - lo) * k));
  return `rgb(${r} ${g} ${b})`;
}

/** Kept as a name for prices. Same formatter: one money format, one shape. */
export const px = usd;

/** A price span, printed once when both ends round to the same figure. */
export function priceSpan(min: number, max: number): string {
  const lo = usd(min);
  const hi = usd(max);
  return lo === hi ? lo : `${lo} to ${hi}`;
}
