"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createTimeline, stagger, utils } from "animejs";
import AnimationPanel from "@/components/ui/AnimationPanel";
import useReducedMotion from "@/components/ui/useReducedMotion";
import { PRODUCT_TINTS, TOKEN } from "@/lib/anim";
import { PRODUCT_MASTER, Part, VoltaraData, px } from "@/lib/voltaraData";

const SQ = 7; // square side at rest
const CELL = 9; // start grid pitch
const COLS = 12; // squares across inside one product block
const LABEL_H = 16;
const STAGE_H = 186;
const END_SCALE = 0.62;
const CLUSTER_PITCH = 5;

interface Square {
  key: string;
  partId: string;
  tint: string;
  endColor: string;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

interface Cluster {
  part: Part;
  cx: number;
  cy: number;
  count: number;
}

interface Layout {
  squares: Square[];
  clusters: Cluster[];
  groups: { id: string; x: number; y: number; tint: string; count: number }[];
}

/** Accent only where it means something: a part five or more products already share. */
function endColor(products: number) {
  if (products >= 5) return TOKEN.accent;
  return products >= 2 ? TOKEN.text2 : TOKEN.text3;
}

/**
 * Start: one square per part number, blocked and tinted by the product that
 * carries it. End: one cluster per real part, its footprint the number of part
 * numbers that merged into it.
 */
function buildLayout(data: VoltaraData, width: number): Layout {
  const products = PRODUCT_MASTER.map((p) => p.id);
  const byProduct = new Map<string, { part: Part; pn: string }[]>(
    products.map((id) => [id, []])
  );
  for (const part of data.parts) {
    for (const row of part.rows) {
      // A part number sits with the first product that carries it, so the
      // 252 squares count the part numbers once each.
      const home = row.products[0];
      byProduct.get(home)?.push({ part, pn: row.pn });
    }
  }

  const blockW = COLS * CELL;
  const slot = width / products.length;
  const groups = products.map((id, gi) => ({
    id,
    x: Math.round(gi * slot + (slot - blockW) / 2),
    y: 0,
    tint: PRODUCT_TINTS[gi],
    count: byProduct.get(id)?.length ?? 0,
  }));

  // Clusters, largest sharing first, so the common core lands at the top.
  const ordered = [...data.parts].sort(
    (a, b) => b.products - a.products || b.rows.length - a.rows.length
  );
  const gridCols = 12;
  const gridRows = Math.ceil(ordered.length / gridCols);
  const colW = width / gridCols;
  const top = LABEL_H + 4 * CELL + 4;
  const rowH = (STAGE_H - top) / gridRows;

  const clusters: Cluster[] = ordered.map((part, i) => ({
    part,
    cx: (i % gridCols) * colW + colW / 2,
    cy: top + Math.floor(i / gridCols) * rowH + rowH / 2,
    count: part.rows.length,
  }));
  const clusterOf = new Map(clusters.map((c) => [c.part.id, c]));

  const squares: Square[] = [];
  const placed = new Map<string, number>();
  groups.forEach((g) => {
    (byProduct.get(g.id) ?? []).forEach((item, i) => {
      const cluster = clusterOf.get(item.part.id)!;
      const n = placed.get(item.part.id) ?? 0;
      placed.set(item.part.id, n + 1);

      const cols = Math.ceil(Math.sqrt(cluster.count));
      const rows = Math.ceil(cluster.count / cols);
      const ox = (n % cols) * CLUSTER_PITCH - ((cols - 1) * CLUSTER_PITCH) / 2;
      const oy = Math.floor(n / cols) * CLUSTER_PITCH - ((rows - 1) * CLUSTER_PITCH) / 2;

      squares.push({
        key: item.pn,
        partId: item.part.id,
        tint: g.tint,
        endColor: endColor(item.part.products),
        sx: g.x + (i % COLS) * CELL,
        sy: LABEL_H + Math.floor(i / COLS) * CELL,
        ex: cluster.cx + ox - SQ / 2,
        ey: cluster.cy + oy - SQ / 2,
      });
    });
  });

  // The wave reads left to right, so order the elements by where they start.
  squares.sort((a, b) => a.sx - b.sx || a.sy - b.sy);
  return { squares, clusters, groups };
}

export default function PartMergeAnimation({
  data,
  onOpenPart,
}: {
  data: VoltaraData;
  onOpenPart: (partId: string) => void;
}) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<ReturnType<typeof createTimeline> | null>(null);
  const [width, setWidth] = useState(0);
  const [done, setDone] = useState(false);
  const [hover, setHover] = useState<Cluster | null>(null);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () => (width > 0 ? buildLayout(data, width) : null),
    [data, width]
  );

  const play = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !layout) return;
    const els = Array.from(stage.querySelectorAll<HTMLElement>("[data-square]"));
    if (els.length === 0) return;

    tlRef.current?.revert();
    tlRef.current = null;
    setHover(null);

    const { squares } = layout;
    /** anime hands the target and its index to a function value. */
    const per =
      <T,>(pick: (s: Square) => T) =>
      (_target?: unknown, i?: number) =>
        pick(squares[i ?? 0]);

    if (reduced) {
      // End state, no movement.
      utils.set(els, {
        x: per((s) => s.ex),
        y: per((s) => s.ey),
        scale: END_SCALE,
        backgroundColor: per((s) => s.endColor),
      });
      if (countRef.current) countRef.current.textContent = "60";
      setDone(true);
      return;
    }

    setDone(false);
    utils.set(els, {
      x: per((s) => s.sx),
      y: per((s) => s.sy),
      scale: 1,
      backgroundColor: per((s) => s.tint),
    });
    if (countRef.current) countRef.current.textContent = "252";

    const counter = { value: 252 };
    const tl = createTimeline({
      defaults: { ease: "inOutQuad" },
      onComplete: () => setDone(true),
    });

    tl.add(
      els,
      {
        x: per((s) => s.ex),
        y: per((s) => s.ey),
        scale: END_SCALE,
        duration: 1500,
        delay: stagger(6),
      },
      300
    )
      .add(
        els,
        {
          backgroundColor: per((s) => s.endColor),
          duration: 420,
          ease: "outQuad",
          delay: stagger(6),
        },
        1500
      )
      .add(
        counter,
        {
          value: 60,
          duration: 2900,
          ease: "outQuad",
          modifier: utils.round(0),
          onUpdate: () => {
            if (countRef.current) {
              countRef.current.textContent = String(Math.round(counter.value));
            }
          },
        },
        300
      );

    tlRef.current = tl;
  }, [layout, reduced]);

  // Plays once when the tab opens, then waits for Replay.
  const started = useRef(false);
  useEffect(() => {
    if (!layout || started.current) return;
    started.current = true;
    play();
  }, [layout, play]);

  useEffect(
    () => () => {
      tlRef.current?.revert();
    },
    []
  );

  const core = data.summary.coreCandidates;

  return (
    <AnimationPanel
      title="252 become 60"
      note="Every square is one part number in the parts list, grouped by product."
      onReplay={play}
      footnote="Hover a cluster for the part it became. Click one to open its row below."
    >
      <div className="flex items-baseline gap-3">
        <span
          ref={countRef}
          className="text-[40px] font-light leading-none tabular-nums text-text"
        >
          252
        </span>
        <span className="text-[13px] text-text-2">
          {done ? "real parts" : "part numbers"}
        </span>
        <span
          className={`text-[13px] text-text-3 transition-opacity duration-500 ${
            done ? "opacity-100" : "opacity-0"
          }`}
        >
          {core} fit a common core
        </span>
      </div>

      <div
        ref={stageRef}
        className="relative mt-3 w-full"
        style={{ height: STAGE_H }}
      >
        {/* Product labels, visible while the squares are still blocked by product */}
        {layout?.groups.map((g) => (
          <span
            key={g.id}
            className={`absolute text-[11px] tabular-nums text-text-3 transition-opacity duration-500 ${
              done ? "opacity-0" : "opacity-100"
            }`}
            style={{ left: g.x, top: 0 }}
          >
            {g.id}
          </span>
        ))}

        {layout?.squares.map((s) => (
          <i
            key={s.key}
            data-square
            data-part={s.partId}
            className="absolute left-0 top-0 block"
            style={{ width: SQ, height: SQ, backgroundColor: s.tint }}
          />
        ))}

        {/* Hover and click targets, live once the clusters have landed */}
        {done &&
          layout?.clusters.map((c) => {
            const side = Math.ceil(Math.sqrt(c.count)) * CLUSTER_PITCH + 10;
            return (
              <button
                key={c.part.id}
                type="button"
                onMouseEnter={() => setHover(c)}
                onMouseLeave={() => setHover((h) => (h === c ? null : h))}
                onFocus={() => setHover(c)}
                onBlur={() => setHover(null)}
                onClick={() => onOpenPart(c.part.id)}
                aria-label={c.part.name}
                className="absolute"
                style={{
                  left: c.cx - side / 2,
                  top: c.cy - side / 2,
                  width: side,
                  height: side,
                }}
              />
            );
          })}

        {hover && (
          <div
            className="pointer-events-none absolute z-10 w-[220px] border border-line-2 bg-surface p-3"
            style={{
              left: Math.min(Math.max(hover.cx - 110, 0), Math.max(width - 220, 0)),
              top: hover.cy > STAGE_H / 2 ? hover.cy - 96 : hover.cy + 18,
            }}
          >
            <p className="text-[13px] leading-snug text-text">{hover.part.name}</p>
            <p className="mt-1 text-[12px] text-text-2">
              {hover.count} part numbers merged
            </p>
            <p className="text-[12px] text-text-3">
              {px(hover.part.min)} to {px(hover.part.max)}
            </p>
          </div>
        )}
      </div>
    </AnimationPanel>
  );
}
