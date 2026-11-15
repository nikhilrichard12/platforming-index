"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createTimeline } from "animejs";
import useReducedMotion from "@/components/ui/useReducedMotion";
import type { Rig } from "@/lib/models/kit";
import { HERO_PRODUCT } from "@/lib/models/product";
import { StageSubject, buildRig } from "@/lib/models/parts";

type Mode = "assembled" | "exploded";
type Timeline = ReturnType<typeof createTimeline>;

/* ---------- constants ---------- */

const FOV = 30;
const ELEVATION = 0.3; // radians above the horizon
const IDLE_SPEED = 0.15; // radians per second
const IDLE_RESUME_MS = 3000; // auto-rotation comes back this long after a drag ends
const INTRO_HOLD_MS = 800;
/** The model fills this share of the view across, and up to FILL_Y_MAX tall at its widest turn. */
const FILL_X = 0.86;
const FILL_Y_MAX = 0.84;
/** Space kept clear above and below the model for the controls and the label. */
const EDGE_PX = 34;
const FIT_STEPS = 24; // azimuths sampled to find the worst-case distance
/**
 * The camera is fitted to the part as it looks from the current angle, so a
 * long thin part does not shrink as it turns end-on. It never comes in closer
 * than this share of the worst-case distance, so the dolly stays gentle.
 */
const CLOSEST_SHARE = 0.6;
/** The longest the pieces take to start separating, however many there are. */
const SEPARATE_SPREAD_MS = 600;

interface State {
  /** How far each step of pieces has separated, 0 to 1. */
  open: Record<number, number>;
  callout: number;
  az: number;
}

interface CalloutEls {
  svg: SVGSVGElement;
  line: SVGLineElement;
  dot: SVGCircleElement;
  label: HTMLElement;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ---------- the engine: three.js scene plus anime.js timelines ---------- */

class Engine {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 200);
  private readonly controls: OrbitControls;
  private rig: Rig;
  private rigKey = ""; // the searched part's id, or "" for the whole inverter
  private subject: StageSubject | null = null;
  private readonly S: State;

  private timeline: Timeline | null = null;
  private raf = 0;
  private last = 0;
  private running = false;
  private reduced = false;
  private visible = true;
  private onScreen = true;
  private mode: Mode = "assembled";
  private timers: number[] = [];
  private disposed = false;

  // orbit and turn bookkeeping
  private lastAz = 0;
  private userHold = false; // a drag is on, or just ended
  private resumeTimer = 0;
  private driving = false;

