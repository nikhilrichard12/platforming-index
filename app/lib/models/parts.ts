import { Kit, Rig, toonRamp } from "./kit";
import { StageItem, buildPlanRig } from "./planStage";
import { TWINS, buildComponentRig, buildHeroRig } from "./product";

/**
 * What the 3D view shows for the part being looked at: that part alone.
 *
 * A part the inverter model has a component for (TWINS in product.ts) shows
 * that component. Every other part shows a plain shape chosen by what the part
 * is, so something always appears. Both are drawn from primitives and are
 * illustrations, not CAD, and the stage says which one it is showing.
 */

export interface StagePart {
  id: string;
  name: string;
  cat: string;
}

export interface StageSubject {
  /** The part's id in voltara_parts.json. A new key means a new model. */
  key: string;
  /** The part's name, for the label. */
  label: string;
  /** True when the inverter model has a component for it; false for a plain shape. */
  twin: boolean;
  /** The one line under the view. */
  caption: string;
  /** The part itself: a plain shape is chosen from its name and category. */
  part?: StagePart;
  /** Everything this page needs, drawn together, instead of one part. */
  plan?: StageItem[];
}

export function subjectFor(part: StagePart | undefined): StageSubject | null {
  if (!part) return null;
  const twin = part.id in TWINS;
  return {
    key: part.id,
    label: part.name,
    twin,
    caption: twin
      ? "Illustrative model of this part. Not CAD."
      : "Generic shape for this type of part. Not CAD.",
    part,
  };
}

/* ---------- plain shapes ---------- */

type Archetype =
  | "ribbon" | "header" | "fuse" | "holder" | "resistor" | "varistor" | "lug"
  | "relay" | "breaker" | "contactor" | "filter" | "psu"
  | "board" | "display" | "backplane" | "smallboard"
  | "hall" | "ntc" | "shunt" | "filmcap" | "battery"
  | "screw" | "nut" | "washer" | "tie" | "standoff" | "grommet" | "gasket" | "gland"
  | "chassis" | "enclosure" | "cabinet" | "rackframe" | "sled"
  | "pad" | "fanguard" | "hvac" | "module";

/**
 * Part name to shape, first match wins. Order matters: "Hot Swap Power Module
 * Sled" must be a sled before it can be a "module", "Cabinet Mount HVAC Unit"
 * an HVAC unit before a cabinet, and a battery pack before a battery
 * management board.
 */
const RULES: [RegExp, Archetype][] = [
  [/ribbon cable/i, "ribbon"],
  [/connector/i, "header"],
  [/fuse holder/i, "holder"],
  [/fuse/i, "fuse"],
  [/shunt/i, "shunt"],
  [/resistor/i, "resistor"],
  [/varistor|\bmov\b/i, "varistor"],
  [/\blug\b/i, "lug"],
  [/relay/i, "relay"],
  [/circuit breaker/i, "breaker"],
  [/contactor/i, "contactor"],
  [/emi filter/i, "filter"],
  [/power supply/i, "psu"],
  [/film capacitor/i, "filmcap"],
  [/hall effect|current sensor/i, "hall"],
  [/ntc|temperature sensor/i, "ntc"],
  [/lcd|display/i, "display"],
  [/backplane/i, "backplane"],
  [/battery (pack|module)/i, "battery"],
  [/wifi/i, "smallboard"],
  [/cabinet frame/i, "rackframe"],
  [/sled|hot swap/i, "sled"],
  [/hvac/i, "hvac"],
  [/cabinet/i, "cabinet"],
  [/chassis/i, "chassis"],
  [/enclosure/i, "enclosure"],
  [/card|board|controller|management|module/i, "board"],
  [/screw/i, "screw"],
  [/\bnut\b/i, "nut"],
  [/washer/i, "washer"],
  [/cable tie/i, "tie"],
  [/standoff/i, "standoff"],
  [/grommet/i, "grommet"],
  [/gasket/i, "gasket"],
  [/gland/i, "gland"],
  [/thermal pad/i, "pad"],
  [/fan guard/i, "fanguard"],
];

