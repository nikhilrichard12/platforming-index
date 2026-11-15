"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { animate, createTimeline } from "animejs";
import useReducedMotion from "@/components/ui/useReducedMotion";
import { TOKEN } from "@/lib/anim";
import {
  ProductScene,
  ProductSceneSpec,
  SceneBlock,
  buildProductScene,
} from "@/lib/models/productScene";

/**
 * The stage is the answer.
 *
 * One product, drawn in line art from its own parts, turning slowly. Then the
 * interfaces this page lands on light up in accent, one after another, each
 * with the parts it owns grouped and outlined and named. Everything else in
 * the product stays grey, because everything else is still a part.
 */

const FOV = 28;
/**
 * The product fills this share of the stage. The fit is taken at the widest
 * turn, so a long product never clips as it comes round, which means it reads
 * a little smaller than this at every other angle.
 */
const FILL = 0.82;
const TURN_SECONDS = 20;
const STEP_MS = 1500; // between one interface lighting and the next
const LIGHT_MS = 420; // every transition stays under 600ms
const GROW = 1.1;

export interface StageCluster {
  id: string;
  /** The line beside the lit cluster: "Power stage interface. On 6 products since 2019." */
  label: string;
  partIds: string[];
}

export interface InterfaceStageHandle {
  /** Run the lighting sequence again from the start. */
  replay(): void;
  /** Make one cluster jump, for a card the reader clicked. */
  pulse(id: string): void;
}

interface Props {
  productId: string;
  parts: { id: string; name: string }[];
  clusters: StageCluster[];
  shell: ProductSceneSpec["shell"];
  /** A cluster the reader is pointing at somewhere else on the panel. */
  hovered?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}

const GREY = new THREE.Color(TOKEN.text3);
const LIT = new THREE.Color(TOKEN.accent);
const FACE = new THREE.Color(TOKEN.panel);
const FACE_LIT = new THREE.Color(TOKEN.panel2);

