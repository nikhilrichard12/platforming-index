import * as THREE from "three";
import { TOKEN } from "@/lib/anim";

/**
 * One product, drawn from its own parts list.
 *
 * The stage answers a question in order: here is the product, here are the
 * parts on this page that it already contains, here are the interfaces those
 * parts belong to, and here is what has no home yet. So the scene keeps every
 * part where it sits in the product and hands the component the two places
 * each one travels between: its home, and the tight group its interface pulls
 * it into.
 *
 * Line art, not shading: a dark face and a thin edge, in text-3 until the
 * sequence lights it.
 */

export type ShellKind = "rack" | "cabinet" | "wall";

export interface ScenePart {
  id: string;
  name: string;
}

export interface SceneCluster {
  id: string;
  /** The parts of this interface that this product carries, in page order. */
  partIds: string[];
}

export interface ProductSceneSpec {
  shell: ShellKind;
  parts: ScenePart[];
  /** The parts this page matched, in the order the page named them. */
  matched: string[];
  clusters: SceneCluster[];
  /** Needs with nothing behind them: an empty slot each. */
  newCount: number;
}

/** Outside dimensions per product class, in model units. */
const SHELL: Record<ShellKind, [number, number, number]> = {
  rack: [4.6, 1.5, 2.6],
  cabinet: [2.9, 4.0, 2.2],
  wall: [2.6, 3.2, 1.2],
};

const DEPTH = 0.24;
const PAD = 0.22;
const FILL = 0.76;

export interface SceneBlock {
  partId: string;
  clusterId: string | null;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  /** Where it sits in the product, and where its interface pulls it to. */
  home: THREE.Vector3;
  tight: THREE.Vector3;
  /** How far it comes out of the product when it is called out. */
  lift: THREE.Vector3;
  size: THREE.Vector3;
}

export interface SceneClusterView {
  id: string;
  blocks: SceneBlock[];
  outline: THREE.LineSegments;
  /** Where the label points once the group has closed up. */
  anchor: THREE.Vector3;
}

export interface SceneSlot {
  outline: THREE.LineSegments;
  anchor: THREE.Vector3;
}

export interface ProductScene {
  root: THREE.Group;
  /** The part that turns. Labels project from inside it. */
  spin: THREE.Group;
  /** Every line of the product itself, for the opening draw. */
  shell: THREE.Object3D[];
  blocks: SceneBlock[];
  byPart: Map<string, SceneBlock>;
  clusters: SceneClusterView[];
  slots: SceneSlot[];
  dispose(): void;
}

function lineMaterial(color: string, opacity = 1) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity });
}

/** A hollow box in line art: edges only. */
function wireBox(w: number, h: number, d: number, color: string, opacity = 1) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    lineMaterial(color, opacity)
  );
  geo.dispose();
  return edges;
}