  // size and callout
  private w = 0;
  private h = 0;
  private callout: CalloutEls | null = null;
  private labelBox: Box | null = null;
  private readonly v = new THREE.Vector3();
  private readonly anchor = new THREE.Vector3();
  private readonly box = new THREE.Box3();
  /** Each piece's box when assembled, so its box at any moment is that plus how far it has travelled. */
  private bases: THREE.Box3[] = [];
  private corners: THREE.Vector3[] = [];
  private readonly center = new THREE.Vector3();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onMode: (m: Mode) => void
  ) {
    // Throws when WebGL is unavailable. The component shows that, it does not hide it.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.rig = buildRig(null);
    this.scene.add(this.rig.root);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 2.3);
    key.position.set(4, 8, 6);
    this.scene.add(key);
    this.scene.add(new THREE.DirectionalLight(0xffffff, 0.7).translateX(-6).translateY(3).translateZ(-2));

    this.S = {
      open: this.closedSteps(),
      callout: 0,
      az: 0,
    };

    // Drag to rotate. No zoom, no pan. Damping gives the drag some weight.
    this.camera.position.set(0, 1.9 + Math.sin(ELEVATION) * 12, Math.cos(ELEVATION) * 12);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 1.9, 0);
    this.measureRig();
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.rotateSpeed = 0.7;
    this.controls.minPolarAngle = 0.85;
    this.controls.maxPolarAngle = 1.62;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.ROTATE };
    this.controls.addEventListener("start", this.onDragStart);
    this.controls.addEventListener("end", this.onDragEnd);
    this.controls.addEventListener("change", this.onControlsChange);
    this.controls.update();

    this.apply();
  }

  private closedSteps(): Record<number, number> {
    return Object.fromEntries(Array.from({ length: this.rig.orders }, (_, i) => [i, 0]));
  }

  /* ----- lifecycle ----- */

  setSize(w: number, h: number) {
    if (w < 2 || h < 2) return;
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.running) this.renderOnce();
  }

  setCallout(els: CalloutEls | null) {
    this.callout = els;
  }

  /** The label's box inside the canvas, so the leader line can start at its edge. */
  setLabelBox(box: Box | null) {
    this.labelBox = box;
    if (!this.running) this.updateCallout();
  }

  setVisibility(v: { document?: boolean; onScreen?: boolean }) {
    if (v.document !== undefined) this.visible = v.document;
    if (v.onScreen !== undefined) this.onScreen = v.onScreen;
    this.syncLoop();
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
    // Damping keeps moving after a drag ends, which needs a running loop.
    this.controls.enableDamping = !reduced;
    if (reduced) {
      this.timeline?.pause();
      this.snap(this.mode);
    }
    this.syncLoop();
  }

  private syncLoop() {
    const shouldRun = !this.reduced && this.visible && this.onScreen && !this.disposed;
    if (shouldRun && !this.running) {
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    } else if (!shouldRun && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
    if (!shouldRun && !this.disposed) this.renderOnce();
  }

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.userHold) this.S.az += dt * IDLE_SPEED;
    this.apply();
    this.driveCamera();
    this.renderer.render(this.scene, this.camera);
    this.updateCallout();
    this.raf = requestAnimationFrame(this.frame);
  };

  private renderOnce() {
    if (this.disposed || this.w < 2) return;
    this.apply();
    this.driveCamera();
    this.renderer.render(this.scene, this.camera);
    this.updateCallout();
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.resumeTimer);
    this.timeline?.pause();
    this.timers.forEach((t) => window.clearTimeout(t));
    this.controls.removeEventListener("start", this.onDragStart);
    this.controls.removeEventListener("end", this.onDragEnd);
    this.controls.removeEventListener("change", this.onControlsChange);
    this.controls.dispose();
    this.rig.dispose();
    this.renderer.dispose();
  }

  private later(ms: number, fn: () => void) {
    const id = window.setTimeout(() => {
      this.timers = this.timers.filter((t) => t !== id);
      if (!this.disposed) fn();
    }, ms);
    this.timers.push(id);
  }

  /* ----- the drag ----- */

  private onDragStart = () => {
    window.clearTimeout(this.resumeTimer);
    this.userHold = true;
    this.syncAz();
  };

  private onDragEnd = () => {
    window.clearTimeout(this.resumeTimer);
    // Idle rotation comes back a few seconds after the user lets go.
    this.resumeTimer = window.setTimeout(() => {
      this.syncAz();
      this.userHold = false;
    }, IDLE_RESUME_MS);
  };

  /** With the loop stopped (reduced motion), a drag has to draw its own frames. */
  private onControlsChange = () => {
    if (this.running || this.driving || this.disposed) return;
    this.renderer.render(this.scene, this.camera);
    this.updateCallout();
  };

  /* ----- placing the model ----- */

  private place(open: (order: number) => number) {
    for (const p of this.rig.pieces) {
      p.group.position.copy(p.home).addScaledVector(p.offset, open(p.order));
    }
  }

  private apply() {
    this.place((o) => this.S.open[o] ?? 0);
  }

  /**
   * The camera keeps the angle the user gave it. Each frame it fits itself to
   * the part where it is right now (centre and distance), adds the idle turn,
   * then lets OrbitControls apply the drag and its damping on top.
   */
  private driveCamera() {
    if (this.h < 2) return;
    const { S, camera, controls, v } = this;

    this.updateBounds();
    v.copy(camera.position).sub(controls.target);
    controls.target.copy(this.center);

    const dAz = S.az - this.lastAz;
    this.lastAz = S.az;
    if (dAz !== 0) {
      const c = Math.cos(dAz);
      const s = Math.sin(dAz);
      const x = v.x * c + v.z * s;
      v.z = -v.x * s + v.z * c;
      v.x = x;
    }
    v.setLength(this.fitDistance(v));
    camera.position.copy(controls.target).add(v);

    this.driving = true;
    controls.update();
    this.driving = false;
  }

  /** Read the camera's real turn back into the state, so the idle turn carries on from it. */
  private syncAz() {
    const v = this.v.copy(this.camera.position).sub(this.controls.target);
    this.S.az = this.lastAz = Math.atan2(v.x, v.z);
  }

  /* ----- fitting the camera to the model ----- */

  /** Measure each piece once, assembled, so its box later is that plus how far it has moved. */
  private measureRig() {
    this.rig.root.updateMatrixWorld(true);
    for (const p of this.rig.pieces) p.group.position.copy(p.home);
    this.rig.root.updateMatrixWorld(true);
    this.bases = this.rig.pieces.map((p) => new THREE.Box3().setFromObject(p.group));
    this.corners = Array.from({ length: this.bases.length * 8 }, () => new THREE.Vector3());
  }

  /** The part's bounding box and its corners, with the pieces where they are now. */
  private updateBounds() {
    const { rig, bases, corners, box } = this;
    box.makeEmpty();
    let c = 0;
    rig.pieces.forEach((p, i) => {
      const o = this.S.open[p.order] ?? 0;
      const dx = p.offset.x * o;
      const dy = p.offset.y * o;
      const dz = p.offset.z * o;
      const b = bases[i];
      for (const x of [b.min.x, b.max.x])
        for (const y of [b.min.y, b.max.y])
          for (const z of [b.min.z, b.max.z]) corners[c++].set(x + dx, y + dy, z + dz);
    });
    for (const k of corners) box.expandByPoint(k);
    box.getCenter(this.center);
  }

  /**
   * How far the camera has to be for the part to fill the view when seen from
   * `offset` (the current direction). Exact for a perspective camera: every
   * corner of every piece is checked. It is never closer than a share of the
   * worst distance over a full turn, which keeps a long thin part from
   * lurching in and out as it comes round end-on.
   */
  private fitDistance(offset: THREE.Vector3): number {
    const { camera, corners, center } = this;
    const tH = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const fillY = clamp((this.h - 2 * EDGE_PX) / this.h, 0.5, FILL_Y_MAX);
    const up = new THREE.Vector3(0, 1, 0);
    const toCam = new THREE.Vector3();
    const right = new THREE.Vector3();
    const upView = new THREE.Vector3();
    const rel = new THREE.Vector3();

    const distFrom = (dir: THREE.Vector3) => {
      right.crossVectors(up, dir).normalize();
      upView.crossVectors(dir, right);
      let d = 0;
      for (const p of corners) {
        rel.copy(p).sub(center);
        const x = Math.abs(rel.dot(right));
        const y = Math.abs(rel.dot(upView));
        const z = rel.dot(dir); // toward the camera: nearer points look bigger
        d = Math.max(d, z + Math.max(x / (tH * camera.aspect * FILL_X), y / (tH * fillY)));
      }
      return d;
    };

    toCam.copy(offset).normalize();
    const here = distFrom(toCam);
    const elevation = Math.asin(clamp(toCam.y, -1, 1));
    let worst = 0;
    for (let i = 0; i < FIT_STEPS; i++) {
      const az = (i / FIT_STEPS) * Math.PI * 2;
      toCam.set(Math.sin(az) * Math.cos(elevation), Math.sin(elevation), Math.cos(az) * Math.cos(elevation));
      worst = Math.max(worst, distFrom(toCam));
    }
    return Math.max(here, CLOSEST_SHARE * worst, 1.5);
  }

  /* ----- the callout ----- */

  /** Projects a point on the part to the screen every frame, so the line follows it. */
  private updateCallout() {
    const el = this.callout;
    if (!el) return;
    const o = this.S.callout;
    if (!this.subject || o < 0.01 || !this.labelBox || this.w < 2) {
      el.svg.style.opacity = "0";
      el.label.style.opacity = "0";
      return;
    }

    // The line ends at the top of the part, so it points at the thing and not through it.
    // (this.box is kept current by updateBounds, once a frame.)
    this.anchor
      .set((this.box.min.x + this.box.max.x) / 2, this.box.max.y, (this.box.min.z + this.box.max.z) / 2)
      .project(this.camera);

    const ax = (this.anchor.x * 0.5 + 0.5) * this.w;
    const ay = (-this.anchor.y * 0.5 + 0.5) * this.h;
    const b = this.labelBox;
    // The line leaves the label from the point on its edge nearest the anchor.
    const sx = clamp(ax, b.x0, b.x1);
    const sy = clamp(ay, b.y0, b.y1);

    el.line.setAttribute("x1", sx.toFixed(1));
    el.line.setAttribute("y1", sy.toFixed(1));
    el.line.setAttribute("x2", ax.toFixed(1));
    el.line.setAttribute("y2", ay.toFixed(1));
    el.dot.setAttribute("cx", ax.toFixed(1));
    el.dot.setAttribute("cy", ay.toFixed(1));
    el.svg.style.opacity = String(o);
    el.label.style.opacity = String(o);
  }

  /* ----- state changes ----- */

  /** Swap what is on stage: the searched part alone, or the whole inverter. */
  private setRig(subject: StageSubject | null) {
    this.timeline?.pause();
    this.scene.remove(this.rig.root);
    this.rig.dispose();
    this.subject = subject;
    this.rigKey = subject?.key ?? "";
    this.rig = buildRig(subject);
    this.scene.add(this.rig.root);
    this.measureRig();
    this.S.open = this.closedSteps();
    this.S.callout = 0;
  }

  /** Jump straight to a state, no motion. */
  private snap(mode: Mode) {
    this.timeline?.pause();
    this.mode = mode;
    for (const k of Object.keys(this.S.open)) this.S.open[+k] = mode === "exploded" ? 1 : 0;
    this.S.callout = this.subject ? 1 : 0;
    if (!this.running) this.renderOnce();
  }

  /**
   * Move to a mode with one anime.js timeline: the pieces part along their
   * axis one after another (the camera follows the changing bounding box on
   * its own), and the callout fades in last. `snapBack` closes the pieces straight away.
   */
  private goto(mode: Mode, opts: { snapBack?: boolean } = {}) {
    this.mode = mode;
    this.onMode(mode);
    if (this.reduced) {
      this.snap(mode);
      return;
    }

    this.timeline?.pause();
    const S = this.S;
    const opening = mode === "exploded";
    const orders = this.rig.orders;
    const step = clamp(SEPARATE_SPREAD_MS / Math.max(1, orders - 1), 30, 70);
    const tl = createTimeline({ defaults: { ease: "outCubic" } });

    // Any callout on screen leaves first.
    tl.add(S, { callout: 0, duration: 160, ease: "outQuad" }, 0);

    const start = opts.snapBack ? 120 : 0;
    for (let i = 0; i < orders; i++) {
      const at = start + (opening ? i * step : (orders - 1 - i) * Math.min(step, 45));
      tl.add(
        S.open,
        { [i]: opening ? 1 : 0, duration: opening ? 950 : 760, ease: opening ? "outCubic" : "inOutCubic" },
        at
      );
    }

    // The callout names the part once the pieces have landed.
    if (this.subject) {
      const landed = start + (opening ? (orders - 1) * step + 950 : 760);
      tl.add(S, { callout: [0, 1], duration: 450, ease: "outQuad" }, landed);
    }

    this.timeline = tl;
  }

  /* ----- what the panel can ask for ----- */

  /** Put a part (or, with null, the whole inverter) on stage and play it from the start. */
  show(subject: StageSubject | null) {
    const key = subject?.key ?? "";
    if (key !== this.rigKey) this.setRig(subject);
    this.intro();
  }

  /**
   * Assembled and turning; then, if a part is on stage, its pieces separate and
   * the callout fades in. The whole inverter just turns, until asked to explode.
   */
  intro(delay = INTRO_HOLD_MS) {
    this.timeline?.pause();
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
    this.snap("assembled");
    this.S.callout = 0;
    this.onMode("assembled");
    if (!this.subject) return;
    this.later(this.reduced ? 0 : delay, () => this.goto("exploded"));
  }

  setMode(mode: Mode) {
    if (mode === this.mode) return;
    this.goto(mode);
  }

  /** The part snaps back together. */
  reassemble() {
    this.goto("assembled", { snapBack: true });
  }
}

