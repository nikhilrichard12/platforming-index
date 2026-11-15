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
  buildProductScene,
} from "@/lib/models/productScene";

/**
 * The stage answers the question, in the order a person would ask it.
 *
 * The product draws itself in grey line art. Each part this page named lifts
 * out of it, turns green and says its name. The parts that share an interface
 * slide together, an accent outline closes around them and the boundary names
 * itself. Anything with nothing behind it stays an empty yellow slot marked
 * new. Then the product turns slowly until someone points at it.
 *
 * The whole sequence runs in about five seconds and no single move takes more
 * than 600ms: a reader is waiting for an answer, not a show.
 */

const FOV = 28;
/** The product fills this share of the stage at its widest turn. */
const FILL = 0.85;
const TURN_SECONDS = 20;

/* the sequence, in ms */
const DRAW = 420;
const PART_STEP = 420;
const LIFT_MS = 260;
const LABEL_HOLD = 800;
const SETTLE_MS = 240;
const GROUP_MS = 420;
const OUTLINE_MS = 300;

export interface StageCluster {
  id: string;
  /** "Half bridge power stage. On 6 products since 2019." */
  label: string;
  partIds: string[];
}

export interface StageMatch {
  partId: string;
  /** The part's name, shown while it is lifted. */
  label: string;
}

export interface InterfaceStageHandle {
  replay(): void;
  pulse(id: string): void;
}

interface Props {
  productId: string;
  parts: { id: string; name: string }[];
  /** The parts this page matched, in page order. */
  matched: StageMatch[];
  clusters: StageCluster[];
  /** Needs with nothing behind them. */
  newCount: number;
  shell: ProductSceneSpec["shell"];
  hovered?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  /** Fires when the sequence lands, for the figures below the stage. */
  onSettled?: () => void;
}

const GREY = new THREE.Color(TOKEN.text3);
const GREEN = new THREE.Color(TOKEN.positive);
const FACE = new THREE.Color(TOKEN.panel);
const FACE_LIT = new THREE.Color(TOKEN.panel2);