export function buildProductScene(spec: ProductSceneSpec): ProductScene {
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);

  const [W, H, D] = SHELL[spec.shell];
  // A rack is flat, so its parts sit on the tray. A cabinet stands up, so its
  // parts sit on the front plane.
  const deck = spec.shell === "rack";
  const cols = deck ? 8 : 5;

  // Matched parts first, in the order the page named them, then the rest of
  // the product, then one empty slot per need with nothing behind it.
  const matched = spec.matched.filter((id) => spec.parts.some((p) => p.id === id));
  const rest = spec.parts.map((p) => p.id).filter((id) => !matched.includes(id));
  const order = [...matched, ...rest];
  const cells = order.length + spec.newCount;
  const rows = Math.max(1, Math.ceil(cells / cols));

  const shellLines: THREE.Object3D[] = [];
  const shell = wireBox(W, H, D, TOKEN.text3, 0.75);
  spin.add(shell);
  shellLines.push(shell);
  for (const t of [0.3, 0.7]) {
    const y = -H / 2 + H * t;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-W / 2 + 0.08, y, D / 2),
      new THREE.Vector3(W / 2 - 0.08, y, D / 2),
    ]);
    const line = new THREE.Line(geo, lineMaterial(TOKEN.text3, 0.35));
    spin.add(line);
    shellLines.push(line);
  }

  const innerW = W - PAD * 2;
  const innerDown = (deck ? D : H) - PAD * 2;
  const cellW = innerW / cols;
  const cellH = innerDown / rows;
  const bw = cellW * FILL;
  const bh = cellH * FILL;

  const at = (index: number) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = -innerW / 2 + cellW * (col + 0.5);
    const down = innerDown / 2 - cellH * (row + 0.5);
    // On a tray the first row sits at the front, nearest the reader, so the
    // parts a page named are never hidden behind the ones it did not.
    return deck
      ? new THREE.Vector3(x, -H / 2 + PAD + DEPTH / 2, down)
      : new THREE.Vector3(x, down, 0);
  };

  const size = deck
    ? new THREE.Vector3(bw, DEPTH, bh)
    : new THREE.Vector3(bw, bh, DEPTH);
  /** Out of the product, toward the reader: up off a tray, forward off a face. */
  const liftBy = deck
    ? new THREE.Vector3(0, bh * 1.2, 0)
    : new THREE.Vector3(0, 0, Math.max(D / 2, bh));

  const clusterOf = new Map<string, string>();
  spec.clusters.forEach((c) => c.partIds.forEach((id) => clusterOf.set(id, c.id)));

  const blocks: SceneBlock[] = [];
  const byPart = new Map<string, SceneBlock>();

  order.forEach((partId, i) => {
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: TOKEN.panel })
    );
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      lineMaterial(TOKEN.text3, 0.9)
    );
    mesh.add(edges);
    const home = at(i);
    mesh.position.copy(home);
    mesh.userData.partId = partId;
    mesh.userData.clusterId = clusterOf.get(partId) ?? null;
    spin.add(mesh);

    const block: SceneBlock = {
      partId,
      clusterId: clusterOf.get(partId) ?? null,
      mesh,
      edges,
      home,
      tight: home.clone(),
      lift: liftBy.clone(),
      size: size.clone(),
    };
    blocks.push(block);
    byPart.set(partId, block);
  });

  // An interface pulls its parts into one tight row, so the outline around
  // them is a rectangle and the group reads as one thing.
  const clusters: SceneClusterView[] = [];
  for (const cluster of spec.clusters) {
    const members = cluster.partIds
      .map((id) => byPart.get(id))
      .filter(Boolean) as SceneBlock[];
    if (members.length === 0) continue;

    const centre = members
      .reduce((v, b) => v.add(b.home), new THREE.Vector3())
      .divideScalar(members.length);
    const pitch = cellW * 0.82;
    members.forEach((b, i) => {
      const offset = (i - (members.length - 1) / 2) * pitch;
      b.tight = new THREE.Vector3(centre.x + offset, centre.y, centre.z);
    });

    const span = members.length * pitch + 0.08;
    const outline = wireBox(span, size.y + 0.1, size.z + 0.1, TOKEN.accent, 0);
    outline.position.copy(centre);
    spin.add(outline);

    clusters.push({
      id: cluster.id,
      blocks: members,
      outline,
      anchor: new THREE.Vector3(
        centre.x,
        centre.y + size.y / 2 + 0.08,
        centre.z
      ),
    });
  }

  // A need with nothing behind it: an empty slot where the part would go.
  const slots: SceneSlot[] = [];
  for (let n = 0; n < spec.newCount; n++) {
    const where = at(order.length + n);
    const outline = wireBox(size.x, size.y, size.z, TOKEN.warn, 0);
    outline.position.copy(where);
    spin.add(outline);
    slots.push({
      outline,
      anchor: new THREE.Vector3(where.x, where.y + size.y / 2, where.z),
    });
  }

  return {
    root,
    spin,
    shell: shellLines,
    blocks,
    byPart,
    clusters,
    slots,
    dispose() {
      root.traverse((obj) => {
        const m = obj as THREE.Mesh | THREE.LineSegments;
        m.geometry?.dispose?.();
        const mat = (m as THREE.Mesh).material as THREE.Material | undefined;
        mat?.dispose?.();
      });
    },
  };
}

/** The shell a product id draws itself in. */
export function shellFor(productId: string): ShellKind {
  if (productId.startsWith("VRK")) return "rack";
  if (productId.startsWith("VSI")) return "wall";
  return "cabinet";
}