/* ---------- the React wrapper ---------- */

export interface ProductStageHandle {
  reassemble(): void;
}

interface Props {
  /** The part to show alone, or null for the whole inverter. */
  subject: StageSubject | null;
  /** Bump to play the sequence again, for a new search or a card the reader moved to. */
  playNonce: number;
}

const ProductStage = forwardRef<ProductStageHandle, Props>(function ProductStage(
  { subject, playNonce },
  ref
) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const line = useRef<SVGLineElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>("assembled");
  const [error, setError] = useState("");

  // Latest props for the one-time setup below.
  const initial = useRef({ reduced });
  initial.current = { reduced };

  const measureLabel = () => {
    const el = label.current;
    const e = engine.current;
    if (!el || !e) return;
    e.setLabelBox(
      el.hidden
        ? null
        : { x0: el.offsetLeft, y0: el.offsetTop, x1: el.offsetLeft + el.offsetWidth, y1: el.offsetTop + el.offsetHeight }
    );
  };
  const measureRef = useRef(measureLabel);
  measureRef.current = measureLabel;

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box || !svg.current || !line.current || !dot.current || !label.current) return;

    let e: Engine;
    try {
      e = new Engine(el, setMode);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    engine.current = e;
    e.setCallout({ svg: svg.current, line: line.current, dot: dot.current, label: label.current });

    const resize = () => {
      e.setSize(box.clientWidth, box.clientHeight);
      measureRef.current();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    // Pause rendering whenever the panel cannot be seen.
    const onVis = () => e.setVisibility({ document: !document.hidden });
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(
      (entries) => e.setVisibility({ onScreen: entries.some((x) => x.isIntersecting) }),
      { threshold: 0 }
    );
    io.observe(el);

    e.setReduced(initial.current.reduced);

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      e.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.setReduced(reduced);
  }, [reduced]);

  // A new part, or a new search, puts that part on stage and plays it from the start.
  useEffect(() => {
    engine.current?.show(subject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.key, playNonce]);

  // The label changes width with its text.
  useLayoutEffect(() => {
    measureLabel();
  }, [subject?.label]);

  useImperativeHandle(ref, () => ({ reassemble: () => engine.current?.reassemble() }), []);

  return (
    <div className="flex h-full w-full flex-col bg-panel">
      <div ref={wrap} className="relative min-h-0 flex-1 overflow-hidden">
        <canvas
          ref={canvas}
          role="img"
          aria-label={subject ? `3D model of ${subject.label}` : `3D model of the ${HERO_PRODUCT.name}`}
          className="absolute inset-0 block h-full w-full cursor-grab select-none active:cursor-grabbing"
        />

        {error && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-[12px] text-risk">
            The 3D view could not start: {error}
          </p>
        )}

        {/* The callout: a thin leader line from the part to its name. */}
        <svg
          ref={svg}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ opacity: 0 }}
        >
          <line ref={line} stroke="#EC5E31" strokeWidth="1" />
          <circle ref={dot} r="3" fill="#EC5E31" />
        </svg>
        <div
          ref={label}
          hidden={!subject}
          data-callout-label
          className="pointer-events-none absolute left-2 top-2 max-w-[calc(100%-16px)] truncate border border-line bg-panel px-2 py-[3px] text-[11px] leading-tight text-text"
          style={{ opacity: 0 }}
          title={subject?.label}
        >
          {subject?.label}
        </div>

        {!error && (
          <>
            <button
              type="button"
              onClick={() => engine.current?.intro(350)}
              className="absolute bottom-2 left-2 h-[26px] rounded-full border border-line-2 bg-panel-2 px-3 text-[12px] text-text transition-colors hover:border-text-2"
            >
              Replay
            </button>

            <div className="absolute bottom-2 right-2 flex">
              {(["assembled", "exploded"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => engine.current?.setMode(m)}
                  className={`-ml-px border px-2 py-[4px] text-[11px] capitalize transition-colors first:ml-0 ${
                    mode === m
                      ? "z-10 border-text bg-transparent text-text"
                      : "border-line bg-panel-2 text-text-2 hover:text-text"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {!error && (
        <p className="shrink-0 truncate px-2 py-[3px] text-[10px] leading-[12px] text-text-3">
          {subject ? subject.caption : `Illustrative model of the ${HERO_PRODUCT.name}. Not CAD.`}
        </p>
      )}
    </div>
  );
});

export default ProductStage;