/** When no name rule matches, the part's category still picks something sensible. */
const BY_CATEGORY: Record<string, Archetype> = {
  Cable: "header",
  Electrical: "module",
  Electronics: "board",
  "Energy storage": "battery",
  Hardware: "screw",
  Magnetics: "module",
  Mechanical: "chassis",
  Thermal: "pad",
};

export function archetypeFor(part: StagePart): Archetype {
  for (const [re, a] of RULES) if (re.test(part.name)) return a;
  return BY_CATEGORY[part.cat] ?? "module";
}

type Build = (k: Kit, part: StagePart) => void;

/** n small boxes round a circle, for wire guards. */
function ringOfBoxes(k: Kit, n: number, r: number, y: number, size: number) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = k.box(size * 2.2, size, size, Math.cos(a) * r, y, Math.sin(a) * r, "light");
    b.rotation.y = -a + Math.PI / 2;
  }
}

/** How many pins a name says it has: "Signal 8 Pin Connector" is 8. */
function pinCount(name: string, fallback: number) {
  const m = name.match(/(\d+)\s*pin/i);
  return m ? Math.min(24, Math.max(2, parseInt(m[1], 10))) : fallback;
}

const SHAPES: Record<Archetype, Build> = {
  ribbon(k) {
    k.piece([0, -0.35, 0], () => {
      k.box(3.2, 0.04, 0.7, 0, 0.02, 0, "light");
      for (let i = 0; i < 10; i++) k.box(2.9, 0.05, 0.02, 0, 0.03, -0.3 + i * 0.067, "mid");
    });
    k.piece([0, 0.35, 0], () => {
      for (const s of [-1, 1]) k.box(0.36, 0.2, 0.85, s * 1.6, 0.12, 0, "dark");
    });
  },

  header(k, part) {
    const power = /50A|power/i.test(part.name);
    const n = pinCount(part.name, power ? 3 : 8);
    const gap = power ? 0.4 : 0.18;
    k.piece([0, -0.25, 0], () => k.box(n * gap + 0.3, 0.4, power ? 0.8 : 0.55, 0, 0.2, 0, "dark"));
    k.piece([0, 0.55, 0], () => {
      for (let i = 0; i < n; i++) k.cyl(power ? 0.1 : 0.045, 0.55, (i - (n - 1) / 2) * gap, 0.6, 0, "pale");
    });
  },

  fuse(k) {
    k.piece([-0.8, 0, 0], () => k.cyl(0.29, 0.3, -0.85, 0.3, 0, "light", "x"));
    k.piece([0.8, 0, 0], () => k.cyl(0.29, 0.3, 0.85, 0.3, 0, "light", "x"));
    k.piece([0, 0, 0], () => k.cyl(0.26, 1.5, 0, 0.3, 0, "pale", "x"));
    k.piece([0, 0.55, 0], () => k.cyl(0.03, 1.4, 0, 0.3, 0, "dark", "x"));
  },

  holder(k) {
    k.piece([0, -0.3, 0], () => k.box(1.2, 0.6, 1.0, 0, 0.3, 0, "mid"));
    k.piece([0, 0.5, 0], () => {
      k.cyl(0.38, 0.7, 0, 0.95, 0, "dark");
      k.cyl(0.42, 0.12, 0, 1.3, 0, "light");
    });
    k.piece([0, -0.8, 0], () => {
      for (const x of [-0.3, 0.3]) k.box(0.2, 0.3, 0.1, x, -0.1, 0, "pale");
    });
  },

  resistor(k) {
    k.piece([0, 0.2, 0], () => {
      k.cyl(0.3, 1.4, 0, 0.3, 0, "light", "x");
      for (const x of [-0.4, 0, 0.4]) k.cyl(0.31, 0.05, x, 0.3, 0, "dark", "x");
    });
    for (const s of [-1, 1]) k.piece([s * 0.55, 0, 0], () => k.cyl(0.04, 0.9, s * 1.15, 0.3, 0, "pale", "x"));
  },

  varistor(k) {
    k.piece([0, 0.3, 0], () => {
      k.cyl(0.6, 0.14, 0, 0.95, 0, "pale", "z");
      k.box(0.7, 0.3, 0.02, 0, 0.95, 0.08, "dark");
    });
    k.piece([0, -0.4, 0], () => {
      for (const x of [-0.25, 0.25]) k.cyl(0.035, 0.8, x, 0.4, 0, "light");
    });
  },

  lug(k) {
    k.piece([-0.5, 0, 0], () => k.cyl(0.2, 0.7, -0.55, 0.2, 0, "pale", "x"));
    k.piece([0.5, 0, 0], () => {
      k.cyl(0.5, 0.08, 0.5, 0.15, 0, "light");
      k.cyl(0.2, 0.09, 0.5, 0.155, 0, "dark");
    });
  },

  relay(k) {
    k.piece([0, -0.25, 0], () => k.box(1.1, 1.0, 1.1, 0, 0.5, 0, "dark"));
    k.piece([0, 0.55, 0], () => {
      for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]] as const) k.cyl(0.07, 0.2, x, 1.1, z, "pale");
    });
    k.piece([0, 0.95, 0], () => k.box(0.7, 0.02, 0.5, 0, 1.02, 0, "light"));
  },

  breaker(k) {
    k.piece([0, -0.3, 0], () => k.box(0.9, 1.6, 1.0, 0, 0.8, 0, "mid"));
    k.piece([0, 0.5, 0], () => {
      for (const x of [-0.2, 0.2]) k.box(0.25, 0.35, 0.2, x, 1.75, 0, "dark");
    });
    k.piece([0, 1.0, 0], () => {
      for (const x of [-0.2, 0.2]) k.cyl(0.08, 0.15, x, 1.7, 0.4, "pale");
    });
  },

  contactor(k) {
    k.piece([0, -0.3, 0], () => k.box(1.9, 1.5, 1.3, 0, 0.75, 0, "mid"));
    k.piece([0, 0.6, 0], () => k.box(0.9, 0.5, 0.8, 0, 1.75, 0, "dark"));
    k.piece([0, 1.1, 0], () => {
      for (const x of [-0.6, 0, 0.6]) for (const z of [-0.4, 0.4]) k.cyl(0.09, 0.15, x, 1.57, z, "pale");
    });
  },

  filter(k) {
    k.piece([0, -0.2, 0], () => k.box(2.0, 0.8, 1.1, 0, 0.4, 0, "dark"));
    for (const s of [-1, 1]) k.piece([s * 0.6, 0.2, 0], () => k.box(0.45, 0.4, 0.9, s * 1.1, 0.6, 0, "pale"));
  },

  psu(k) {
    k.piece([0, -0.25, 0], () => k.box(2.2, 0.9, 1.4, 0, 0.45, 0, "mid"));
    k.piece([0, 0.5, 0], () => {
      for (let i = 0; i < 5; i++) k.box(1.6, 0.02, 0.06, 0, 0.91, -0.45 + i * 0.2, "dark");
    });
    k.piece([0, 0, 0.7], () => k.box(1.6, 0.2, 0.2, 0, 0.3, 0.75, "pale"));
  },

  board(k) {
    k.piece([0, -0.35, 0], () => k.box(2.0, 0.06, 1.3, 0, 0.03, 0, "mid"));
    k.piece([0, 0.3, 0], () => {
      k.box(0.55, 0.09, 0.55, -0.3, 0.105, 0.05, "dark");
      for (const [x, z] of [[0.45, -0.3], [0.8, -0.3], [0.45, 0.2]] as const) k.box(0.3, 0.07, 0.28, x, 0.095, z, "dark");
    });
    k.piece([0, 0.05, 0.7], () => k.box(1.3, 0.14, 0.16, 0, 0.13, 0.55, "pale"));
  },

  smallboard(k) {
    SHAPES.board(k, { id: "", name: "", cat: "" });
    k.group.scale.setScalar(0.7);
  },

  display(k) {
    k.piece([0, -0.3, 0], () => k.box(2.0, 0.06, 1.3, 0, 0.03, 0, "mid"));
    k.piece([0, 0.1, 0], () => k.box(1.9, 0.08, 1.2, 0, 0.1, 0, "dark"));
    k.piece([0, 0.5, 0], () => {
      k.box(1.7, 0.03, 1.0, 0, 0.16, 0, "light");
      for (let i = 0; i < 4; i++) k.box(1.3, 0.035, 0.04, 0, 0.17, -0.3 + i * 0.2, "mid");
    });
  },

  backplane(k) {
    k.piece([0, -0.3, 0], () => k.box(3.4, 0.06, 1.0, 0, 0.03, 0, "mid"));
    k.piece([0, 0.4, 0], () => {
      for (let i = 0; i < 6; i++) k.box(0.4, 0.18, 0.5, -1.3 + i * 0.52, 0.15, 0, "pale");
    });
  },

  hall(k) {
    k.piece([0, 0.3, 0], () => {
      k.cyl(0.55, 0.35, 0, 0.3, 0, "dark");
      k.cyl(0.32, 0.37, 0, 0.3, 0, "pale");
    });
    k.piece([0.7, 0, 0], () => k.box(0.5, 0.35, 0.5, 0.75, 0.3, 0, "mid"));
    k.piece([0, -0.5, 0], () => {
      for (const z of [-0.15, 0, 0.15]) k.cyl(0.03, 0.5, 0.75, -0.05, z, "light");
    });
  },

  ntc(k) {
    k.piece([0, 0.4, 0], () => k.cyl(0.13, 0.35, 0, 1.0, 0, "dark"));
    k.piece([0, 0.1, 0], () => k.cyl(0.2, 0.5, 0, 0.65, 0, "pale"));
    k.piece([0, -0.4, 0], () => {
      for (const x of [-0.06, 0.06]) k.cyl(0.03, 0.9, x, 0.2, 0, "light");
    });
  },

  shunt(k) {
    k.piece([0, -0.3, 0], () => k.box(2.0, 0.14, 0.55, 0, 0.07, 0, "pale"));
    k.piece([0, 0.4, 0], () => {
      for (const x of [-0.65, 0.65]) k.cyl(0.14, 0.4, x, 0.34, 0, "light");
    });
    k.piece([0, 0.9, 0], () => {
      for (const x of [-0.25, 0.25]) k.cyl(0.03, 0.3, x, 0.22, 0.22, "dark");
    });
  },

  filmcap(k) {
    k.piece([0, 0.3, 0], () => {
      k.box(1.4, 0.9, 0.6, 0, 0.45, 0, "dark");
      k.box(0.9, 0.5, 0.02, 0, 0.45, 0.31, "light");
    });
    k.piece([0, -0.4, 0], () => {
      for (const x of [-0.5, 0.5]) k.cyl(0.05, 0.6, x, -0.2, 0, "pale");
    });
  },

  battery(k, part) {
    const big = /LFP|5kWh/i.test(part.name);
    k.group.scale.setScalar(big ? 1.25 : 1);
    k.piece([0, -0.25, 0], () => k.box(2.2, 1.2, 1.1, 0, 0.6, 0, "dark"));
    k.piece([0, 0.5, 0], () => {
      for (const x of [-0.7, 0.7]) k.cyl(0.14, 0.25, x, 1.3, 0.3, "pale");
    });
    k.piece([0, 0.9, 0], () => k.box(1.8, 0.02, 0.5, 0, 1.21, -0.2, "light"));
  },

  screw(k) {
    k.piece([0, 0.5, 0], () => {
      k.cyl(0.28, 0.16, 0, 1.38, 0, "light");
      k.box(0.4, 0.05, 0.06, 0, 1.47, 0, "dark");
    });
    k.piece([0, -0.2, 0], () => {
      k.cyl(0.12, 1.3, 0, 0.65, 0, "pale");
      for (let i = 0; i < 8; i++) k.cyl(0.135, 0.03, 0, 0.1 + i * 0.15, 0, "mid");
    });
  },

  nut(k) {
    k.piece([0, 0.3, 0], () => {
      k.cyl(0.45, 0.3, 0, 0.15, 0, "light", "y", 6);
      k.cyl(0.2, 0.31, 0, 0.15, 0, "dark");
    });
    k.piece([0, -0.3, 0], () => k.cyl(0.4, 0.04, 0, -0.1, 0, "mid"));
  },

  washer(k) {
    k.piece([0, 0.2, 0], () => {
      k.cyl(0.55, 0.08, 0, 0.04, 0, "pale");
      k.cyl(0.28, 0.09, 0, 0.045, 0, "dark");
    });
    k.piece([0, 0.55, 0], () => k.box(0.08, 0.1, 0.3, 0.42, 0.05, 0.05, "dark"));
  },

  tie(k) {
    k.piece([0, -0.2, 0], () => {
      k.box(2.4, 0.05, 0.2, 0, 0.03, 0, "light");
      for (let i = 0; i < 12; i++) k.box(0.02, 0.06, 0.2, -0.9 + i * 0.16, 0.06, 0, "mid");
    });
    k.piece([0, 0.4, 0], () => k.box(0.3, 0.22, 0.32, -1.25, 0.1, 0, "pale"));
  },

  standoff(k) {
    k.piece([0, 0, 0], () => k.cyl(0.3, 1.0, 0, 0.5, 0, "pale", "y", 6));
    k.piece([0, 0.5, 0], () => k.cyl(0.12, 0.4, 0, 1.2, 0, "light"));
    k.piece([0, -0.5, 0], () => k.cyl(0.12, 0.4, 0, -0.2, 0, "light"));
  },

  grommet(k) {
    k.piece([0, -0.3, 0], () => k.cyl(0.7, 0.08, 0, 0.04, 0, "mid"));
    k.piece([0, 0.1, 0], () => {
      k.cyl(0.55, 0.36, 0, 0.26, 0, "dark");
      k.cyl(0.28, 0.38, 0, 0.26, 0, "pale");
    });
  },

  gasket(k) {
    k.piece([0, 0.2, 0], () => k.box(3.0, 0.14, 0.35, 0, 0.1, 0, "dark"));
    k.piece([0, -0.2, 0], () => k.box(3.0, 0.03, 0.35, 0, 0.0, 0, "light"));
  },

  gland(k) {
    k.piece([0, -0.4, 0], () => k.cyl(0.3, 0.3, 0, -0.1, 0, "mid"));
    k.piece([0, 0, 0], () => k.cyl(0.4, 0.7, 0, 0.35, 0, "pale"));
    k.piece([0, 0.6, 0], () => k.cyl(0.52, 0.25, 0, 0.85, 0, "mid", "y", 6));
    k.piece([0, 1.1, 0], () => k.cyl(0.3, 0.4, 0, 1.2, 0, "dark"));
  },

  chassis(k) {
    k.piece([0, -0.4, 0], () => k.box(3.2, 0.08, 2.2, 0, 0.04, 0, "mid"));
    for (const s of [-1, 1]) {
      k.piece([s * 0.7, 0, 0], () => k.box(0.08, 0.5, 2.2, s * 1.6, 0.29, 0, "light"));
      k.piece([0, 0, s * 0.7], () => k.box(3.2, 0.5, 0.08, 0, 0.29, s * 1.1, "light"));
    }
  },

  enclosure(k) {
    k.piece([0, -0.3, 0], () => k.box(2.0, 1.4, 1.2, 0, 0.7, 0, "mid"));
    k.piece([0, 0.1, 0.6], () => {
      for (const x of [-0.6, 0.6]) k.box(0.25, 0.3, 0.1, x, 1.3, 0.62, "pale");
    });
    k.piece([0, 0.8, 0], () => k.box(2.1, 0.12, 1.3, 0, 1.46, 0, "light"));
  },

  cabinet(k) {
    k.piece([0, -0.2, 0], () => k.box(1.6, 3.0, 1.2, 0, 1.5, 0, "mid"));
    k.piece([0, 0, 0.9], () => {
      k.box(1.5, 2.8, 0.06, 0, 1.5, 0.63, "light");
      k.box(0.08, 0.5, 0.1, 0.55, 1.5, 0.7, "dark");
    });
    k.piece([0, 0.9, 0], () => k.box(1.8, 0.1, 1.4, 0, 3.05, 0, "dark"));
  },

  rackframe(k) {
    for (const s of [-1, 1]) {
      k.piece([s * 0.6, 0, 0], () => {
        for (const z of [-0.6, 0.6]) k.box(0.1, 3.0, 0.1, s * 0.8, 1.5, z, "light");
      });
    }
    k.piece([0, 0.5, 0], () => {
      for (const y of [0.1, 1.5, 2.9]) for (const z of [-0.6, 0.6]) k.box(1.6, 0.06, 0.06, 0, y, z, "mid");
    });
  },

  sled(k) {
    k.piece([0, -0.2, 0], () => k.box(2.6, 0.3, 1.8, 0, 0.15, 0, "mid"));
    k.piece([0, 0.2, 0.7], () => {
      k.box(1.6, 0.18, 0.12, 0, 0.35, 1.0, "pale");
      for (const x of [-0.7, 0.7]) k.box(0.1, 0.3, 0.12, x, 0.3, 0.95, "light");
    });
    k.piece([0, 0.7, 0], () => k.box(0.3, 0.12, 0.3, 0.9, 0.36, 0.2, "dark"));
  },

  pad(k) {
    k.piece([0, -0.2, 0], () => k.box(1.6, 0.06, 1.6, 0, 0.03, 0, "light"));
    k.piece([0, 0.35, 0], () => k.box(1.6, 0.02, 1.6, 0, 0.07, 0, "pale"));
  },

  fanguard(k) {
    k.piece([0, -0.2, 0], () => ringOfBoxes(k, 24, 0.95, 0.05, 0.06));
    k.piece([0, 0.1, 0], () => {
      ringOfBoxes(k, 16, 0.6, 0.05, 0.05);
      ringOfBoxes(k, 8, 0.3, 0.05, 0.05);
    });
    k.piece([0, 0.4, 0], () => {
      k.box(1.9, 0.04, 0.04, 0, 0.05, 0, "light");
      k.box(0.04, 0.04, 1.9, 0, 0.05, 0, "light");
    });
  },

  hvac(k) {
    k.piece([0, -0.2, 0], () => k.box(2.2, 1.5, 1.1, 0, 0.75, 0, "mid"));
    k.piece([0, 0.1, 0.7], () => k.cyl(0.45, 0.05, 0, 0.75, 0.58, "dark", "z"));
    k.piece([0, 0.1, 1.2], () => {
      for (let i = 0; i < 4; i++) k.box(1.6, 0.04, 0.02, 0, 0.3 + i * 0.3, 0.6, "light");
    });
  },

  module(k) {
    k.piece([0, -0.25, 0], () => k.box(1.6, 1.0, 1.1, 0, 0.5, 0, "dark"));
    k.piece([0, 0.55, 0], () => {
      for (const x of [-0.45, 0.45]) k.cyl(0.09, 0.15, x, 1.08, 0, "pale");
    });
  },
};

/** One part's shape, built into a kit the caller owns. */
export function buildShape(kit: Kit, part: StagePart) {
  SHAPES[archetypeFor(part)](kit, part);
}

/** The model for one part, alone: its component of the inverter, or a plain shape for its type. */
export function buildPartRig(part: StagePart): Rig {
  const twin = TWINS[part.id];
  if (twin) return buildComponentRig(twin.component);
  const ramp = toonRamp();
  const kit = new Kit(ramp, 0.45);
  SHAPES[archetypeFor(part)](kit, part);
  return kit.toRig(ramp);
}

/**
 * What the stage draws: everything one page needs, the searched part alone,
 * or, with nothing searched, the whole inverter.
 */
export function buildRig(subject: StageSubject | null | undefined): Rig {
  if (subject?.plan && subject.plan.length > 0) return buildPlanRig(subject.plan);
  return subject?.part ? buildPartRig(subject.part) : buildHeroRig();
}
