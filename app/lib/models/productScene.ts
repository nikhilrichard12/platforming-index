import * as THREE from "three";
import { TOKEN } from "@/lib/anim";

/**
 * One product, drawn from its own parts list.
 *
 * The stage answers a question: what in this product is already an interface
 * you could design to? So it draws the whole product in line art, every part
 * it carries as one block, and nothing else. The parts that belong to the
 * same interface sit together in a block of their own, so lighting them reads
 * as one thing rather than a scatter of highlights.
 *
 * Line art, not shading: a dark face and a thin edge, in text-3 until an
 * interface lights it in accent.
 */

export type ShellKind = "rack" | "cabinet" | "wall";

export interface ScenePart {
  id: string;
  name: string;
}

export interface SceneCluster {
  id: string;
  /** The parts of this interface that this product actually carries. */
  partIds: string[];
}

export interface ProductSceneSpec {
  shell: ShellKind;
  parts: ScenePart[];
  clusters: SceneCluster[];
}

/** Outside dimensions per product class, in model units. */
const SHELL: Record<ShellKind, [number, number, number]> = {
  rack: [4.6, 1.5, 2.6],
  cabinet: [2.9, 4.0, 2.2],
  wall: [2.6, 3.2, 1.2],
};

const DEPTH = 0.24; // how deep a part block is
const PAD = 0.22; // margin between the shell and the first block
const FILL = 0.76; // how much of its cell a block occupies

export interface SceneBlock {
  partId: string;
  clusterId: string | null;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
}

export interface SceneClusterView {
  id: string;
  group: THREE.Group;
  blocks: SceneBlock[];
  outline: THREE.LineSegments;
  /** Where the label points, in the rotating group's own space. */
  anchor: THREE.Vector3;
}

export interface ProductScene {
  root: THREE.Group;
  /** The part that turns. Labels project from inside it. */
  spin: THREE.Group;
  blocks: SceneBlock[];
  clusters: SceneClusterView[];
  radius: number;
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

/**
 * Where each part sits. Interface parts are placed first, each cluster taking
 * a run of cells in one row, so an outline around it is a rectangle and not a
 * scatter. Everything else fills the cells that are left.
 */
function layout(spec: ProductSceneSpec, cols: number) {
  const order: { partId: string; clusterId: string | null }[] = [];
  const taken = new Set<string>();
  const runs = new Map<string, { row: number; from: number; to: number }>();

  let cell = 0;
  for (const cluster of spec.clusters) {
    const members = cluster.partIds.filter((id) => !taken.has(id));
    if (members.length === 0) continue;
    // A cluster never straddles two rows: it starts a new one if it must.
    const room = cols - (cell % cols);
    if (members.length > room) cell += room;
    const start = cell;
    members.forEach((id) => {
      taken.add(id);
      order[cell] = { partId: id, clusterId: cluster.id };
      cell += 1;
    });
    runs.set(cluster.id, {
      row: Math.floor(start / cols),
      from: start % cols,
      to: (start % cols) + members.length - 1,
    });
  }

  for (const part of spec.parts) {
    if (taken.has(part.id)) continue;
    while (order[cell]) cell += 1;
    order[cell] = { partId: part.id, clusterId: null };
    cell += 1;
  }

  return { order, runs, rows: Math.max(1, Math.ceil(order.length / cols)) };
}

export function buildProductScene(spec: ProductSceneSpec): ProductScene {
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);

  const [W, H, D] = SHELL[spec.shell];
  // A rack is flat, so its parts sit on the tray and the grid runs across the
  // deck. A cabinet stands up, so its parts sit on the front plane.
  const deck = spec.shell === "rack";
  const cols = deck ? 8 : 5;
  const { order, runs, rows } = layout(spec, cols);

  // The shell, and two lines across its face so it reads as a product.
  const shell = wireBox(W, H, D, TOKEN.text3, 0.75);
  spin.add(shell);
  const faceLines = new THREE.Group();
  for (const t of [0.3, 0.7]) {
    const y = -H / 2 + H * t;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-W / 2 + 0.08, y, D / 2),
      new THREE.Vector3(W / 2 - 0.08, y, D / 2),
    ]);
    faceLines.add(new THREE.Line(geo, lineMaterial(TOKEN.text3, 0.35)));
  }
  spin.add(faceLines);

  const innerW = W - PAD * 2;
  const innerDown = (deck ? D : H) - PAD * 2;
  const cellW = innerW / cols;
  const cellH = innerDown / rows;
  const bw = cellW * FILL;
  const bh = cellH * FILL;

  const at = (col: number, row: number) => {
    const x = -innerW / 2 + cellW * (col + 0.5);
    const down = innerDown / 2 - cellH * (row + 0.5);
    return deck
      ? new THREE.Vector3(x, -H / 2 + PAD + DEPTH / 2, -down)
      : new THREE.Vector3(x, down, 0);
  };

  const blocks: SceneBlock[] = [];
  const byCluster = new Map<string, SceneBlock[]>();

  order.forEach((slot, i) => {
    if (!slot) return;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const geo = deck
      ? new THREE.BoxGeometry(bw, DEPTH, bh)
      : new THREE.BoxGeometry(bw, bh, DEPTH);
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: TOKEN.panel })
    );
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      lineMaterial(TOKEN.text3, 0.9)
    );
    mesh.add(edges);
    mesh.position.copy(at(col, row));
    mesh.userData.partId = slot.partId;
    mesh.userData.clusterId = slot.clusterId;

    const block: SceneBlock = {
      partId: slot.partId,
      clusterId: slot.clusterId,
      mesh,
      edges,
    };
    blocks.push(block);

    if (slot.clusterId) {
      byCluster.set(slot.clusterId, [...(byCluster.get(slot.clusterId) ?? []), block]);
    } else {
      spin.add(mesh);
    }
  });

  // Each cluster is its own group, so it can grow about its own centre.
  const clusters: SceneClusterView[] = [];
  for (const cluster of spec.clusters) {
    const members = byCluster.get(cluster.id);
    const run = runs.get(cluster.id);
    if (!members || members.length === 0 || !run) continue;

    const left = at(run.from, run.row);
    const right = at(run.to, run.row);
    const centre = new THREE.Vector3((left.x + right.x) / 2, left.y, left.z);

    const group = new THREE.Group();
    group.position.copy(centre);
    members.forEach((b) => {
      b.mesh.position.sub(centre);
      group.add(b.mesh);
    });

    const span = right.x - left.x + cellW;
    const outline = deck
      ? wireBox(span + 0.1, DEPTH + 0.12, cellH + 0.1, TOKEN.accent, 0)
      : wireBox(span + 0.1, cellH + 0.1, DEPTH + 0.12, TOKEN.accent, 0);
    group.add(outline);
    spin.add(group);

    clusters.push({
      id: cluster.id,
      group,
      blocks: members,
      outline,
      anchor: deck
        ? new THREE.Vector3(centre.x, centre.y + DEPTH, centre.z)
        : new THREE.Vector3(centre.x, centre.y + cellH / 2, centre.z),
    });
  }

  const radius = Math.max(W, H, D) * 0.62;

  return {
    root,
    spin,
    blocks,
    clusters,
    radius,
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
