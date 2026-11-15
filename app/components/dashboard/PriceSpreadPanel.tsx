"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createTimeline, stagger, utils } from "animejs";
import AnimationPanel from "@/components/ui/AnimationPanel";
import useReducedMotion from "@/components/ui/useReducedMotion";
import { TOKEN } from "@/lib/anim";
import { Part, PartRow, VoltaraData, px, rate, usd } from "@/lib/voltaraData";

/** Whole dollars while a figure is still climbing, compact once it is large. */
const money = (n: number) => (n >= 1000 ? usd(n) : rate(n));

const ROWS = 8;
const DOT = 9;
const TRACK_H = 26;
const HOLD_MS = 1000;
const APPEAR_MS = 320;
const SLIDE_MS = 700;
const ROW_STEP = 220;

interface Dot {
  row: PartRow;
  /** Where this price sits on the track, 0 at the lowest, 1 at the highest. */
  t: number;
  lowest: boolean;
}

interface SpreadRow {
  part: Part;
  dots: Dot[];
}

function build(parts: Part[]): SpreadRow[] {
  return parts.slice(0, ROWS).map((part) => {
    const span = part.max - part.min;
    const cheapest = part.rows.reduce(
      (lo, r) => (r.price < lo.price ? r : lo),
      part.rows[0]
    );
    return {
      part,
      dots: part.rows.map((row) => ({
        row,
        t: span > 0 ? (row.price - part.min) / span : 0,
        lowest: row.pn === cheapest.pn,
      })),
    };
  });
}

