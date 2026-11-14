"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger, utils } from "animejs";
import AnimationPanel from "@/components/ui/AnimationPanel";
import useReducedMotion from "@/components/ui/useReducedMotion";
import { LAYERS, LayerId, TOKEN, layerOfNeed } from "@/lib/anim";
import { PlannedNeed } from "@/lib/plan";
import { Part } from "@/lib/voltaraData";

/* The dashboard view draws a product Voltara builds. This one draws the
   product on the page, so every block is a need, not a part. */
const HALF_W = 112;
const HALF_H = 36;
const DEPTH = 7;
const VIEW_W = 360;
const CX = 116;
const TOP_Y = 64;
const ASSEMBLED_GAP = 8;
const EXPLODED_GAP = 44;
const BLOCK_COLS = 5;

/** How a need is drawn: colour by where it sits, outline style by whether it exists. */
function strokeFor(need: PlannedNeed): { color: string; dashed: boolean } {
  switch (need.status) {
    case "in core":
      return { color: TOKEN.accent, dashed: false };
    case "shared":
      return { color: TOKEN.text, dashed: false };
    case "exists, unique":
      return { color: TOKEN.text3, dashed: false };
    case "blocked by rule":
      return { color: TOKEN.risk, dashed: true };
    default:
      return { color: TOKEN.warn, dashed: true };
  }
}

const KEY: { label: string; color: string; dashed: boolean }[] = [
  { label: "In the common core", color: TOKEN.accent, dashed: false },
  { label: "Shared by two to four", color: TOKEN.text, dashed: false },
  { label: "Exists on one product", color: TOKEN.text3, dashed: false },
  { label: "New part needed", color: TOKEN.warn, dashed: true },
  { label: "Blocked by a rule", color: TOKEN.risk, dashed: true },
];

