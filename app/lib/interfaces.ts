import { LayerId, layerOfNeed } from "./anim";
import { parsePart } from "./similarity";

/**
 * Interfaces: what actually carries across a product generation.
 *
 * A part is reused or it is not. An interface is bigger than that — a frame
 * size, a pin-out, a bolt pattern, a bus voltage — and designing to one brings
 * the brackets, the harness, the firmware and the test fixture with it. The
 * list is curated for the sample (data/derived/voltara_interfaces.json); in a
 * deployment it comes from CAD and PLM.
 */

export type Subsystem =
  | "Cooling"
  | "Power stage"
  | "Control"
  | "Energy storage"
  | "I/O"
  | "Enclosure";

export interface InterfaceRole {
  role: string;
  parts: string[];
  partNames: string[];
}

export interface PlatformInterface {
  id: string;
  name: string;
  subsystem: Subsystem;
  /** The thing that defines it: "120 mm fan frame, M4 bolt pattern, 24 VDC". */
  spec: string;
  parts: string[];
  partNames: string[];
  roles: InterfaceRole[];
  products: string[];
  since: number | null;
  /** What a new product gets for free by designing to it. */
  inherits: string[];
}

export interface InterfaceFile {
  company: string;
  note: string;
  source: string;
  interfaces: PlatformInterface[];
}

/** Which subsystem a layer of the product belongs to. */
const SUBSYSTEM_OF_LAYER: Record<LayerId, Subsystem> = {
  thermal: "Cooling",
  power: "Power stage",
  control: "Control",
  storage: "Energy storage",
  io: "I/O",
  enclosure: "Enclosure",
};

/**
 * Words that settle the subsystem before the exploded view's layers are
 * consulted. The layers answer "where does this sit in the product"; an
 * interface answers "what boundary is this", and the two part company in a
 * few places: a display is control electronics sitting in the product, but
 * the thing it designs to is the front panel.
 */
const SUBSYSTEM_WORDS: [Subsystem, RegExp][] = [
  ["Enclosure", /\b(enclosure|cabinet|envelope|housing|ip\d\d|door|bezel)\b/i],
  ["I/O", /\b(display|lcd|screen|modbus|rs485|ethernet|snmp|gland|grommet|terminal block|lug)\b/i],
];

/** The subsystem a need belongs to, read from the words the engineer wrote. */
export function subsystemOf(need: string, part?: { cat: string; name: string }): Subsystem {
  for (const [subsystem, pattern] of SUBSYSTEM_WORDS) {
    if (pattern.test(need)) return subsystem;
  }
  return SUBSYSTEM_OF_LAYER[layerOfNeed(need, part)];
}

export interface InterfaceMatch {
  interface: PlatformInterface;
  /** Ratings that agree between the need and the spec: "120mm", "24vdc". */
  agreed: string[];
  /** Why it matched, in one line. */
  why: string;
}

/**
 * Nouns too general to be evidence on their own. "The interface already
 * carries a module" says nothing; "already carries a fan" says something.
 */
const GENERIC = new Set(["module", "unit", "assembly", "kit", "pack", "system"]);

/**
 * The first value each unit takes in a description, ignoring bare numbers.
 * A number with no unit is usually debris — "4.3 in" reads as a 4 and a 3in —
 * and a boundary is defined by its units, not by a loose digit.
 */
function ratings(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const s of parsePart(text).specs) {
    if (s.unit === "count") continue;
    if (!out.has(s.unit)) out.set(s.unit, s.value);
  }
  return out;
}

/**
 * Does this need land on an interface the company already has?
 *
 * Same subsystem, no rating that disagrees, and then either a rating that
 * agrees with the spec, or a kind of thing the interface already implements.
 * A disagreeing rating is decisive: an 80 mm fan is not the 120 mm interface,
 * whatever else matches.
 */
export function matchInterface(
  need: string,
  interfaces: PlatformInterface[],
  part?: { cat: string; name: string }
): InterfaceMatch | null {
  const subsystem = subsystemOf(need, part);
  const needRatings = ratings(need);
  const needType = parsePart(need).type;

  const candidates: InterfaceMatch[] = [];

  for (const iface of interfaces) {
    if (iface.subsystem !== subsystem) continue;

    const specRatings = ratings(iface.spec);
    const shared = [...needRatings.keys()].filter((u) => specRatings.has(u));
    const agreed = shared.filter((u) => needRatings.get(u) === specRatings.get(u));
    if (agreed.length !== shared.length) continue; // a rating disagrees

    if (agreed.length > 0) {
      candidates.push({
        interface: iface,
        agreed: agreed.map((u) => `${needRatings.get(u)}${u === "count" ? "" : u}`),
        why: `${agreed.length === 1 ? "The rating" : "The ratings"} ${agreed
          .map((u) => `${needRatings.get(u)}${u === "count" ? "" : u}`)
          .join(" and ")} ${agreed.length === 1 ? "matches" : "match"} the ${
          iface.name
        } spec`,
      });
      continue;
    }

    // No rating either way. The interface still covers it if it already
    // implements this kind of thing.
    const implemented =
      needType &&
      !GENERIC.has(needType) &&
      iface.partNames.some((n) => parsePart(n).type === needType);
    if (implemented && needType) {
      candidates.push({
        interface: iface,
        agreed: [],
        why: `The ${iface.name} already carries a ${needType}`,
      });
    }
  }

  if (candidates.length === 0) return null;
  // The one with the most evidence, then the one more products are already on.
  candidates.sort(
    (a, b) =>
      b.agreed.length - a.agreed.length ||
      b.interface.products.length - a.interface.products.length
  );
  return candidates[0];
}