const InterfaceStage = forwardRef<InterfaceStageHandle, Props>(function InterfaceStage(
  { productId, parts, clusters, shell, hovered, onHover, onSelect },
  ref
) {
  const reduced = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labelLayer = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  const [error, setError] = useState("");
  const [lit, setLit] = useState<string[]>([]);

  /** A new product or a new set of interfaces is a new scene. */
  const key = useMemo(
    () => `${productId}:${clusters.map((c) => c.id).join(",")}:${parts.length}`,
    [productId, clusters, parts.length]
  );

  const engine = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    product: ProductScene;
    raf: number;
    last: number;
    paused: boolean;
    visible: boolean;
    timeline: ReturnType<typeof createTimeline> | null;
    /**
     * How far each cluster has lit, 0 to 1, and how far it has grown, both
     * indexed by the cluster's position. anime tweens the entries of a plain
     * object by key, and a key has to be a plain one.
     */
    level: Record<number, number>;
    scale: Record<number, number>;
    index: Map<string, number>;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    hoverId: string | null;
  } | null>(null);

  /** Paint one block for how lit its cluster is. */
  const paint = useCallback((block: SceneBlock, t: number) => {
    const edge = block.edges.material as THREE.LineBasicMaterial;
    edge.color.copy(GREY).lerp(LIT, t);
    edge.opacity = 0.9 + 0.1 * t;
    const face = block.mesh.material as THREE.MeshBasicMaterial;
    face.color.copy(FACE).lerp(FACE_LIT, t);
  }, []);

  const apply = useCallback(() => {
    const e = engine.current;
    if (!e) return;
    e.product.clusters.forEach((cluster, i) => {
      const t = e.level[i] ?? 0;
      const s = e.scale[i] ?? 1;
      cluster.blocks.forEach((b) => paint(b, t));
      const out = cluster.outline.material as THREE.LineBasicMaterial;
      out.opacity = t * (e.hoverId === cluster.id ? 1 : 0.75);
      cluster.group.scale.setScalar(s);
    });
  }, [paint]);

  /* ---------- the scene ---------- */

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: el,
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    const product = buildProductScene({
      shell,
      parts,
      clusters: clusters.map((c) => ({ id: c.id, partIds: c.partIds })),
    });
    scene.add(product.root);

    const e = {
      renderer,
      camera,
      scene,
      product,
      raf: 0,
      last: performance.now(),
      paused: false,
      visible: true,
      timeline: null as ReturnType<typeof createTimeline> | null,
      level: {} as Record<number, number>,
      scale: {} as Record<number, number>,
      index: new Map(product.clusters.map((c, i) => [c.id, i])),
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(-2, -2),
      hoverId: null as string | null,
    };
    product.clusters.forEach((_, i) => {
      e.level[i] = 0;
      e.scale[i] = 1;
    });
    engine.current = e;

    // The camera sits where the product fills its share of the stage at its
    // widest turn, so nothing clips as it comes round. Every corner of the
    // model is checked at a ring of angles, the way the part viewer does it.
    const bounds = new THREE.Box3().setFromObject(product.spin);
    const centre = new THREE.Vector3();
    bounds.getCenter(centre);
    const corners: THREE.Vector3[] = [];
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z])
          corners.push(new THREE.Vector3(x, y, z).sub(centre));

    // A flat product is read from above; an upright one almost face on.
    const elevation = shell === "rack" ? 0.42 : 0.16;
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const right = new THREE.Vector3();
    const upView = new THREE.Vector3();

    const fit = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (w < 2 || h < 2) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      const distFrom = (d: THREE.Vector3) => {
        right.crossVectors(up, d).normalize();
        upView.crossVectors(d, right);
        let out = 0;
        for (const c of corners) {
          const x = Math.abs(c.dot(right));
          const y = Math.abs(c.dot(upView));
          const z = c.dot(d);
          out = Math.max(
            out,
            z + Math.max(x / (tan * camera.aspect * FILL), y / (tan * FILL))
          );
        }
        return out;
      };

      let dist = 0;
      for (let i = 0; i < 16; i++) {
        const az = (i / 16) * Math.PI * 2;
        dir.set(
          Math.sin(az) * Math.cos(elevation),
          Math.sin(elevation),
          Math.cos(az) * Math.cos(elevation)
        );
        dist = Math.max(dist, distFrom(dir));
      }

      dir.set(0, Math.sin(elevation), Math.cos(elevation)).setLength(dist);
      camera.position.copy(centre).add(dir);
      camera.lookAt(centre);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    fit();

    const project = new THREE.Vector3();
    const draw = () => {
      renderer.render(scene, camera);
      // The labels ride on the cluster they name, so they follow the turn.
      const layer = labelLayer.current;
      const lines = svg.current;
      if (!layer || !lines) return;
      const w = box.clientWidth;
      const h = box.clientHeight;
      product.clusters.forEach((cluster, i) => {
        const node = layer.querySelector<HTMLElement>(`[data-label="${cluster.id}"]`);
        const line = lines.querySelector<SVGLineElement>(`[data-line="${cluster.id}"]`);
        if (!node || !line) return;
        const t = e.level[i] ?? 0;
        if (t < 0.05) {
          node.style.opacity = "0";
          line.style.opacity = "0";
          return;
        }
        project.copy(cluster.anchor).applyMatrix4(product.spin.matrixWorld).project(camera);
        const x = (project.x * 0.5 + 0.5) * w;
        const y = (-project.y * 0.5 + 0.5) * h;

        // Labels keep their own slots down the left edge, in the order the
        // interfaces lit. They never cover each other, and the leader line
        // does the pointing.
        const lx = 6;
        const ly = 6 + i * (node.offsetHeight + 6);
        node.style.transform = `translate(${lx}px, ${ly}px)`;
        node.style.opacity = String(t);
        line.setAttribute("x1", String(lx + node.offsetWidth));
        line.setAttribute("y1", String(ly + node.offsetHeight / 2));
        line.setAttribute("x2", x.toFixed(1));
        line.setAttribute("y2", y.toFixed(1));
        line.style.opacity = String(t * 0.9);
      });
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - e.last) / 1000);
      e.last = now;
      if (!e.paused && !reduced) {
        product.spin.rotation.y += (dt * Math.PI * 2) / TURN_SECONDS;
      }
      product.spin.updateMatrixWorld();

      // What the pointer is over, so a lit part can name its own card.
      if (e.pointer.x > -1.5) {
        e.raycaster.setFromCamera(e.pointer, camera);
        const hit = e.raycaster.intersectObjects(
          product.clusters.flatMap((c) => c.blocks.map((b) => b.mesh)),
          false
        )[0];
        const id = (hit?.object.userData.clusterId as string) ?? null;
        const at = id ? e.index.get(id) : undefined;
        const alive = id && at !== undefined && (e.level[at] ?? 0) > 0.5 ? id : null;
        if (alive !== e.hoverId) {
          e.hoverId = alive;
          onHover?.(alive);
        }
      }

      apply();
      draw();
      e.raf = requestAnimationFrame(frame);
    };
    e.raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      e.visible = !document.hidden;
      if (e.visible && !e.raf) e.raf = requestAnimationFrame(frame);
      if (!e.visible) {
        cancelAnimationFrame(e.raf);
        e.raf = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      cancelAnimationFrame(e.raf);
      e.timeline?.revert();
      product.dispose();
      renderer.dispose();
      engine.current = null;
    };
    // The scene is rebuilt only when the product or its interfaces change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);

  /* ---------- the lighting sequence ---------- */

  const play = useCallback(() => {
    const e = engine.current;
    if (!e) return;
    e.timeline?.revert();
    e.timeline = null;

    const ids = e.product.clusters.map((c) => c.id);
    if (reduced) {
      ids.forEach((_, i) => {
        e.level[i] = 1;
        e.scale[i] = GROW;
      });
      setLit(ids);
      apply();
      return;
    }

    ids.forEach((_, i) => {
      e.level[i] = 0;
      e.scale[i] = 1;
    });
    setLit([]);

    // One interface lights at a time, 1.5s apart, and both hold.
    const tl = createTimeline({ defaults: { ease: "outQuad" } });
    ids.forEach((id, i) => {
      const at = 200 + i * STEP_MS;
      tl.add(e.level, { [i]: 1, duration: LIGHT_MS }, at)
        .add(e.scale, { [i]: GROW, duration: LIGHT_MS, ease: "outBack" }, at)
        .call(() => setLit((l) => (l.includes(id) ? l : [...l, id])), at);
    });
    e.timeline = tl;
  }, [reduced, apply]);

  useEffect(() => {
    play();
  }, [play, key]);

  /** A cluster the reader is pointing at from the cards. */
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.hoverId = hovered ?? e.hoverId;
    e.product.clusters.forEach((c, i) => {
      if ((e.level[i] ?? 0) < 0.5) return;
      animate(e.scale, {
        [i]: hovered === c.id ? GROW + 0.06 : GROW,
        duration: 240,
        ease: "outQuad",
      });
    });
  }, [hovered]);

  useImperativeHandle(
    ref,
    () => ({
      replay: () => play(),
      pulse: (id: string) => {
        const e = engine.current;
        const i = e?.index.get(id);
        if (!e || i === undefined || (e.level[i] ?? 0) < 0.5 || reduced) return;
        animate(e.scale, {
          [i]: [GROW, GROW + 0.14, GROW],
          duration: 420,
          ease: "inOutQuad",
        });
      },
    }),
    [play, reduced]
  );

  /* ---------- pointer ---------- */

  function onPointerMove(ev: React.PointerEvent<HTMLCanvasElement>) {
    const e = engine.current;
    const box = wrap.current;
    if (!e || !box) return;
    const rect = box.getBoundingClientRect();
    e.pointer.set(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  const byId = useMemo(
    () => new Map(clusters.map((c) => [c.id, c])),
    [clusters]
  );

  return (
    <div className="relative h-full w-full bg-panel">
      <div
        ref={wrap}
        className="relative h-full w-full overflow-hidden"
        onPointerEnter={() => {
          const e = engine.current;
          if (e) e.paused = true;
        }}
        onPointerLeave={() => {
          const e = engine.current;
          if (!e) return;
          e.paused = false;
          e.pointer.set(-2, -2);
          if (e.hoverId) {
            e.hoverId = null;
            onHover?.(null);
          }
        }}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label={`${productId}, with ${clusters.length} matched ${
            clusters.length === 1 ? "interface" : "interfaces"
          } lit`}
          onPointerMove={onPointerMove}
          onClick={() => {
            const id = engine.current?.hoverId;
            if (id) onSelect?.(id);
          }}
          className="absolute inset-0 block h-full w-full select-none"
        />

        {error && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-[12px] text-risk">
            The 3D view could not start: {error}
          </p>
        )}

        <svg ref={svg} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
          {clusters.map((c) => (
            <line
              key={c.id}
              data-line={c.id}
              stroke={TOKEN.accent}
              strokeWidth="1"
              style={{ opacity: 0 }}
            />
          ))}
        </svg>

        <div ref={labelLayer} className="pointer-events-none absolute inset-0">
          {clusters.map((c) => (
            <div
              key={c.id}
              data-label={c.id}
              style={{ opacity: 0 }}
              className="absolute left-0 top-0 w-[58%] border border-line bg-panel px-2 py-[3px] text-[11px] leading-tight text-text"
            >
              {byId.get(c.id)?.label}
            </div>
          ))}
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-[6px] left-2 text-[10px] leading-[12px] text-text-3">
        {productId}
        {lit.length > 0
          ? `, ${lit.length} ${lit.length === 1 ? "interface" : "interfaces"} lit`
          : ""}
        . Illustrative, not CAD.
      </p>
    </div>
  );
});

export default InterfaceStage;