function diamond(cx: number, cy: number, hw: number, hh: number) {
  return `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
}

interface Block {
  need: PlannedNeed;
  index: number;
  x: number;
  y: number;
}

interface LayerShape {
  id: LayerId;
  name: string;
  blocks: Block[];
}

function build(needs: PlannedNeed[], parts: Part[]): LayerShape[] {
  const byName = new Map(parts.map((p) => [p.name, p]));
  const placed = needs.map((need, index) => ({
    need,
    index,
    layer: layerOfNeed(need.need, need.part ? byName.get(need.part) : undefined),
  }));

  const shapes: LayerShape[] = [];
  LAYERS.forEach((layer) => {
    const mine = placed.filter((p) => p.layer === layer.id);
    if (mine.length === 0) return;
    const rows = Math.ceil(mine.length / BLOCK_COLS);
    shapes.push({
      id: layer.id,
      name: layer.name,
      blocks: mine.map((p, i) => {
        const u = 0.14 + (0.68 * ((i % BLOCK_COLS) + 0.5)) / BLOCK_COLS;
        const v = 0.14 + (0.56 * (Math.floor(i / BLOCK_COLS) + 0.5)) / rows;
        return {
          need: p.need,
          index: p.index,
          x: CX + HALF_W * u - HALF_W * v,
          y: -HALF_H + HALF_H * u + HALF_H * v,
        };
      }),
    });
  });
  return shapes;
}

export default function NeedsExplodedView({
  needs,
  parts,
  product,
  onSelect,
}: {
  needs: PlannedNeed[];
  parts: Part[];
  product: string;
  onSelect: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [exploded, setExploded] = useState(true);
  const layers = useMemo(() => build(needs, parts), [needs, parts]);
  const viewH = TOP_Y + Math.max(1, layers.length - 1) * EXPLODED_GAP + HALF_H + 30;

  const run = useCallback(
    (open: boolean, instant: boolean) => {
      const svg = svgRef.current;
      if (!svg) return;
      const groups = Array.from(svg.querySelectorAll<SVGGElement>("[data-layer]"));
      const labels = Array.from(svg.querySelectorAll<SVGGElement>("[data-layer-label]"));
      if (groups.length === 0) return;

      const last = groups.length - 1;
      const center = open ? 0 : (last * (EXPLODED_GAP - ASSEMBLED_GAP)) / 2;
      const offset = (_t?: unknown, i?: number) =>
        (i ?? 0) * (open ? EXPLODED_GAP : ASSEMBLED_GAP) + center;

      if (instant || reduced) {
        utils.set(groups, { y: offset });
        utils.set(labels, { opacity: open ? 1 : 0 });
        return;
      }
      animate(groups, { y: offset, duration: 800, ease: "outCubic", delay: stagger(50) });
      animate(labels, {
        opacity: open ? 1 : 0,
        duration: 450,
        ease: "outQuad",
        delay: open ? stagger(50) : 0,
      });
    },
    [reduced]
  );

  // Plays once when the panel opens, then waits for Replay.
  useEffect(() => {
    run(false, true);
    const id = requestAnimationFrame(() => run(true, false));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.length]);

  useEffect(() => {
    run(exploded, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploded]);

  if (layers.length === 0) return null;

  return (
    <AnimationPanel
      title="This product"
      note={product ? `${needs.length} needs on this page, by layer` : undefined}
      onReplay={() => {
        setExploded(true);
        run(false, true);
        requestAnimationFrame(() => run(true, false));
      }}
      controls={
        <div className="flex">
          {(["assembled", "exploded"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={exploded === (mode === "exploded")}
              onClick={() => setExploded(mode === "exploded")}
              className={`-ml-px border px-2 py-[4px] text-[11px] capitalize transition-colors first:ml-0 ${
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
      footnote="Schematic view built from this page and the parts data. Not a CAD model."
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${viewH}`}
        className="w-full"
        role="img"
        aria-label={`Layers of ${product || "this product"}`}
      >
        {layers.map((layer) => (
          <g key={layer.id} data-layer style={{ transformBox: "view-box" }}>
            <polygon
              points={diamond(CX, TOP_Y, HALF_W, HALF_H)}
              fill={TOKEN.surface}
              fillOpacity={0.88}
              stroke={TOKEN.line2}
              strokeWidth={1.1}
            />
            <path
              d={`M ${CX - HALF_W} ${TOP_Y} L ${CX - HALF_W} ${TOP_Y + DEPTH} L ${CX} ${
                TOP_Y + HALF_H + DEPTH
              } L ${CX + HALF_W} ${TOP_Y + DEPTH} L ${CX + HALF_W} ${TOP_Y}`}
              fill="none"
              stroke={TOKEN.line2}
              strokeWidth={1.1}
            />

            {layer.blocks.map((b) => {
              const s = strokeFor(b.need);
              return (
                <polygon
                  key={`${b.index}-${b.need.need}`}
                  points={diamond(b.x, b.y + TOP_Y, 8, 4.5)}
                  fill={TOKEN.panel}
                  stroke={s.color}
                  strokeWidth={1.5}
                  strokeDasharray={s.dashed ? "3 2" : undefined}
                  className="cursor-pointer"
                  onClick={() => onSelect(b.index)}
                >
                  <title>{`${b.need.need}: ${b.need.status}`}</title>
                </polygon>
              );
            })}

            <g data-layer-label opacity={0}>
              <line
                x1={CX + HALF_W - 3}
                y1={TOP_Y}
                x2={CX + HALF_W + 12}
                y2={TOP_Y}
                stroke={TOKEN.line2}
                strokeWidth={1}
              />
              <text x={CX + HALF_W + 16} y={TOP_Y - 1} fill={TOKEN.text} fontSize={10}>
                {layer.name}
              </text>
              <text x={CX + HALF_W + 16} y={TOP_Y + 12} fill={TOKEN.text3} fontSize={10}>
                {layer.blocks.length}
              </text>
            </g>
          </g>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {KEY.map((k) => (
          <span key={k.label} className="flex items-center gap-2 text-[11px] text-text-2">
            <svg width="18" height="12" aria-hidden>
              <polygon
                points={diamond(9, 6, 7, 4)}
                fill="none"
                stroke={k.color}
                strokeWidth={1.5}
                strokeDasharray={k.dashed ? "3 2" : undefined}
              />
            </svg>
            {k.label}
          </span>
        ))}
      </div>
    </AnimationPanel>
  );
}
