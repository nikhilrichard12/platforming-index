import * as THREE from "three";
import { TOKEN, mixHex } from "@/lib/anim";

/**
 * Shared pieces for the procedural models: toon shading, thin edge lines and a
 * warm rim light, all from the design tokens. Nothing here loads a file.
 */

export const EDGE_BASE = new THREE.Color(TOKEN.line2);
const RIM_COLOR = new THREE.Color(TOKEN.accent);
/** The rim light every model starts from. */
export const RIM_BASE_DEFAULT = 0.16;

/** A 3 step ramp: flat toon shading rather than a smooth gradient. */
export function toonRamp(): THREE.DataTexture {
  const data = new Uint8Array([84, 150, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** The greys all come from the design tokens, mixed, so nothing leaves the palette. */
export const GREY = {
  body: mixHex(TOKEN.panel2, TOKEN.line2, 0.12),
  dark: mixHex(TOKEN.surface, TOKEN.panel2, 0.7),
  mid: mixHex(TOKEN.panel2, TOKEN.line2, 0.45),
  light: mixHex(TOKEN.line2, TOKEN.text2, 0.55),
  pale: mixHex(TOKEN.text3, TOKEN.text2, 0.6),
};
export type Shade = keyof typeof GREY;

/**
 * What the stage moves. A piece sits at `home` and travels `offset` when the
 * subject explodes, in the order given so the parts separate one after another.
 */
export interface RigPiece {
  group: THREE.Object3D;
  home: THREE.Vector3;
  offset: THREE.Vector3;
  order: number;
}

/** Everything the stage draws at once: the searched part, or the whole product. */
export interface Rig {
  root: THREE.Group;
  pieces: RigPiece[];
  /** How many distinct steps the pieces separate in. */
  orders: number;
  dispose(): void;
}

export function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const m = obj as THREE.Mesh | THREE.LineSegments;
    m.geometry?.dispose?.();
    const mat = (m as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose?.();
  });
}

export interface KitPiece {
  group: THREE.Group;
  offset: THREE.Vector3;
}

/** Builds one object's meshes, grouped into pieces that can separate. */
export class Kit {
  readonly group = new THREE.Group();
  readonly pieces: KitPiece[] = [];
  private target: THREE.Group = this.group;
  private readonly cache = new Map<Shade, THREE.MeshToonMaterial>();
  private readonly edgeMat: THREE.LineBasicMaterial;

  /**
   * `tint` pulls every shade towards one token colour, for a stage where the
   * colour carries meaning. The grey ramp still does the shading, so a tinted
   * model reads as the same drawing in a different ink.
   */
  constructor(
    private readonly ramp: THREE.DataTexture,
    private readonly rim = RIM_BASE_DEFAULT,
    private readonly tint?: string
  ) {
    this.edgeMat = new THREE.LineBasicMaterial({
      color: tint ? new THREE.Color(mixHex(TOKEN.line2, tint, 0.55)) : EDGE_BASE.clone(),
    });
  }

  /** Everything built inside `fn` is one piece, and travels `offset` when exploded. */
  piece(offset: [number, number, number], fn: () => void) {
    const g = new THREE.Group();
    this.group.add(g);
    this.pieces.push({ group: g, offset: new THREE.Vector3(...offset) });
    const prev = this.target;
    this.target = g;
    fn();
    this.target = prev;
  }

  private material(shade: Shade): THREE.MeshToonMaterial {
    const hit = this.cache.get(shade);
    if (hit) return hit;
    const mat = new THREE.MeshToonMaterial({
      color: this.tint ? mixHex(GREY[shade], this.tint, 0.62) : GREY[shade],
      gradientMap: this.ramp,
    });
    // Warm orange rim light: a fresnel term added in the toon fragment shader.
    const rim = { value: this.rim };
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRimStrength = rim;
      shader.uniforms.uRimColor = { value: RIM_COLOR };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uRimStrength;\nuniform vec3 uRimColor;"
        )
        .replace(
          "#include <opaque_fragment>",
          `float piRim = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.4);
	outgoingLight += uRimColor * piRim * uRimStrength;
	#include <opaque_fragment>`
        );
    };
    // One program for every rim-lit toon material, so a rig compiles it once.
    mat.customProgramCacheKey = () => "pi-toon-rim";
    this.cache.set(shade, mat);
    return mat;
  }

  private place(geo: THREE.BufferGeometry, shade: Shade, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(geo, this.material(shade));
    mesh.position.set(x, y, z);
    // Thin outline: only the hard edges, as in a technical drawing.
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), this.edgeMat));
    this.target.add(mesh);
    return mesh;
  }

  /** A box from its centre. */
  box(w: number, h: number, d: number, x: number, y: number, z: number, shade: Shade = "body") {
    return this.place(new THREE.BoxGeometry(w, h, d), shade, x, y, z);
  }

  /** A cylinder from its centre. Axis is Y unless `axis` says otherwise. */
  cyl(
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    shade: Shade = "body",
    axis: "x" | "y" | "z" = "y",
    seg = 28
  ) {
    const mesh = this.place(new THREE.CylinderGeometry(r, r, h, seg), shade, x, y, z);
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  /** The pieces as rig pieces at the origin, or the whole object as one piece if none were made. */
  toRig(ramp: THREE.DataTexture): Rig {
    const root = new THREE.Group();
    root.add(this.group);
    const list = this.pieces.length
      ? this.pieces
      : [{ group: this.group, offset: new THREE.Vector3(0, 0.6, 0) }];
    const pieces: RigPiece[] = list.map((p, order) => ({
      group: p.group,
      home: new THREE.Vector3(),
      offset: p.offset.clone(),
      order,
    }));
    return {
      root,
      pieces,
      orders: pieces.length,
      dispose() {
        disposeObject(root);
        ramp.dispose();
      },
    };
  }
}
