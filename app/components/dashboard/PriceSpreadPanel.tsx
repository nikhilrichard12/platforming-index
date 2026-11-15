"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTimeline, stagger, utils } from "animejs";
import AnimationPanel from "@/components/ui/AnimationPanel";
import useReducedMotion from "@/components/ui/useReducedMotion";
import { Part, PartRow, VoltaraData, px, rate, usd } from "@/lib/voltaraData";

const ROWS = 8;
const BAR_H = 10;
const TRACK_W = 300;
const GROW_MS = 700;
const ROW_STEP = 90;

/** Whole dollars while a figure climbs, compact once it is large. */
const money = (n: number) => (n >= 1000 ? usd(n) : rate(n));

interface Spread {
  part: Part;
  low: PartRow;
  high: PartRow;
  /** How much more the dearest part number costs than the cheapest. */
  percent: number;
}

function build(parts: Part[]): Spread[] {
  return parts
    .slice(0, ROWS)
    .map((part) => {
      const low = part.rows.reduce((a, r) => (r.price < a.price ? r : a), part.rows[0]);
      const high = part.rows.reduce((a, r) => (r.price > a.price ? r : a), part.rows[0]);
      return {
        part,
        low,
        high,
        percent: low.price > 0 ? ((high.price - low.price) / low.price) * 100 : 0,
      };
    })
    .sort((a, b) => b.part.gap - a.part.gap);
}

/**
 * One row per part: what Voltara pays at its cheapest, what it pays at its
 * dearest, and what the difference costs in a year. The bar is the markup, so
 * a longer bar is a bigger premium rather than a bigger part.
 */
