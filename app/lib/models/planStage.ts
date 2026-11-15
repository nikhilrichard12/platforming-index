import * as THREE from "three";
import { TOKEN } from "@/lib/anim";
import { Kit, Rig, disposeObject, toonRamp } from "./kit";
import { StagePart, buildShape } from "./parts";

/**
 * The stage for one page: every part and interface the page's needs landed
 * on, and nothing else. No product shell, no decoration — a reader should be
 * able to count what is drawn and get the same number the panel prints.
 *
 * Colour carries the outcome: positive for a need on an interface the company
 * already has, text for a part with no interface behind it, warn for new
 * thinking, risk for something a rule blocks.
 */

export type NeedTone = "interface" | "part" | "new" | "blocked";

export const TONE_COLOR: Record<NeedTone, string> = {
  interface: TOKEN.positive,
  part: TOKEN.text,
  new: TOKEN.warn,
  blocked: TOKEN.risk,
};

export const TONE_LABEL: Record<NeedTone, string> = {
  interface: "On an existing interface",
  part: "Part you already buy",
  new: "New thinking",
  blocked: "Blocked by a rule",
};

/** The order they separate in, so one tone leaves at a time. */
const TONE_ORDER: NeedTone[] = ["interface", "part", "new", "blocked"];

export interface StageItem {
  /** The need, used as the key: the stage redraws when the page changes. */
  key: string;
  tone: NeedTone;
  /** The part the need landed on, if it landed on one. */
  part?: StagePart;
}

const COLS = 4;
const CELL = 1.35;
/** Every item is drawn at the same size, because none is more important. */
const ITEM_SIZE = 0.95;

/** A need with no part is still something the page asked for: a plain block. */
function blankShape(kit: Kit) {
  kit.box(0.9, 0.9, 0.9, 0, 0.45, 0, "mid");
}

export function buildPlanRig(items: StageItem[]): Rig {
  const root = new THREE.Group();
  const ramps: THREE.DataTexture[] = [];
  const ordered = [...items].sort(
    (a, b) => TONE_ORDER.indexOf(a.tone) - TONE_ORDER.indexOf(b.tone)
  );

  const cols = Math.min(COLS, Math.max(1, ordered.length));
  const rows = Math.ceil(ordered.length / cols);
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();

  const pieces = ordered.map((item, i) => {
    const ramp = toonRamp();
    ramps.push(ramp);
    const kit = new Kit(ramp, 0.4, TONE_COLOR[item.tone]);
    if (item.part) buildShape(kit, item.part);
    else blankShape(kit);

    // Each item is drawn at its own scale, then normalised, so a cabinet and
    // a screw take the same room on a 400px panel.
    const holder = new THREE.Group();
    holder.add(kit.group);
    box.setFromObject(kit.group);
    box.getSize(size);
    box.getCenter(centre);
    const span = Math.max(size.x, size.y, size.z, 0.001);
    const scale = ITEM_SIZE / span;
    kit.group.scale.setScalar(scale);
    kit.group.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);

    const cx = (i % cols) - (cols - 1) / 2;
    const cz = Math.floor(i / cols) - (rows - 1) / 2;
    holder.position.set(cx * CELL, 0, cz * CELL);
    root.add(holder);

    return {
      group: holder,
      home: holder.position.clone(),
      // Apart along the grid, so the four outcomes separate into their blocks.
      offset: new THREE.Vector3(cx * 0.55, 0.35, cz * 0.55),
      order: TONE_ORDER.indexOf(item.tone),
    };
  });

  return {
    root,
    pieces,
    orders: Math.max(1, TONE_ORDER.length),
    dispose() {
      disposeObject(root);
      ramps.forEach((r) => r.dispose());
    },
  };
}
