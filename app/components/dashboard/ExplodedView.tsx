"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger, utils } from "animejs";
import AnimationPanel from "@/components/ui/AnimationPanel";
import useReducedMotion from "@/components/ui/useReducedMotion";
import {
  LAYERS,
  LayerId,
  SHARE_COLOR,
  SHARE_LABEL,
  ShareState,
  TOKEN,
  layerOf,
  shareState,
} from "@/lib/anim";
import { PRODUCT_MASTER, Part, VoltaraData } from "@/lib/voltaraData";

/* Isometric plan: one diamond per layer, blocks placed on its surface. */
const HALF_W = 200;
const HALF_H = 60;
const DEPTH = 9;
const VIEW_W = 700;
const VIEW_H = 476;
const CX = 232;
const TOP_Y = 86;
const ASSEMBLED_GAP = 11;
const EXPLODED_GAP = 72;
const BLOCK_COLS = 6;

interface Block {
  part: Part;
  state: ShareState;
  x: number;
  y: number;
}

interface LayerShape {
  id: LayerId;
  name: string;
  index: number;
  blocks: Block[];
}

function diamond(cx: number, cy: number, hw: number, hh: number) {
  return `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
}

/** A point on the diamond surface, u along the right edge, v along the left. */
function surface(cy: number, u: number, v: number) {
  return {
    x: CX + HALF_W * u - HALF_W * v,
    y: cy - HALF_H + HALF_H * u + HALF_H * v,
  };
}

function buildLayers(parts: Part[]): LayerShape[] {
  const shapes: LayerShape[] = [];
  LAYERS.forEach((layer) => {
    const inLayer = parts
      .filter((p) => layerOf(p) === layer.id)
      .sort((a, b) => b.products - a.products || a.name.localeCompare(b.name));
    if (inLayer.length === 0) return;

    const rows = Math.ceil(inLayer.length / BLOCK_COLS);
    const blocks = inLayer.map((part, i) => {
      const col = i % BLOCK_COLS;
      const row = Math.floor(i / BLOCK_COLS);
      const u = 0.13 + (0.7 * (col + 0.5)) / BLOCK_COLS;
      const v = 0.12 + (0.6 * (row + 0.5)) / rows;
      const p = surface(0, u, v);
      return { part, state: shareState(part.products), x: p.x, y: p.y };
    });

    shapes.push({ id: layer.id, name: layer.name, index: shapes.length, blocks });
  });
  return shapes;
}

export default function ExplodedView({
  data,
  onAsk,
}: {
  data: VoltaraData;
  onAsk: (question: string) => void;
}) {
  const reduced = useReducedMotion();
  const [product, setProduct] = useState(PRODUCT_MASTER[0].id);
  const [exploded, setExploded] = useState(true);
  const [hover, setHover] = useState<{ block: Block; x: number; y: number } | null>(
    null
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const parts = useMemo(
    () => data.parts.filter((p) => p.rows.some((r) => r.products.includes(product))),
    [data.parts, product]
  );
  const layers = useMemo(() => buildLayers(parts), [parts]);

  const counts = useMemo(() => {
    const tally: Record<ShareState, number> = { core: 0, shared: 0, unique: 0 };
    parts.forEach((p) => (tally[shareState(p.products)] += 1));
    return tally;
  }, [parts]);

  const productName =
    PRODUCT_MASTER.find((p) => p.id === product)?.name ?? product;

  /** Move the layers apart, or back together. */
  const run = useCallback(
    (open: boolean, instant: boolean) => {
      const svg = svgRef.current;
      if (!svg) return;
      const groups = Array.from(svg.querySelectorAll<SVGGElement>("[data-layer]"));
      const labels = Array.from(svg.querySelectorAll<SVGGElement>("[data-layer-label]"));
      if (groups.length === 0) return;

      // Assembled sits in the middle of the same frame the exploded stack
      // fills, so the panel never changes height when it is toggled.
      const last = groups.length - 1;
      const center = open ? 0 : (last * (EXPLODED_GAP - ASSEMBLED_GAP)) / 2;
      const offset = (_t?: unknown, i?: number) =>
        (i ?? 0) * (open ? EXPLODED_GAP : ASSEMBLED_GAP) + center;

      if (instant || reduced) {
        utils.set(groups, { y: offset });
        utils.set(labels, { opacity: open ? 1 : 0 });
        return;
      }

      animate(groups, {
        y: offset,
        duration: 900,
        ease: "outCubic",
        delay: stagger(60),
      });
      animate(labels, {
        opacity: open ? 1 : 0,
        duration: 500,
        ease: "outQuad",
        delay: open ? stagger(60) : 0,
      });
    },
    [reduced]
  );

  // On load and on every product change the unit separates again.
  useEffect(() => {
    run(false, true);
    if (exploded) {
      const id = requestAnimationFrame(() => run(true, false));
      return () => cancelAnimationFrame(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, layers.length]);

  useEffect(() => {
    run(exploded, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploded]);

  function ask(block: Block) {
    onAsk(
      block.state === "unique"
        ? `Why is the ${block.part.name} unique to the ${productName}?`
        : `Why is the ${block.part.name} a common core candidate?`
    );
  }

  function onBlockEnter(e: React.MouseEvent<SVGPolygonElement>, block: Block) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const a = e.currentTarget.getBoundingClientRect();
    const b = wrap.getBoundingClientRect();
    setHover({
      block,
      x: a.left - b.left + a.width / 2,
      y: a.top - b.top,
    });
  }

  return (
    <AnimationPanel
      title="What the six products share"
      note="One schematic per product, built from the parts list."
      onReplay={() => {
        setExploded(true);
        run(false, true);
        requestAnimationFrame(() => run(true, false));
      }}
      replayLabel="Replay"
      footnote="Schematic view built from parts data. Not a CAD model."
      controls={
        <div className="flex">
          {(["assembled", "exploded"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={exploded === (mode === "exploded")}
              onClick={() => setExploded(mode === "exploded")}
              className={`-ml-px border px-3 py-[5px] text-[12px] capitalize transition-colors first:ml-0 ${
                exploded === (mode === "exploded")
                  ? "z-10 border-text bg-transparent text-text"
                  : "border-line bg-panel-2 text-text-2 hover:text-text"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      }
    >
      {/* Product selector */}
      <div className="flex flex-wrap">
        {PRODUCT_MASTER.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={product === p.id}
            onClick={() => setProduct(p.id)}
            className={`-ml-px border px-3 py-[7px] text-[12px] transition-colors first:ml-0 ${
              product === p.id
                ? "z-10 border-text bg-transparent text-text"
                : "border-line bg-panel-2 text-text-2 hover:text-text"
            }`}
          >
            {p.id}
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="relative mt-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full"
          style={{ maxHeight: 476 }}
          role="img"
          aria-label={`Layers of the ${productName}`}
        >
          {layers.map((layer, i) => {
            const cy = TOP_Y + i * 0;
            return (
              <g key={layer.id} data-layer style={{ transformBox: "view-box" }}>
                {/* slab */}
                <polygon
                  points={diamond(CX, cy, HALF_W, HALF_H)}
                  fill={TOKEN.surface}
                  fillOpacity={0.88}
                  stroke={TOKEN.line2}
                  strokeWidth={1.1}
                />
                <path
                  d={`M ${CX - HALF_W} ${cy} L ${CX - HALF_W} ${cy + DEPTH} L ${CX} ${
                    cy + HALF_H + DEPTH
                  } L ${CX + HALF_W} ${cy + DEPTH} L ${CX + HALF_W} ${cy}`}
                  fill="none"
                  stroke={TOKEN.line2}
                  strokeWidth={1.1}
                />
                <line
                  x1={CX}
                  y1={cy + HALF_H}
                  x2={CX}
                  y2={cy + HALF_H + DEPTH}
                  stroke={TOKEN.line2}
                  strokeWidth={1.1}
                />

                {layer.blocks.map((b) => (
                  <polygon
                    key={b.part.id}
                    points={diamond(b.x, b.y + cy, 11, 6)}
                    fill={TOKEN.panel}
                    stroke={SHARE_COLOR[b.state]}
                    strokeWidth={1.5}
                    className="cursor-pointer"
                    onMouseEnter={(e) => onBlockEnter(e, b)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => ask(b)}
                  >
                    <title>{b.part.name}</title>
                  </polygon>
                ))}

                <g data-layer-label opacity={0}>
                  <line
                    x1={CX + HALF_W - 6}
                    y1={cy}
                    x2={CX + HALF_W + 34}
                    y2={cy}
                    stroke={TOKEN.line2}
                    strokeWidth={1}
                  />
                  <text
                    x={CX + HALF_W + 42}
                    y={cy - 2}
                    fill={TOKEN.text}
                    fontSize={13}
                  >
                    {layer.name}
                  </text>
                  <text
                    x={CX + HALF_W + 42}
                    y={cy + 15}
                    fill={TOKEN.text3}
                    fontSize={12}
                  >
                    {layer.blocks.length} part
                    {layer.blocks.length === 1 ? "" : "s"}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 w-[230px] border border-line-2 bg-surface p-3"
            style={{
              left: Math.max(0, hover.x - 115),
              top: Math.max(0, hover.y - 62),
            }}
          >
            <p className="text-[13px] leading-snug text-text">
              {hover.block.part.name}
            </p>
            <p className="mt-1 text-[12px] text-text-3">
              Used by {hover.block.part.products} of 6 products
            </p>
          </div>
        )}
      </div>

      {/* Legend, counted from the parts list for this product */}
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {(["core", "shared", "unique"] as ShareState[]).map((s) => (
          <span key={s} className="flex items-center gap-2 text-[12px] text-text-2">
            <svg width="22" height="14" aria-hidden>
              <polygon
                points={diamond(11, 7, 9, 5)}
                fill="none"
                stroke={SHARE_COLOR[s]}
                strokeWidth={1.6}
              />
            </svg>
            {SHARE_LABEL[s]}
            <span className="tabular-nums text-text-3">{counts[s]}</span>
          </span>
        ))}
      </div>
    </AnimationPanel>
  );
}
