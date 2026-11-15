import * as THREE from "three";
import { Kit, RIM_BASE_DEFAULT, Rig, RigPiece, disposeObject, toonRamp } from "./kit";

/**
 * The inverter: an illustrative, procedural model built from Three.js
 * primitives. No model files, no CAD. It is drawn as the SunLine 5 kW Solar
 * Inverter because data/derived/voltara_parts.json shows that product carries
 * the IGBT module, the DC link capacitors and the DSP control board (RackLine
 * 1 kVA and 3 kVA do too; the inverter is the one whose power stage, DC link
 * and DSP controller are physically those three things).
 *
 * It is used two ways. Whole, it is the resting view when nothing is being
 * searched. Taken apart, each component is the model for the part in the data
 * that it stands for (TWINS below), shown alone.
 *
 * Layout units are about 10 cm. Components sit in layers along Y. Each
 * component is a Group whose origin is the bottom centre of its footprint.
 */

export const HERO_PRODUCT = { id: "VSI-5", name: "SunLine 5 kW Solar Inverter" } as const;

export type PartKey = "igbt" | "dclink" | "dsp";

/** The three parts the demo switcher jumps between. */
export const HIGHLIGHT_PARTS: Record<PartKey, { partId: string; name: string; short: string }> = {
  igbt: {
    partId: "C013",
    name: "Half Bridge IGBT Module 600V 50A",
    short: "IGBT module",
  },
  dclink: {
    partId: "C011",
    name: "Electrolytic DC Link Capacitor 470uF 450V",
    short: "DC link capacitors",
  },
  dsp: {
    partId: "C001",
    name: "DSP Control Board Rev C",
    short: "DSP control board",
  },
};

export const PART_KEYS = Object.keys(HIGHLIGHT_PARTS) as PartKey[];

/**
 * The parts in the data that have a detailed model component to show alone,
 * and which component that is. Every other part gets a plain shape (parts.ts).
 */
export const TWINS: Record<string, { name: string; component: string }> = {
  C013: { name: "Half Bridge IGBT Module 600V 50A", component: "igbt" },
  C014: { name: "Half Bridge IGBT Module 1200V 100A", component: "igbt" },
  C011: { name: "Electrolytic DC Link Capacitor 470uF 450V", component: "dclink" },
  C001: { name: "DSP Control Board Rev C", component: "dsp" },
  C002: { name: "Isolated Gate Driver Board 6 Channel", component: "gate_driver" },
  C004: { name: "Extruded Aluminum Heatsink 200mm", component: "heatsink" },
  C005: { name: "Axial Fan 120mm 24VDC", component: "fan_left" },
  C022: { name: "PFC Inductor 1mH 30A", component: "choke_a" },
  C023: { name: "Output Filter Inductor 0.5mH 60A", component: "choke_b" },
  C024: { name: "Auxiliary Isolation Transformer 100VA", component: "transformer" },
  C031: { name: "Copper Busbar 200A", component: "busbar" },
  C006: { name: "6 Pole Terminal Block 30A", component: "terminal_ac" },
};

interface PartLike {
  id: string;
  name: string;
  rows: { products: string[] }[];
}

/**
 * The model only means something if the data still says what it was drawn
 * from. Raise rather than draw a part that does not match the data.
 */
export function resolveHeroParts<P extends PartLike>(parts: P[]): Record<PartKey, P> {
  const out = {} as Record<PartKey, P>;
  for (const key of PART_KEYS) {
    const want = HIGHLIGHT_PARTS[key];
    const part = parts.find((p) => p.id === want.partId);
    if (!part) throw new Error(`voltara_parts.json has no part group ${want.partId} (${want.name})`);
    if (part.name !== want.name) {
      throw new Error(`Part group ${want.partId} is "${part.name}", expected "${want.name}"`);
    }
    if (!part.rows.some((r) => r.products.includes(HERO_PRODUCT.id))) {
      throw new Error(`${HERO_PRODUCT.id} does not carry ${want.name} in voltara_parts.json`);
    }
    out[key] = part;
  }
  for (const [id, want] of Object.entries(TWINS)) {
    const part = parts.find((p) => p.id === id);
    if (!part) throw new Error(`voltara_parts.json has no part group ${id} (${want.name})`);
    if (part.name !== want.name) throw new Error(`Part group ${id} is "${part.name}", expected "${want.name}"`);
    if (!DEFS.some((d) => d.id === want.component)) {
      throw new Error(`The model has no component "${want.component}" for part group ${id}`);
    }
  }
  return out;
}