export default function PriceSpreadPanel({
  data,
  onAsk,
}: {
  data: VoltaraData;
  onAsk: (question: string) => void;
}) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<ReturnType<typeof createTimeline> | null>(null);
  const [hover, setHover] = useState<{ row: Spread; y: number } | null>(null);

  const rows = useMemo(() => build(data.byGap), [data.byGap]);
  const widest = Math.max(...rows.map((r) => r.percent), 1);
  const barWidth = (r: Spread) => Math.max(24, (r.percent / widest) * TRACK_W);

  const play = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const bars = Array.from(stage.querySelectorAll<HTMLElement>("[data-bar]"));
    const costs = Array.from(stage.querySelectorAll<HTMLElement>("[data-cost]"));
    if (bars.length === 0) return;

    tlRef.current?.revert();
    tlRef.current = null;

    const full = (el: HTMLElement) => Number(el.dataset.width ?? 0);

    if (reduced) {
      utils.set(bars, { width: (el: unknown) => full(el as HTMLElement) });
      costs.forEach((c) => (c.textContent = c.dataset.value ?? ""));
      return;
    }

    utils.set(bars, { width: 0 });
    costs.forEach((c) => (c.textContent = money(0)));

    const tl = createTimeline({ defaults: { ease: "outQuad" } });
    tl.add(
      bars,
      {
        width: (el: unknown) => full(el as HTMLElement),
        duration: GROW_MS,
        ease: "outCubic",
        delay: stagger(ROW_STEP),
      },
      0
    );

    rows.forEach((r, i) => {
      const el = costs[i];
      const counting = { value: 0 };
      tl.add(
        counting,
        {
          value: r.part.gap,
          duration: GROW_MS,
          modifier: utils.round(0),
          onUpdate: () => {
            if (el) el.textContent = money(counting.value);
          },
        },
        i * ROW_STEP
      );
    });

    tlRef.current = tl;
  }, [reduced, rows]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    play();
  }, [play]);

  useEffect(
    () => () => {
      tlRef.current?.revert();
    },
    []
  );

  return (
    <AnimationPanel
      title="Same part, different prices"
      note={`Voltara pays more than one price for the identical part. The gap costs ${usd(
        data.summary.yearlyPriceGapUsd
      )} a year.`}
      onReplay={play}
      footnote="Hover a row for the two orders behind it. Prices are averages per part number."
    >
      <div ref={stageRef} className="relative">
        {/* Column headers */}
        <div className="flex items-end gap-4 border-b border-line pb-2 text-[12px] text-text-3">
          <span className="w-[180px] shrink-0">Part</span>
          <span
            className="flex shrink-0 items-baseline justify-between"
            style={{ width: TRACK_W + 130 }}
          >
            <span>Lowest price paid</span>
            <span>Highest price paid</span>
          </span>
          <span className="w-[64px] shrink-0 text-right">Difference</span>
          <span className="flex-1 text-right">Cost per year</span>
        </div>

        {rows.map((r) => (
          <button
            key={r.part.id}
            type="button"
            onMouseEnter={(e) => {
              const stage = stageRef.current?.getBoundingClientRect();
              const box = e.currentTarget.getBoundingClientRect();
              if (stage) setHover({ row: r, y: box.top - stage.top + box.height });
            }}
            onMouseLeave={() => setHover(null)}
            onClick={() => onAsk(`Why does Voltara pay two prices for ${r.part.name}?`)}
            className="flex w-full items-center gap-4 border-b border-line py-2 text-left last:border-b-0 hover:bg-panel-2"
          >
            <span className="w-[180px] shrink-0 text-[12px] leading-tight text-text">
              {r.part.name}
            </span>

            <span
              className="flex shrink-0 items-center gap-2"
              style={{ width: TRACK_W + 130 }}
            >
              <span className="w-[58px] shrink-0 text-right text-[12px] tabular-nums text-positive">
                {px(r.low.price)}
              </span>
              <span
                data-bar
                data-width={barWidth(r)}
                className="block shrink-0 bg-warn"
                style={{ width: barWidth(r), height: BAR_H }}
              />
              <span className="shrink-0 text-[12px] tabular-nums text-text">
                {px(r.high.price)}
              </span>
            </span>

            <span className="w-[64px] shrink-0 text-right text-[12px] tabular-nums text-text-2">
              +{Math.round(r.percent)}%
            </span>

            <span
              data-cost
              data-value={money(r.part.gap)}
              className="flex-1 text-right text-[13px] tabular-nums text-text"
            >
              {money(0)}
            </span>
          </button>
        ))}

        {/* Footer */}
        <div className="flex items-baseline gap-4 border-t border-line pt-3">
          <span className="flex-1 text-[13px] text-text-2">
            Total across {data.summary.sharedParts} shared parts
          </span>
          <span className="text-right">
            <span className="block text-[17px] font-light tabular-nums text-text">
              {usd(data.summary.yearlyPriceGapUsd)}
            </span>
            <span className="block text-[12px] text-text-3">
              of {usd(data.summary.yearlySpendUsd)} yearly spend
            </span>
          </span>
        </div>

        {hover && (
          <div
            className="pointer-events-none absolute left-[180px] z-10 w-[340px] border border-line-2 bg-surface p-3"
            style={{ top: Math.max(0, hover.y - 8) }}
          >
            <p className="text-[12px] text-text">{hover.row.part.name}</p>
            <p className="mt-2 text-[12px] text-positive">
              {px(hover.row.low.price)}{" "}
              <span className="text-text-2">
                from {hover.row.low.supplier}, {hover.row.low.origin}
              </span>{" "}
              <span className="font-mono text-[11px] text-text-3">
                [{hover.row.low.po}]
              </span>
            </p>
            <p className="mt-1 text-[12px] text-text">
              {px(hover.row.high.price)}{" "}
              <span className="text-text-2">
                from {hover.row.high.supplier}, {hover.row.high.origin}
              </span>{" "}
              <span className="font-mono text-[11px] text-text-3">
                [{hover.row.high.po}]
              </span>
            </p>
          </div>
        )}
      </div>
    </AnimationPanel>
  );
}