export default function PriceSpreadPanel({
  data,
  onAsk,
}: {
  data: VoltaraData;
  onAsk: (question: string) => void;
}) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<ReturnType<typeof createTimeline> | null>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ dot: Dot; part: Part; x: number; y: number } | null>(
    null
  );

  const rows = useMemo(() => build(data.byGap), [data.byGap]);
  // The headline is the whole gap, not just the eight rows on screen, and the
  // line under it says so.
  const total = data.summary.yearlyPriceGapUsd;

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const play = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const dots = Array.from(stage.querySelectorAll<HTMLElement>("[data-dot]"));
    const ticks = Array.from(stage.querySelectorAll<HTMLElement>("[data-tick]"));
    const gaps = Array.from(stage.querySelectorAll<HTMLElement>("[data-gap]"));
    if (dots.length === 0) return;

    tlRef.current?.revert();
    tlRef.current = null;

    /** Each dot slides back to the cheapest price on its own row. */
    const shift = (el: HTMLElement) => -Number(el.dataset.offset ?? 0);

    if (reduced) {
      utils.set(dots, { opacity: 1, scale: 1, x: (el: unknown) => shift(el as HTMLElement) });
      utils.set(ticks, { opacity: 1 });
      gaps.forEach((g) => (g.textContent = g.dataset.value ?? ""));
      if (totalRef.current) totalRef.current.textContent = money(total);
      return;
    }

    utils.set(dots, { opacity: 0, scale: 0.6, x: 0 });
    utils.set(ticks, { opacity: 0 });
    gaps.forEach((g) => (g.textContent = money(0)));
    if (totalRef.current) totalRef.current.textContent = money(0);

    const counter = { value: 0 };
    const tl = createTimeline({ defaults: { ease: "outQuad" } });

    // 1. every price Voltara actually paid, where it was paid.
    tl.add(dots, { opacity: 1, scale: 1, duration: APPEAR_MS, delay: stagger(18) }, 0);

    const collapseStart = APPEAR_MS + HOLD_MS;

    // 2. row by row, every dot slides to the cheapest price on that row.
    rows.forEach((r, i) => {
      const at = collapseStart + i * ROW_STEP;
      const rowDots = dots.filter((d) => d.dataset.row === String(i));
      tl.add(
        rowDots,
        {
          x: (el: unknown) => shift(el as HTMLElement),
          duration: SLIDE_MS,
          ease: "inOutQuad",
          delay: stagger(20),
        },
        at
      );
      tl.add(
        ticks.filter((t) => t.dataset.row === String(i)),
        { opacity: 1, duration: 300 },
        at
      );

      const gapEl = gaps[i];
      const target = r.part.gap;
      const counting = { value: 0 };
      tl.add(
        counting,
        {
          value: target,
          duration: SLIDE_MS,
          modifier: utils.round(0),
          onUpdate: () => {
            if (gapEl) gapEl.textContent = money(counting.value);
          },
        },
        at
      );
    });

    // 3. the total, climbing while the rows collapse.
    tl.add(
      counter,
      {
        value: total,
        duration: (rows.length - 1) * ROW_STEP + SLIDE_MS,
        modifier: utils.round(0),
        onUpdate: () => {
          if (totalRef.current) totalRef.current.textContent = money(counter.value);
        },
      },
      collapseStart
    );

    tlRef.current = tl;
  }, [reduced, rows, total]);

  const started = useRef(false);
  useEffect(() => {
    if (width === 0 || started.current) return;
    started.current = true;
    play();
  }, [width, play]);

  useEffect(
    () => () => {
      tlRef.current?.revert();
    },
    []
  );

  // The track is what is left after the name and the gap figure.
  const NAME_W = 190;
  const GAP_W = 86;
  const trackW = Math.max(120, width - NAME_W - GAP_W - 24);

  return (
    <AnimationPanel
      title="Same part, different prices"
      note={`Voltara pays different prices for the identical part. Paying the lowest price it already pays saves ${usd(
        data.summary.yearlyPriceGapUsd
      )} a year.`}
      onReplay={play}
      footnote="One dot per part number, at the average price paid for it. Hover a dot for the order behind it."
    >
      <div className="flex items-baseline gap-3">
        <span
          ref={totalRef}
          className="text-[30px] font-light leading-none tabular-nums text-text"
        >
          {money(0)}
        </span>
        <span className="text-[13px] text-text-2">
          of {usd(data.summary.yearlySpendUsd)} yearly spend
        </span>
      </div>

      <p className="mt-1 text-[12px] text-text-3">
        Across {data.summary.sharedParts} shared parts. The eight largest are
        below.
      </p>

      <div ref={stageRef} className="relative mt-4">
        {rows.map((r, i) => {
          const lowX = r.dots.find((d) => d.lowest)?.t ?? 0;
          return (
            <button
              key={r.part.id}
              type="button"
              onClick={() =>
                onAsk(`Why does Voltara pay different prices for ${r.part.name}?`)
              }
              className="flex w-full items-center gap-3 border-b border-line py-1 text-left last:border-b-0 hover:bg-panel-2"
            >
              <span
                className="shrink-0 truncate text-[12px] text-text"
                style={{ width: NAME_W }}
                title={r.part.name}
              >
                {r.part.name}
              </span>

              <span
                className="relative shrink-0"
                style={{ width: trackW, height: TRACK_H }}
              >
                {/* the track itself, cheapest at the left */}
                <span
                  className="absolute left-0 top-1/2 block h-px w-full bg-line"
                  aria-hidden
                />
                {r.dots.map((d, j) => {
                  const x = d.t * (trackW - DOT);
                  const target = lowX * (trackW - DOT);
                  return (
                    <span key={`${d.row.pn}-${j}`}>
                      {/* where this price started, left behind as a tick */}
                      <span
                        data-tick
                        data-row={i}
                        className="absolute top-1/2 block h-[7px] w-px -translate-y-1/2 bg-line-2 opacity-0"
                        style={{ left: x + DOT / 2 }}
                        aria-hidden
                      />
                      <span
                        data-dot
                        data-row={i}
                        data-offset={x - target}
                        onMouseEnter={(e) => {
                          const box = (
                            e.currentTarget as HTMLElement
                          ).getBoundingClientRect();
                          const stage = stageRef.current?.getBoundingClientRect();
                          if (!stage) return;
                          setHover({
                            dot: d,
                            part: r.part,
                            x: box.left - stage.left,
                            y: box.top - stage.top,
                          });
                        }}
                        onMouseLeave={() => setHover(null)}
                        className="absolute top-1/2 block -translate-y-1/2 rounded-full"
                        style={{
                          left: x,
                          width: DOT,
                          height: DOT,
                          backgroundColor: d.lowest ? TOKEN.positive : TOKEN.text2,
                          // the cheapest price stays on top of the stack the
                          // others collapse into
                          zIndex: d.lowest ? 2 : 1,
                        }}
                      />
                    </span>
                  );
                })}
              </span>

              <span
                data-gap
                data-value={money(r.part.gap)}
                className="shrink-0 text-right text-[12px] tabular-nums text-text"
                style={{ width: GAP_W }}
              >
                {money(0)}
              </span>
            </button>
          );
        })}

        {hover && (
          <div
            className="pointer-events-none absolute z-10 w-[230px] border border-line-2 bg-surface p-3"
            style={{
              left: Math.min(Math.max(hover.x - 115, 0), Math.max(width - 230, 0)),
              top: hover.y > 120 ? hover.y - 108 : hover.y + 20,
            }}
          >
            <p className="font-mono text-[12px] text-text">{hover.dot.row.pn}</p>
            <p className="mt-1 text-[12px] text-text-2">
              {px(hover.dot.row.price)} from {hover.dot.row.supplier}
            </p>
            <p className="text-[12px] text-text-3">
              {hover.dot.row.origin} · {hover.part.name}
            </p>
            <p className="mt-1 font-mono text-[11px] text-text-3">
              [{hover.dot.row.po}]
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-text-3">
        <span className="flex items-center gap-2">
          <span
            className="block h-[9px] w-[9px] rounded-full"
            style={{ backgroundColor: TOKEN.positive }}
          />
          Lowest price already paid
        </span>
        <span className="flex items-center gap-2">
          <span
            className="block h-[9px] w-[9px] rounded-full"
            style={{ backgroundColor: TOKEN.text2 }}
          />
          Every other part number for the same part
        </span>
      </div>
    </AnimationPanel>
  );
}
