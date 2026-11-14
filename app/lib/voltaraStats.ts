// Numbers derived from voltara_boms.csv and voltara_spend_cube.csv.
// All figures cite the source file and row count.

export const VOLTARA_STATS = {
  bomLines: 262,
  distinctPartNumbers: 252,
  productCount: 6,
  poCount: 1109,
  totalYearlySpendUsd: 39_300_000,
  // source metadata for popovers
  sources: {
    bom: { file: "voltara_boms.csv", rows: 262 },
    spend: { file: "voltara_spend_cube.csv", rows: 1109 },
    products: { file: "voltara_product_master.csv", rows: 6 },
  },
};

export const PRODUCTS_DATA = [
  { id: "VRK-1000", name: "RackLine 1 kVA Rack UPS", family: "Rack UPS", bomLines: 41, leadTimeWeeks: 3 },
  { id: "VRK-3000", name: "RackLine 3 kVA Rack UPS", family: "Rack UPS", bomLines: 43, leadTimeWeeks: 4 },
  { id: "VMX-20",   name: "ModuLine 20 kW Modular UPS", family: "Modular UPS", bomLines: 45, leadTimeWeeks: 10 },
  { id: "VSI-5",    name: "SunLine 5 kW Solar Inverter", family: "Solar Inverter", bomLines: 44, leadTimeWeeks: 3 },
  { id: "VSI-10",   name: "SunLine 10 kW Solar Inverter", family: "Solar Inverter", bomLines: 46, leadTimeWeeks: 4 },
  { id: "VBS-50",   name: "StorLine 50 kWh Battery Cabinet", family: "Battery Storage", bomLines: 43, leadTimeWeeks: 14 },
];