/* ---------- layers ---------- */

export const LAYER_IDS = [
  "enclosure",
  "thermal",
  "power",
  "dclink",
  "magnetics",
  "control",
  "connectors",
] as const;
export type LayerId = (typeof LAYER_IDS)[number];

/** How far apart exploded layers sit, in model units. */
export const LAYER_GAP = 0.95;

/**
 * Explode level per layer: how many gaps up the stack it travels. The
 * connectors leave sideways instead of stacking above everything.
 */
const LEVEL: Record<LayerId, number> = {
  enclosure: 0,
  thermal: 1,
  power: 2,
  dclink: 3,
  magnetics: 4,
  control: 5,
  connectors: 3,
};

/* ---------- the components ---------- */

interface Def {
  id: string;
  layer: LayerId;
  home: [number, number, number];
  lateral?: [number, number, number];
  /** Pieces inside this build separate when the component is shown alone. */
  build(k: Kit): void;
}

/** Fin array: a row of thin plates. */
function fins(k: Kit, count: number, width: number, h: number, depth: number, y: number) {
  const step = width / (count - 1);
  for (let i = 0; i < count; i++) {
    k.box(0.06, h, depth, -width / 2 + i * step, y, 0, "mid");
  }
}

const DEFS: Def[] = [
  /* enclosure */
  {
    id: "tray",
    layer: "enclosure",
    home: [0, 0, 0],
    build(k) {
      k.piece([0, -0.3, 0], () => {
        k.box(4.8, 0.16, 3.2, 0, 0.08, 0, "dark");
        k.box(4.4, 0.05, 0.1, 0, 0.185, 1.5, "mid"); // front lip
      });
      k.piece([0, 0.4, 0], () => {
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) k.box(0.18, 0.44, 0.18, sx * 2.25, 0.38, sz * 1.45, "mid");
        }
      });
    },
  },

  /* heatsink and fans */
  {
    id: "heatsink",
    layer: "thermal",
    home: [0, 0.16, 0],
    build(k) {
      k.piece([0, -0.55, 0], () => fins(k, 15, 3.0, 0.72, 2.3, 0.36));
      k.piece([0, 0.5, 0], () => k.box(3.4, 0.2, 2.5, 0, 0.82, 0, "light"));
    },
  },
  ...([-1, 1] as const).map<Def>((s) => ({
    id: s < 0 ? "fan_left" : "fan_right",
    layer: "thermal",
    home: [s * 0.85, 0.16, 1.45],
    build(k: Kit) {
      k.piece([0, 0, -0.45], () => k.box(0.98, 0.98, 0.28, 0, 0.5, 0, "mid"));
      k.piece([0, 0, 0.15], () => k.cyl(0.15, 0.34, 0, 0.5, 0, "dark", "z"));
      k.piece([0, 0, 0.6], () => {
        for (let i = 0; i < 5; i++) {
          const blade = k.box(0.34, 0.07, 0.05, 0, 0.5, 0.02, "pale");
          const a = (i / 5) * Math.PI * 2;
          blade.position.set(Math.cos(a) * 0.26, 0.5 + Math.sin(a) * 0.26, 0.02);
          blade.rotation.z = a + 0.4;
        }
      });
    },
  })),

  /* power stage */
  {
    id: "igbt",
    layer: "power",
    home: [-0.8, 1.08, -0.1],
    build(k) {
      k.piece([0, -0.5, 0], () => k.box(1.72, 0.06, 1.1, 0, 0.03, 0, "light")); // mounting flange
      k.piece([0, 0, 0], () => k.box(1.5, 0.24, 0.9, 0, 0.18, 0, "dark")); // moulded body
      k.piece([0, 0.35, 0], () => k.box(1.1, 0.02, 0.4, 0, 0.31, 0.12, "mid")); // label recess
      k.piece([0, 0.85, 0], () => {
        for (const x of [-0.5, 0, 0.5]) {
          for (const z of [-0.28, 0.28]) {
            k.cyl(0.075, 0.12, x, 0.36, z, "pale"); // screw terminal post
            k.cyl(0.095, 0.03, x, 0.43, z, "light"); // terminal screw head
          }
        }
      });
      k.piece([0, -0.95, 0], () => {
        for (const x of [-0.76, 0.76]) {
          for (const z of [-0.45, 0.45]) k.cyl(0.05, 0.06, x, 0.09, z, "pale"); // flange bolts
        }
      });
    },
  },
  {
    id: "busbar",
    layer: "power",
    home: [0.1, 1.3, 0],
    build(k) {
      k.piece([0, 0.35, 0], () => k.box(1.9, 0.05, 0.2, 0, 0.025, 0.42, "pale"));
      k.piece([0, -0.35, 0], () => k.box(0.2, 0.05, 0.9, 0.9, 0.025, 0, "pale"));
    },
  },

  /* DC link */
  {
    id: "dclink",
    layer: "dclink",
    home: [1.05, 1.5, -0.1],
    build(k) {
      k.piece([0, -0.55, 0], () => k.box(1.8, 0.07, 1.25, 0, 0.035, 0, "mid"));
      k.piece([0, 0.3, 0], () => {
        for (const x of [-0.55, 0, 0.55]) {
          for (const z of [-0.3, 0.3]) {
            k.cyl(0.2, 0.8, x, 0.47, z, "dark"); // can
            k.cyl(0.2, 0.04, x, 0.1, z, "pale"); // sleeve ring at the base
          }
        }
      });
      k.piece([0, 1.0, 0], () => {
        for (const x of [-0.55, 0, 0.55]) {
          for (const z of [-0.3, 0.3]) k.cyl(0.17, 0.02, x, 0.88, z, "light"); // safety vent disc
        }
      });
    },
  },

  /* magnetics */
  ...([-1.45, -0.25] as const).map<Def>((x, i) => ({
    id: i === 0 ? "choke_a" : "choke_b",
    layer: "magnetics",
    home: [x, 2.5, -0.1],
    build(k: Kit) {
      k.piece([0, -0.45, 0], () => k.cyl(0.5, 0.08, 0, 0.04, 0, "light"));
      k.piece([0, 0, 0], () => k.cyl(0.4, 0.6, 0, 0.38, 0, "mid"));
      k.piece([0, 0.5, 0], () => k.cyl(0.5, 0.08, 0, 0.72, 0, "light"));
    },
  })),
  {
    id: "transformer",
    layer: "magnetics",
    home: [1.2, 2.5, -0.1],
    build(k) {
      k.piece([0, -0.5, 0], () => k.box(1.5, 0.16, 1.0, 0, 0.08, 0, "light"));
      k.piece([0, 0, 0], () => k.box(0.9, 0.55, 0.8, 0, 0.435, 0, "dark"));
      k.piece([0, 0.6, 0], () => k.box(1.5, 0.16, 1.0, 0, 0.79, 0, "light"));
    },
  },

  /* control */
  {
    id: "gate_driver",
    layer: "control",
    home: [-1.35, 3.5, -0.1],
    build(k) {
      k.piece([0, -0.35, 0], () => k.box(1.3, 0.05, 1.0, 0, 0.025, 0, "mid"));
      k.piece([0, 0.3, 0], () => {
        for (const [x, z] of [
          [-0.35, -0.2],
          [0.05, 0.15],
          [0.4, -0.2],
        ] as const) {
          k.box(0.3, 0.07, 0.3, x, 0.085, z, "dark");
        }
      });
      k.piece([0, 0.05, 0.8], () => k.box(0.9, 0.12, 0.14, 0, 0.11, 0.42, "pale"));
    },
  },
  {
    id: "dsp",
    layer: "control",
    home: [0.85, 3.5, -0.1],
    build(k) {
      k.piece([0, -0.35, 0], () => k.box(2.2, 0.06, 1.4, 0, 0.03, 0, "mid")); // thin board
      k.piece([0, 0.3, 0], () => {
        k.box(0.55, 0.09, 0.55, -0.25, 0.105, 0.0, "dark"); // the DSP itself
        for (const [x, z] of [
          [0.45, -0.3],
          [0.85, -0.3],
          [0.45, 0.1],
        ] as const) {
          k.box(0.3, 0.07, 0.28, x, 0.095, z, "dark"); // support chips
        }
        k.box(0.4, 0.07, 0.22, -0.75, 0.095, -0.45, "dark"); // memory
      });
      k.piece([0, 0, 0.85], () => k.box(1.4, 0.14, 0.16, 0, 0.13, 0.58, "pale")); // connector row
      k.piece([0, 0.65, 0.85], () => {
        for (let i = 0; i < 8; i++) k.box(0.06, 0.1, 0.06, -0.6 + i * 0.17, 0.25, 0.58, "light"); // header pins
      });
    },
  },

  /* connectors */
  {
    id: "terminal_ac",
    layer: "connectors",
    home: [-2.0, 0.16, 0],
    lateral: [-1.2, 0, 0],
    build(k) {
      k.piece([0, -0.2, 0], () => k.box(0.5, 0.55, 1.3, 0, 0.275, 0, "mid"));
      k.piece([0, 0.6, 0], () => {
        for (const z of [-0.4, 0, 0.4]) k.cyl(0.09, 0.08, 0, 0.59, z, "pale");
      });
    },
  },
  {
    id: "terminal_dc",
    layer: "connectors",
    home: [2.0, 0.16, 0],
    lateral: [1.2, 0, 0],
    build(k) {
      k.piece([-0.25, 0, 0], () => k.box(0.5, 0.55, 1.3, 0, 0.275, 0, "mid"));
      k.piece([0.6, 0, 0], () => {
        for (const z of [-0.3, 0.3]) k.cyl(0.15, 0.36, 0.24, 0.3, z, "dark", "x");
      });
    },
  },
];

