import { Part } from "./voltaraData";

/**
 * The design tokens, in hex, for the places that cannot use a Tailwind class:
 * anime.js colour tweens and SVG stroke attributes. Keep in step with
 * tailwind.config.ts and docs/design/DESIGN.md.
 */
export const TOKEN = {
  surface: "#191A1B",
  panel: "#242728",
  panel2: "#303436",
  line: "#2F3234",
  line2: "#6A7275",
  text: "#FFFFFF",
  text2: "#B8BBBE",
  text3: "#818182",
  accent: "#EC5E31",
  positive: "#59C376",
  warn: "#F5C042",
  risk: "#E5484D",
} as const;

function channel(hex: string, i: number) {
  return parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
}

/** Straight RGB mix, used only between two tokens so nothing leaves the palette. */
export function mixHex(from: string, to: string, t: number): string {
  const v = [0, 1, 2].map((i) =>
    Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * t)
  );
  return `#${v.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Six muted product tints, walked from text-3 to text-2. They have to be
 * separable from each other without reading as six new colours, because the
 * only colour that carries meaning on these screens is accent.
 */
export const PRODUCT_TINTS = [0, 1, 2, 3, 4, 5].map((i) =>
  mixHex(TOKEN.text3, TOKEN.text2, i / 5)
);

export type LayerId =
  | "enclosure"
  | "control"
  | "power"
  | "storage"
  | "thermal"
  | "io";

/** Top to bottom in the exploded stack. */
export const LAYERS: { id: LayerId; name: string }[] = [
  { id: "enclosure", name: "Enclosure and chassis" },
  { id: "control", name: "Control" },
  { id: "power", name: "Power stage" },
  { id: "storage", name: "Energy storage" },
  { id: "thermal", name: "Thermal" },
  { id: "io", name: "I/O and hardware" },
];

const POWER_ELECTRONICS = /igbt|capacitor|gate driver|bleeder|shunt|mppt/i;
const IO_ELECTRICAL = /terminal|lug|gland|grommet/i;

/** Which layer a part sits in, from its category and its name. */
export function layerOf(part: Pick<Part, "cat" | "name">): LayerId {
  switch (part.cat) {
    case "Mechanical":
      return "enclosure";
    case "Energy storage":
      return "storage";
    case "Thermal":
      return "thermal";
    case "Hardware":
    case "Cable":
      return "io";
    case "Magnetics":
      return "power";
    case "Electrical":
      return IO_ELECTRICAL.test(part.name) ? "io" : "power";
    case "Electronics":
      return POWER_ELECTRONICS.test(part.name) ? "power" : "control";
    default:
      return "io";
  }
}

export type ShareState = "core" | "shared" | "unique";

/** Core candidate at five or more products, matching the index definition. */
export function shareState(products: number): ShareState {
  if (products >= 5) return "core";
  if (products >= 2) return "shared";
  return "unique";
}

export const SHARE_COLOR: Record<ShareState, string> = {
  core: TOKEN.accent,
  shared: TOKEN.text,
  unique: TOKEN.text3,
};

export const SHARE_LABEL: Record<ShareState, string> = {
  core: "Used by five or more products",
  shared: "Used by two to four",
  unique: "Unique to this product",
};

/** Keywords that place a need in a layer when no part matched it. */
const LAYER_WORDS: [LayerId, RegExp][] = [
  ["storage", /\b(batter|cell|lfp|vrla|energy storage|pack)\b/i],
  ["thermal", /\b(fan|heatsink|heat sink|thermal|cooling|cold plate|hvac|duct|guard|pad)\b/i],
  ["enclosure", /\b(cabinet|enclosure|chassis|frame|sled|rack|door|housing|bracket)\b/i],
  ["control", /\b(board|dsp|controller|sensor|display|lcd|modbus|rs485|snmp|ethernet|wifi|telemetry|gateway|bms|monitor|supply)\b/i],
  ["power", /\b(igbt|capacitor|busbar|contactor|inverter|converter|breaker|fuse|relay|varistor|mov|emi|inductor|transformer|mppt|shunt|resistor|driver|power)\b/i],
  ["io", /\b(connector|cable|harness|ribbon|terminal|lug|gland|screw|nut|washer|standoff|tie|gasket|grommet|switch|port)\b/i],
];

/**
 * The layer a need belongs to. A matched need uses the part's own category;
 * an unmatched one is placed by the words the engineer wrote.
 */
export function layerOfNeed(text: string, part?: { cat: string; name: string }): LayerId {
  if (part) return layerOf(part);
  for (const [id, pattern] of LAYER_WORDS) {
    if (pattern.test(text)) return id;
  }
  return "io";
}