const InterfaceStage = forwardRef<InterfaceStageHandle, Props>(function InterfaceStage(
  {
    productId,
    parts,
    matched,
    clusters,
    newCount,
    shell,
    hovered,
    onHover,
    onSelect,
    onSettled,
  },
  ref
) {
  const reduced = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labelLayer = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const settledRef = useRef<(() => void) | undefined>(undefined);
  settledRef.current = onSettled;

  const [error, setError] = useState("");
  const [lit, setLit] = useState(0);

  /** A new product, or new matches, is a new scene. */
  const key = useMemo(
    () =>
      [
        productId,
        parts.length,
        newCount,
        matched.map((m) => m.partId).join(","),
        clusters.map((c) => `${c.id}:${c.partIds.join("+")}`).join(","),
      ].join("|"),
    [productId, parts.length, newCount, matched, clusters]
  );

  const engine = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    product: ProductScene;
    raf: number;
    last: number;
    paused: boolean;
    turning: boolean;
    timeline: ReturnType<typeof createTimeline> | null;
    /** Driven by anime, all 0 to 1: the draw, then per part, cluster, slot. */
    draw: { v: number };
    green: Record<number, number>;
    out: Record<number, number>;
    partLabel: Record<number, number>;
    group: Record<number, number>;
    ring: Record<number, number>;
    slot: Record<number, number>;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    hoverId: string | null;
  } | null>(null);

  const apply = useCallback(() => {
    const e = engine.current;
    if (!e) return;
    const { product } = e;

    product.shell.forEach((line) => {
      const m = (line as THREE.LineSegments).material as THREE.LineBasicMaterial;
      m.opacity = ((line.userData.base as number) ?? 0.75) * e.draw.v;
    });

    const indexOfPart = new Map(matched.map((m, i) => [m.partId, i]));
    product.blocks.forEach((b) => {
      const edge = b.edges.material as THREE.LineBasicMaterial;
      const face = b.mesh.material as THREE.MeshBasicMaterial;
      const i = indexOfPart.get(b.partId);
      const green = i === undefined ? 0 : e.green[i] ?? 0;
      const out = i === undefined ? 0 : e.out[i] ?? 0;
      const ring = b.clusterId
        ? product.clusters.findIndex((c) => c.id === b.clusterId)
        : -1;
      const pull = ring >= 0 ? e.group[ring] ?? 0 : 0;

      edge.color.copy(GREY).lerp(GREEN, green);
      edge.opacity = (0.9 + 0.1 * green) * e.draw.v;
      face.color.copy(FACE).lerp(FACE_LIT, green);

      b.mesh.position.copy(b.home).lerp(b.tight, pull).addScaledVector(b.lift, out);
      b.mesh.scale.setScalar(1 + 0.12 * out);
    });

    product.clusters.forEach((c, i) => {
      const t = e.ring[i] ?? 0;
      const m = c.outline.material as THREE.LineBasicMaterial;
      m.opacity = t * (e.hoverId === c.id ? 1 : 0.85);
      c.outline.scale.set(Math.max(0.001, t), 1, 1);
    });

    product.slots.forEach((s, i) => {
      const m = s.outline.material as THREE.LineBasicMaterial;
      m.opacity = (e.slot[i] ?? 0) * 0.9;
    });
  }, [matched]);

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
      matched: matched.map((m) => m.partId),
      clusters: clusters.map((c) => ({ id: c.id, partIds: c.partIds })),
      newCount,
    });
    product.shell.forEach((line) => {
      line.userData.base = (
        (line as THREE.LineSegments).material as THREE.LineBasicMaterial
      ).opacity;
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
      turning: false,
      timeline: null as ReturnType<typeof createTimeline> | null,
      draw: { v: 0 },
      green: {} as Record<number, number>,
      out: {} as Record<number, number>,
      partLabel: {} as Record<number, number>,
      group: {} as Record<number, number>,
      ring: {} as Record<number, number>,
      slot: {} as Record<number, number>,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(-2, -2),
      hoverId: null as string | null,
    };
    matched.forEach((_, i) => {
      e.green[i] = 0;
      e.out[i] = 0;
      e.partLabel[i] = 0;
    });
    product.clusters.forEach((_, i) => {
      e.group[i] = 0;
      e.ring[i] = 0;
    });
    product.slots.forEach((_, i) => (e.slot[i] = 0));
    engine.current = e;

    // The camera fits the product at its widest turn, so nothing clips as it
    // comes round. Every corner is checked at a ring of angles.
    const bounds = new THREE.Box3().setFromObject(product.spin);
    const centre = new THREE.Vector3();
    bounds.getCenter(centre);
    const corners: THREE.Vector3[] = [];
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z])
          corners.push(new THREE.Vector3(x, y, z).sub(centre));

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
    /** Put one label in its slot down the left edge, pointing at its subject. */
    const place = (
      node: HTMLElement,
      line: SVGLineElement | null,
      anchor: THREE.Vector3,
      t: number,
      slot: number,
      w: number,
      h: number
    ) => {
      if (t < 0.05) {
        node.style.opacity = "0";
        if (line) line.style.opacity = "0";
        return;
      }
      project.copy(anchor).applyMatrix4(product.spin.matrixWorld).project(camera);
      const x = (project.x * 0.5 + 0.5) * w;
      const y = (-project.y * 0.5 + 0.5) * h;
      const lx = 6;
      const ly = Math.min(h - node.offsetHeight - 6, 6 + slot * (node.offsetHeight + 6));
      node.style.transform = `translate(${lx}px, ${ly}px)`;
      node.style.opacity = String(t);
      if (line) {
        line.setAttribute("x1", String(lx + node.offsetWidth));
        line.setAttribute("y1", String(ly + node.offsetHeight / 2));
        line.setAttribute("x2", x.toFixed(1));
        line.setAttribute("y2", y.toFixed(1));
        line.style.opacity = String(t * 0.9);
      }
    };

    const lifted = new THREE.Vector3();
    const draw = () => {
      renderer.render(scene, camera);
      const layer = labelLayer.current;
      const lines = svg.current;
      if (!layer || !lines) return;
      const w = box.clientWidth;
      const h = box.clientHeight;

      product.clusters.forEach((cluster, i) => {
        const node = layer.querySelector<HTMLElement>(`[data-label="${cluster.id}"]`);
        const line = lines.querySelector<SVGLineElement>(`[data-line="${cluster.id}"]`);
        if (node) place(node, line, cluster.anchor, e.ring[i] ?? 0, i, w, h);
      });

      matched.forEach((m, i) => {
        const node = layer.querySelector<HTMLElement>(`[data-part-label="${m.partId}"]`);
        const line = lines.querySelector<SVGLineElement>(`[data-part-line="${m.partId}"]`);
        const block = product.byPart.get(m.partId);
        if (!node || !block) return;
        lifted.copy(block.mesh.position).add(new THREE.Vector3(0, block.size.y, 0));
        place(node, line, lifted, e.partLabel[i] ?? 0, product.clusters.length, w, h);
      });

      product.slots.forEach((s, i) => {
        const node = layer.querySelector<HTMLElement>(`[data-slot="${i}"]`);
        if (node)
          place(node, null, s.anchor, e.slot[i] ?? 0, product.clusters.length + 1 + i, w, h);
      });
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - e.last) / 1000);
      e.last = now;
      if (e.turning && !e.paused && !reduced) {
        product.spin.rotation.y += (dt * Math.PI * 2) / TURN_SECONDS;
      }
      product.spin.updateMatrixWorld();

      if (e.pointer.x > -1.5) {
        e.raycaster.setFromCamera(e.pointer, camera);
        const hit = e.raycaster.intersectObjects(
          product.blocks.map((b) => b.mesh),
          false
        )[0];
        const id = (hit?.object.userData.clusterId as string) ?? null;
        const at = id ? product.clusters.findIndex((c) => c.id === id) : -1;
        const alive = at >= 0 && (e.ring[at] ?? 0) > 0.5 ? id : null;
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
      if (document.hidden) {
        cancelAnimationFrame(e.raf);
        e.raf = 0;
      } else if (!e.raf) {
        e.last = performance.now();
        e.raf = requestAnimationFrame(frame);
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
    // The scene is rebuilt only when the product or its matches change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);

  /* ---------- the sequence ---------- */

  const play = useCallback(() => {
    const e = engine.current;
    if (!e) return;
    e.timeline?.revert();
    e.timeline = null;
    e.turning = false;

    const parts = Object.keys(e.green).length;
    const rings = e.product.clusters.length;
    const slots = e.product.slots.length;

    if (reduced) {
      e.draw.v = 1;
      for (let i = 0; i < parts; i++) {
        e.green[i] = 1;
        e.out[i] = 0;
        e.partLabel[i] = 0;
      }
      for (let i = 0; i < rings; i++) {
        e.group[i] = 1;
        e.ring[i] = 1;
      }
      for (let i = 0; i < slots; i++) e.slot[i] = 1;
      apply();
      setLit(rings);
      settledRef.current?.();
      return;
    }

    e.draw.v = 0;
    for (let i = 0; i < parts; i++) {
      e.green[i] = 0;
      e.out[i] = 0;
      e.partLabel[i] = 0;
    }
    for (let i = 0; i < rings; i++) {
      e.group[i] = 0;
      e.ring[i] = 0;
    }
    for (let i = 0; i < slots; i++) e.slot[i] = 0;
    setLit(0);

    const tl = createTimeline({ defaults: { ease: "outQuad" } });

    // a) the product draws itself
    tl.add(e.draw, { v: 1, duration: DRAW }, 0);

    // b) each matched part lifts out, turns green, says its name, settles
    let at = DRAW + 160;
    for (let i = 0; i < parts; i++) {
      tl.add(e.out, { [i]: 1, duration: LIFT_MS, ease: "outBack" }, at)
        .add(e.green, { [i]: 1, duration: LIFT_MS }, at)
        .add(e.partLabel, { [i]: 1, duration: 150 }, at + 60)
        .add(e.partLabel, { [i]: 0, duration: 150 }, at + 60 + LABEL_HOLD)
        .add(e.out, { [i]: 0, duration: SETTLE_MS, ease: "inOutQuad" }, at + LABEL_HOLD + 150);
      at += PART_STEP;
    }

    // c) each interface closes its group and names itself
    let ringAt = at + 100;
    for (let i = 0; i < rings; i++) {
      tl.add(e.group, { [i]: 1, duration: GROUP_MS, ease: "inOutQuad" }, ringAt)
        .add(e.ring, { [i]: 1, duration: OUTLINE_MS }, ringAt + GROUP_MS - 120)
        .call(() => setLit((n) => Math.max(n, i + 1)), ringAt + GROUP_MS);
      ringAt += 300;
    }

    // d) what has no home yet
    const slotAt = ringAt + 100;
    for (let i = 0; i < slots; i++) {
      tl.add(e.slot, { [i]: 1, duration: 260 }, slotAt + i * 90);
    }

    // e) and then it turns
    tl.call(() => {
      e.turning = true;
      settledRef.current?.();
    }, slotAt + slots * 90 + 300);

    e.timeline = tl;
  }, [reduced, apply]);

  useEffect(() => {
    play();
  }, [play, key]);

  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.hoverId = hovered ?? e.hoverId;
  }, [hovered]);

  useImperativeHandle(
    ref,
    () => ({
      replay: () => play(),
      pulse: (id: string) => {
        const e = engine.current;
        const i = e?.product.clusters.findIndex((c) => c.id === id) ?? -1;
        if (!e || i < 0 || (e.ring[i] ?? 0) < 0.5 || reduced) return;
        animate(e.ring, { [i]: [1, 0.25, 1], duration: 420, ease: "inOutQuad" });
      },
    }),
    [play, reduced]
  );

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
          aria-label={`${productId}, ${matched.length} parts matched, ${clusters.length} interfaces`}
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
          {matched.map((m) => (
            <line
              key={m.partId}
              data-part-line={m.partId}
              stroke={TOKEN.positive}
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
              {c.label}
            </div>
          ))}
          {matched.map((m) => (
            <div
              key={m.partId}
              data-part-label={m.partId}
              style={{ opacity: 0 }}
              className="absolute left-0 top-0 w-[58%] truncate border border-line bg-panel px-2 py-[3px] text-[11px] leading-tight text-positive"
            >
              {m.label}
            </div>
          ))}
          {Array.from({ length: newCount }, (_, i) => (
            <div
              key={i}
              data-slot={i}
              style={{ opacity: 0 }}
              className="absolute left-0 top-0 border border-line bg-panel px-2 py-[2px] text-[11px] leading-tight text-warn"
            >
              new
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => play()}
          className="absolute bottom-2 right-2 h-[26px] rounded-full border border-line-2 bg-panel-2 px-3 text-[12px] text-text transition-colors hover:border-text-2"
        >
          Replay
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-[8px] left-2 text-[10px] leading-[12px] text-text-3">
        {productId}
        {lit > 0 ? `, ${lit} ${lit === 1 ? "interface" : "interfaces"} lit` : ""}.
        Illustrative, not CAD.
      </p>
    </div>
  );
});

export default InterfaceStage;