/** A rim light a little stronger than the product's, since a part alone has nothing else to read against. */
const ALONE_RIM = 0.45;

/** The whole inverter, assembled or exploded by layer. */
export function buildHeroRig(): Rig {
  const ramp = toonRamp();
  const root = new THREE.Group();
  const pieces: RigPiece[] = [];
  for (const def of DEFS) {
    const kit = new Kit(ramp, RIM_BASE_DEFAULT);
    def.build(kit);
    const home = new THREE.Vector3(...def.home);
    kit.group.position.copy(home);
    root.add(kit.group);
    const lateral = new THREE.Vector3(...(def.lateral ?? [0, 0, 0]));
    pieces.push({
      group: kit.group,
      home,
      offset: new THREE.Vector3(lateral.x, LEVEL[def.layer] * LAYER_GAP + lateral.y, lateral.z),
      order: LAYER_IDS.indexOf(def.layer),
    });
  }
  return {
    root,
    pieces,
    orders: LAYER_IDS.length,
    dispose() {
      disposeObject(root);
      ramp.dispose();
    },
  };
}

/** One component of the inverter on its own, its pieces ready to separate. */
export function buildComponentRig(componentId: string): Rig {
  const def = DEFS.find((d) => d.id === componentId);
  if (!def) throw new Error(`The model has no component "${componentId}"`);
  const ramp = toonRamp();
  const kit = new Kit(ramp, ALONE_RIM);
  def.build(kit);
  return kit.toRig(ramp);
}
