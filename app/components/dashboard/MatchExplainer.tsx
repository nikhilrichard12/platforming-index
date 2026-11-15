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
import PartMergeAnimation from "./PartMergeAnimation";
import { TOKEN } from "@/lib/anim";
import { Grouping, regroup } from "@/lib/grouping";
import {
  Chip,
  Lane,
  MatcherEval,
  REVIEW,
  SAME,
  Similarity,
  similarity,
  WEIGHTS,
} from "@/lib/similarity";
import { Part, PartRow, VoltaraData } from "@/lib/voltaraData";

/**
 * How two part numbers get compared, animated on real rows.
 *
 * Five beats, left to right: the two descriptions arrive, they break into
 * chips in three lanes, the lanes are compared, the weighted lanes pour into
 * one score, and a verdict lands. Every number on the stage comes from calling
 * similarity() on the two descriptions; nothing here is written by hand.
 */

export type Beat = 0 | 1 | 2 | 3 | 4;

export const BEATS = ["Rows", "Read", "Compare", "Score", "Verdict"] as const;

/** When each beat starts, in ms, and when the whole run is over. */
const AT = [0, 800, 2000, 3200, 4300];
const END = 5100;

/** Where a parent driving the beats parks: the moment that beat has landed. */
const park = (beat: number) => Math.min((AT[beat + 1] ?? END) - 10, END);

/* ---------- geometry ---------- */

const CARD_H = 34;
const LANE_LABEL = 66;
const LANE_H = 52;
const CHIP_H = 20;
const RIGHT_W = 236;
const GUTTER = 28;

const LANES: { id: Lane; label: string; weight: number; term: string }[] = [
  { id: "type", label: "Type", weight: WEIGHTS.type, term: "Same kind of thing" },
  { id: "ratings", label: "Ratings", weight: WEIGHTS.specs, term: "Ratings agree" },
  { id: "wording", label: "Wording", weight: WEIGHTS.words, term: "Rest of the wording" },
];

/** Roughly what a chip measures at 11px, so the lanes can be laid out. */
function chipWidth(c: ChipView) {
  const text = Math.max(c.raw.length, c.token.length);
  return Math.round(text * 6.3 + 18);
}

interface ChipView extends Chip {
  side: "a" | "b";
  /** Where it starts: inside the description it came from. */
  sx: number;
  sy: number;
  x: number;
  y: number;
  w: number;
}

interface SlotView {
  key: string;
  lane: Lane;
  x: number;
  w: number;
  /** Both sides put a chip here and they agree. */
  agrees: boolean;
  /** Both sides put a chip here and they do not. */
  conflicts: boolean;
}

interface Stage {
  chips: ChipView[];
  slots: SlotView[];
  laneY: Record<Lane, number>;
  height: number;
  leftW: number;
}

/**
 * Lay the two descriptions out as chips in three lanes. Chips that compare
 * against each other share a slot, so a connector is a straight line and the
 * reader can see what lined up with what.
 */
function buildStage(result: Similarity, width: number, compact: boolean): Stage {
  const leftW = Math.max(220, width - RIGHT_W - GUTTER);
  const laneTop = compact ? CARD_H * 2 + 14 : CARD_H * 2 + 24;
  const laneH = compact ? LANE_H - 10 : LANE_H;
  const laneY: Record<Lane, number> = {
    type: laneTop,
    ratings: laneTop + laneH,
    wording: laneTop + laneH * 2,
  };

  const chips: ChipView[] = [];
  const slots: SlotView[] = [];

  const chipsOf = (side: "a" | "b", lane: Lane) =>
    (side === "a" ? result.parsedA : result.parsedB).chips.filter(
      (c) => c.lane === lane
    );

  for (const lane of LANES) {
    const a = chipsOf("a", lane.id);
    const b = chipsOf("b", lane.id);

    /** One slot per thing the two sides could have in common. */
    const keys: string[] = [];
    const keyOf = (c: Chip) => (lane.id === "ratings" ? c.unit ?? c.token : c.token);
    const shared = a.filter((c) => b.some((o) => keyOf(o) === keyOf(c)));
    [...shared, ...a, ...b].forEach((c) => {
      const k = keyOf(c);
      if (!keys.includes(k)) keys.push(k);
    });
    if (lane.id === "type") {
      // The type lane is one slot: there is only ever one kind of thing.
      keys.length = 0;
      if (a.length || b.length) keys.push("type");
    }

    const laneSlots = keys.map((k) => {
      const ca = lane.id === "type" ? a[0] : a.find((c) => keyOf(c) === k);
      const cb = lane.id === "type" ? b[0] : b.find((c) => keyOf(c) === k);
      const both = Boolean(ca && cb);
      const same = both && ca!.token === cb!.token;
      return { k, ca, cb, both, same };
    });

    // Widths first, then positions, then scale to fit the lane.
    const widths = laneSlots.map((s) =>
      Math.max(
        s.ca ? chipWidth({ ...s.ca, side: "a", sx: 0, sy: 0, x: 0, y: 0, w: 0 }) : 0,
        s.cb ? chipWidth({ ...s.cb, side: "b", sx: 0, sy: 0, x: 0, y: 0, w: 0 }) : 0,
        34
      )
    );
    const gap = 10;
    const total = widths.reduce((n, w) => n + w + gap, 0);
    const room = leftW - LANE_LABEL - 24;
    const scale = total > room ? Math.max(0.55, room / total) : 1;

    let x = LANE_LABEL;
    laneSlots.forEach((s, i) => {
      const w = Math.round(widths[i] * scale);
      slots.push({
        key: `${lane.id}-${s.k}`,
        lane: lane.id,
        x,
        w,
        agrees: s.both && s.same,
        conflicts: s.both && !s.same,
      });
      const push = (c: Chip | undefined, side: "a" | "b", row: number) => {
        if (!c) return;
        const source = side === "a" ? result.parsedA : result.parsedB;
        const at = source.chips.indexOf(c);
        chips.push({
          ...c,
          side,
          w,
          x,
          y: laneY[lane.id] + row,
          sx: 14 + at * 12,
          sy: side === "a" ? (CARD_H - CHIP_H) / 2 : CARD_H + 4 + (CARD_H - CHIP_H) / 2,
        });
      };
      push(s.ca, "a", 2);
      push(s.cb, "b", CHIP_H + 6);
      x += w + Math.round(gap * scale);
    });
  }

  const height = laneY.wording + (compact ? LANE_H - 10 : LANE_H);
  return { chips, slots, laneY, height, leftW };
}

/* ---------- the examples ---------- */

export interface Pair {
  id: string;
  label: string;
  a: { pn?: string; desc: string; product?: string; madeUp?: boolean };
  b: { pn?: string; desc: string; product?: string; madeUp?: boolean };
}

/** The part numbers each example is built from, looked up in the real rows. */
const EXAMPLE_ROWS: {
  id: string;
  label: string;
  a: string;
  b: string | { desc: string };
}[] = [
  { id: "same", label: "Same part", a: "10-92550", b: "SL5-2214B" },
  {
    id: "near",
    label: "Near miss",
    a: "10-92550",
    // Voltara buys one fan size, so the second description is written for this
    // example and labelled as such on the card.
    b: { desc: "Axial Fan 80mm 24VDC" },
  },
  { id: "type", label: "Different type", a: "10-92550", b: "10-55970" },
  { id: "thin", label: "Not enough to tell", a: "BS-6955-17", b: "10-92550" },
];

function rowFor(data: VoltaraData, pn: string): PartRow | null {
  for (const part of data.parts) {
    const row = part.rows.find((r) => r.pn === pn);
    if (row) return row;
  }
  return null;
}

export function examplePairs(data: VoltaraData): Pair[] {
  return EXAMPLE_ROWS.flatMap((e) => {
    const a = rowFor(data, e.a);
    if (!a) return [];
    const b =
      typeof e.b === "string"
        ? (() => {
            const row = rowFor(data, e.b as string);
            return row
              ? { pn: row.pn, desc: row.desc, product: row.products[0] }
              : null;
          })()
        : { desc: e.b.desc, madeUp: true };
    if (!b) return [];
    return [
      {
        id: e.id,
        label: e.label,
        a: { pn: a.pn, desc: a.desc, product: a.products[0] },
        b,
      },
    ];
  });
}

/* ---------- the component ---------- */

const VERDICT: Record<
  Similarity["verdict"],
  { word: string; className: string; color: string }
> = {
  same: { word: "Same part", className: "bg-positive text-[#1E1E1E]", color: TOKEN.positive },
  review: { word: "Engineer review", className: "bg-warn text-[#1E1E1E]", color: TOKEN.warn },
  different: {
    word: "Different part",
    className: "border border-line-2 text-text-3",
    color: TOKEN.text3,
  },
};

export default function MatchExplainer({
  data,
  evaluation,
  grouping,
  pair,
  autoplay = true,
  step,
  compact = false,
  onOpenPart,
}: {
  data: VoltaraData;
  evaluation: MatcherEval | null;
  /** The matcher's own groups, for the last beat. */
  grouping: Grouping;
  /** Two descriptions to run instead of the examples. */
  pair?: Pair | null;
  autoplay?: boolean;
  /** Drive the beats from a parent. Pauses the run. */
  step?: Beat;
  compact?: boolean;
  onOpenPart?: (partId: string) => void;
}) {
  const reduced = useReducedMotion();
  const pairs = useMemo(() => examplePairs(data), [data]);
  /** Which example is on the stage, or "all" for the last beat. */
  const [which, setWhich] = useState<string>(pairs[0]?.id ?? "same");
  const [beat, setBeat] = useState<Beat>(0);
  /** Bumped by Replay on the last beat, to run the whole list again. */
  const [run, setRun] = useState(0);
  const [read, setRead] = useState(false);

  const current = pair ?? pairs.find((p) => p.id === which) ?? pairs[0];
  const showAll = !pair && which === "all";
  const result = useMemo(
    () => similarity(current?.a.desc ?? "", current?.b.desc ?? ""),
    [current]
  );

  const stageRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<ReturnType<typeof createTimeline> | null>(null);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showAll]);

  const stage = useMemo(
    () => (width > 0 && !showAll ? buildStage(result, width, compact) : null),
    [result, width, compact, showAll]
  );

  /** Everything the timeline writes to, in one place so a replay can reset it. */
  const els = useCallback(() => {
    const root = stageRef.current;
    return {
      cards: Array.from(root?.querySelectorAll<HTMLElement>("[data-card]") ?? []),
      chips: Array.from(root?.querySelectorAll<HTMLElement>("[data-chip]") ?? []),
      links: Array.from(root?.querySelectorAll<HTMLElement>("[data-link]") ?? []),
      marks: Array.from(root?.querySelectorAll<HTMLElement>("[data-mark]") ?? []),
      meters: Array.from(root?.querySelectorAll<HTMLElement>("[data-meter]") ?? []),
      bar: root?.querySelector<HTMLElement>("[data-bar]") ?? null,
      badge: root?.querySelector<HTMLElement>("[data-badge]") ?? null,
    };
  }, []);

  const endState = useCallback(() => {
    const { cards, chips, links, marks, meters, bar, badge } = els();
    if (!stage) return;
    utils.set(cards, { opacity: 1, x: 0 });
    chips.forEach((el, i) => {
      const c = stage.chips[i];
      if (c) utils.set(el, { x: c.x, y: c.y, opacity: 1, scale: 1 });
    });
    utils.set(links, { opacity: 1, scaleY: 1 });
    utils.set(marks, { opacity: 1, scale: 1 });
    meters.forEach((el) => utils.set(el, { width: el.dataset.width ?? "0%" }));
    if (bar) utils.set(bar, { width: `${Math.round(result.score * 100)}%` });
    if (badge) utils.set(badge, { opacity: 1, y: 0 });
    if (scoreRef.current) scoreRef.current.textContent = result.score.toFixed(2);
    setRead(true);
    setBeat(4);
  }, [els, stage, result.score]);

  const play = useCallback(() => {
    if (showAll || !stage) return;
    tlRef.current?.revert();
    tlRef.current = null;

    const { cards, chips, links, marks, meters, bar, badge } = els();
    if (chips.length === 0) return;

    if (reduced) {
      endState();
      return;
    }

    setBeat(0);
    setRead(false);
    utils.set(cards, { opacity: 0, x: -16 });
    chips.forEach((el, i) => {
      const c = stage.chips[i];
      if (c) utils.set(el, { x: c.sx, y: c.sy, opacity: 0, scale: 0.9 });
    });
    utils.set(links, { opacity: 0, scaleY: 0 });
    utils.set(marks, { opacity: 0, scale: 0.6 });
    utils.set(meters, { width: "0%" });
    if (bar) utils.set(bar, { width: "0%" });
    if (badge) utils.set(badge, { opacity: 0, y: 10 });
    if (scoreRef.current) scoreRef.current.textContent = "0.00";

    const counter = { v: 0 };
    const tl = createTimeline({ defaults: { ease: "inOutQuad" } });

    /* a. the two rows arrive */
    tl.add(cards, { opacity: 1, x: 0, duration: 520, delay: stagger(140) }, AT[0]);

    /* b. read: every word flies to its lane, abbreviations expanding */
    tl.call(() => setBeat(1), AT[1])
      .add(
        chips,
        {
          x: (_t?: unknown, i?: number) => stage.chips[i ?? 0].x,
          y: (_t?: unknown, i?: number) => stage.chips[i ?? 0].y,
          opacity: 1,
          scale: 1,
          duration: 820,
          delay: stagger(26),
        },
        AT[1]
      )
      .call(() => setRead(true), AT[1] + 700);

    /* c. compare: connectors, ticks, and the three weighted meters */
    tl.call(() => setBeat(2), AT[2])
      .add(links, { opacity: 1, scaleY: 1, duration: 320, delay: stagger(60) }, AT[2])
      .add(
        marks,
        { opacity: 1, scale: 1, duration: 300, delay: stagger(60) },
        AT[2] + 160
      )
      .add(
        meters,
        {
          width: (t?: unknown) => (t as HTMLElement).dataset.width ?? "0%",
          duration: 620,
          delay: stagger(90),
        },
        AT[2] + 240
      );

    /* d. score: the meters pour into one bar */
    tl.call(() => setBeat(3), AT[3]);
    if (bar) {
      tl.add(
        bar,
        { width: `${Math.round(result.score * 100)}%`, duration: 760, ease: "outQuad" },
        AT[3]
      );
    }
    tl.add(
      counter,
      {
        v: result.score,
        duration: 760,
        ease: "outQuad",
        onUpdate: () => {
          if (scoreRef.current) scoreRef.current.textContent = counter.v.toFixed(2);
        },
      },
      AT[3]
    );

    /* e. verdict */
    tl.call(() => setBeat(4), AT[4]);
    if (badge) {
      tl.add(badge, { opacity: 1, y: 0, duration: 420, ease: "outQuad" }, AT[4]);
    }

    tlRef.current = tl;
    if (step !== undefined || !autoplay) {
      // Parked on a beat: the one the parent asked for, or the first, so the
      // stage is never blank while it waits.
      tl.seek(park(step ?? 0));
      tl.pause();
    }
  }, [showAll, stage, els, reduced, endState, result.score, step, autoplay]);

  // The stage is rebuilt whenever the pair or the width changes, so the run
  // starts from the top with it.
  useEffect(() => {
    play();
    return () => {
      tlRef.current?.revert();
      tlRef.current = null;
    };
  }, [play]);

  /** A parent driving the beats seeks the same timeline. */
  useEffect(() => {
    if (step === undefined || !tlRef.current || reduced) return;
    tlRef.current.pause();
    tlRef.current.seek(park(step));
    setBeat(step);
    setRead(step >= 1);
  }, [step, reduced]);

  /** On autoplay the examples take turns, ending on the whole parts list. */
  useEffect(() => {
    if (!autoplay || pair || step !== undefined) return;
    const wait = showAll ? 9000 : reduced ? 3200 : END + 1700;
    holdRef.current = setTimeout(() => {
      const order = [...pairs.map((p) => p.id), "all"];
      const next = order[(order.indexOf(which) + 1) % order.length];
      setWhich(next);
    }, wait);
    return () => {
      if (holdRef.current) clearTimeout(holdRef.current);
    };
  }, [autoplay, pair, step, which, pairs, showAll, reduced]);

  /**
   * Picking an example by hand stops the carousel from moving under it, and
   * picking the one already on the stage runs it again.
   */
  function choose(id: string) {
    if (holdRef.current) clearTimeout(holdRef.current);
    if (id === which) {
      if (id === "all") setRun((n) => n + 1);
      else play();
      return;
    }
    setWhich(id);
  }

  const verdict = VERDICT[result.verdict];
  // A rule that overrode the arithmetic is the reason; otherwise the last
  // thing the comparison noticed.
  const reason =
    result.override ?? result.reasons[result.reasons.length - 1] ?? "";

  return (
    <AnimationPanel
      title="How we know two parts are the same"
      note={
        showAll
          ? "The same comparison run across every pair of the 252 part numbers."
          : "Two descriptions, read into three lanes, weighted, scored."
      }
      onReplay={() => (showAll ? setRun((n) => n + 1) : play())}
      controls={
        pair ? null : (
          <div className="flex flex-wrap gap-2">
            {[...pairs, { id: "all", label: "Run it on everything" }].map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={which === p.id}
                onClick={() => choose(p.id)}
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  which === p.id
                    ? "border-text text-text"
                    : "border-line-2 text-text-2 hover:border-text-2 hover:text-text"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )
      }
      footnote={
        showAll
          ? "Graded against a prepared key that the matcher never reads. Source: matcher evaluation."
          : `Every figure on this stage comes from scoring these two descriptions. Beat ${
              beat + 1
            } of 5: ${BEATS[beat]}.`
      }
    >
      {showAll ? (
        <RunItOnEverything
          key={run}
          data={data}
          grouping={grouping}
          evaluation={evaluation}
          reduced={reduced}
          onOpenPart={onOpenPart}
        />
      ) : (
        <div ref={stageRef} className="relative w-full">
          {stage && (
            <div
              className="relative w-full"
              style={{ height: stage.height }}
              aria-label={`${current?.a.desc} compared with ${current?.b.desc}: ${result.score.toFixed(2)}, ${verdict.word}`}
            >
              {/* a. the two rows, exactly as the parts list writes them */}
              {(["a", "b"] as const).map((side, i) => {
                const row = side === "a" ? current.a : current.b;
                return (
                  <div
                    key={side}
                    data-card
                    className="absolute flex items-center gap-3 border-l border-line-2 pl-3"
                    style={{
                      left: 0,
                      top: i * (CARD_H + 4),
                      width: stage.leftW,
                      height: CARD_H,
                    }}
                  >
                    {row.pn && (
                      <span className="shrink-0 font-mono text-[11px] text-text-3">
                        {row.pn}
                      </span>
                    )}
                    <span className="truncate text-[13px] text-text">{row.desc}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-text-3">
                      {row.madeUp ? "Made-up example" : row.product}
                    </span>
                  </div>
                );
              })}

              {/* b. three lanes */}
              {LANES.map((lane) => (
                <span
                  key={lane.id}
                  className="absolute text-[11px] text-text-3"
                  style={{ left: 0, top: stage.laneY[lane.id] + 12 }}
                >
                  {lane.label}
                </span>
              ))}

              {/* c. connectors and their marks */}
              {stage.slots
                .filter((s) => s.agrees || s.conflicts)
                .map((s) => (
                  <i
                    key={`link-${s.key}`}
                    data-link
                    className="absolute block origin-top"
                    style={{
                      left: s.x + s.w / 2,
                      top: stage.laneY[s.lane] + CHIP_H + 2,
                      width: 1,
                      height: 6,
                      backgroundColor: s.agrees ? TOKEN.positive : TOKEN.risk,
                    }}
                  />
                ))}
              {stage.slots
                .filter((s) => s.agrees || s.conflicts)
                .map((s) => (
                  <span
                    key={`mark-${s.key}`}
                    data-mark
                    className="absolute text-[12px] leading-none"
                    style={{
                      left: s.x + s.w + 4,
                      top: stage.laneY[s.lane] + CHIP_H - 1,
                      color: s.agrees ? TOKEN.positive : TOKEN.risk,
                    }}
                  >
                    {s.agrees ? "✓" : "✕"}
                  </span>
                ))}

              {/* the words themselves */}
              {stage.chips.map((c, i) => (
                <span
                  key={`${c.side}-${c.lane}-${c.token}-${i}`}
                  data-chip
                  className={`absolute left-0 top-0 flex items-center justify-center truncate rounded-field border px-1 text-[11px] ${
                    c.side === "a"
                      ? "border-line-2 bg-panel-2 text-text"
                      : "border-line bg-panel-2 text-text-2"
                  }`}
                  style={{ width: c.w, height: CHIP_H }}
                  title={c.expanded ? `${c.raw} reads as ${c.token}` : c.token}
                >
                  {c.expanded && !read ? c.raw : c.token}
                </span>
              ))}

              {/* d and e. the weighted lanes, the score, the verdict */}
              <div
                className="absolute"
                style={{ left: stage.leftW + GUTTER, top: 0, width: RIGHT_W }}
              >
                {LANES.map((lane) => {
                  const value =
                    lane.id === "type"
                      ? result.type
                      : lane.id === "ratings"
                        ? result.specs
                        : result.words;
                  const term = result.terms.find((t) => t.label === lane.term);
                  // The track is the lane's share of the score, so a reader
                  // sees the weight and the value at the same time.
                  const track = Math.round(RIGHT_W * (term?.weight ?? lane.weight));
                  return (
                    <div key={lane.id} className="mb-[6px]">
                      <div className="flex items-baseline justify-between text-[11px] text-text-3">
                        <span>{lane.label}</span>
                        <span className="tabular-nums">
                          {!term
                            ? "not scored"
                            : beat >= 2
                              ? `${term.weight.toFixed(2)} × ${value.toFixed(2)}`
                              : `weight ${term.weight.toFixed(2)}`}
                        </span>
                      </div>
                      <div
                        className="mt-1 h-[6px] bg-line"
                        style={{ width: track }}
                        title={`${lane.label} carries ${Math.round(lane.weight * 100)} percent of the score`}
                      >
                        <i
                          data-meter
                          data-width={term ? `${Math.round(value * 100)}%` : "0%"}
                          className="block h-full"
                          style={{ width: 0, backgroundColor: TOKEN.text2 }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* the score bar, with the two thresholds marked on it */}
                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-text-3">Score</span>
                    <span
                      ref={scoreRef}
                      className="text-[20px] font-light leading-none tabular-nums text-text"
                    >
                      {result.score.toFixed(2)}
                    </span>
                  </div>
                  <div className="relative mt-2 h-[10px] w-full bg-line">
                    <i
                      data-bar
                      className="block h-full"
                      style={{ width: 0, backgroundColor: TOKEN.accent }}
                    />
                    {[REVIEW, SAME].map((t) => (
                      <i
                        key={t}
                        className="absolute top-[-3px] block w-px bg-text-3"
                        style={{ left: `${t * 100}%`, height: 16 }}
                      />
                    ))}
                  </div>
                  <div className="relative mt-1 h-[12px]">
                    {[REVIEW, SAME].map((t) => (
                      <span
                        key={t}
                        className="absolute text-[10px] tabular-nums text-text-3"
                        style={{ left: `calc(${t * 100}% - 10px)` }}
                      >
                        {t.toFixed(2)}
                      </span>
                    ))}
                  </div>

                  <div data-badge className="mt-4" style={{ opacity: 0 }}>
                    <span
                      className={`inline-block rounded-field px-2 py-[3px] text-[11px] leading-none ${verdict.className}`}
                    >
                      {verdict.word}
                    </span>
                    <p className="mt-2 text-[12px] leading-snug text-text-2">
                      {reason ? reason[0].toUpperCase() + reason.slice(1) : ""}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AnimationPanel>
  );
}

/* ---------- the last beat ---------- */

function RunItOnEverything({
  data,
  grouping,
  evaluation,
  reduced,
  onOpenPart,
}: {
  data: VoltaraData;
  grouping: Grouping;
  evaluation: MatcherEval | null;
  reduced: boolean;
  onOpenPart?: (partId: string) => void;
}) {
  const matcherParts: Part[] = useMemo(
    () => regroup(data, grouping).parts,
    [data, grouping]
  );
  /** The matcher runs first, then the engineer's confirmations close the rest. */
  const [phase, setPhase] = useState<"matcher" | "reviewed">(
    reduced ? "reviewed" : "matcher"
  );

  useEffect(() => {
    if (reduced) return;
    setPhase("matcher");
    const t = setTimeout(() => setPhase("reviewed"), 4800);
    return () => clearTimeout(t);
  }, [reduced, data]);

  const figures = evaluation
    ? [
        {
          value: `${(evaluation.pairwisePrecision * 100).toFixed(1)} percent`,
          label: "of matches correct",
        },
        {
          value: `${Math.round(evaluation.pairwiseRecall * 100)} percent`,
          label: "of duplicates found alone",
        },
        {
          value: `${evaluation.wrongMerges} wrong merge`,
          label: `in ${evaluation.mergedPairs}`,
        },
      ]
    : [];
  const wrong = evaluation?.worst.find((w) => w.kind === "wrong merge") ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_236px]">
      <div>
        <PartMergeAnimation
          key={phase}
          data={data}
          parts={phase === "matcher" ? matcherParts : data.parts}
          from={phase === "matcher" ? undefined : matcherParts}
          title={
            phase === "matcher"
              ? `252 become ${matcherParts.length}`
              : `${matcherParts.length} become ${data.parts.length}`
          }
          note={
            phase === "matcher"
              ? "One square per part number. The matcher merges only the pairs it scores at 0.85 or above."
              : "The pairs it left in the review band, confirmed by a person."
          }
          tail={
            phase === "matcher"
              ? `${matcherParts.length} groups found alone`
              : "An engineer confirms the rest."
          }
          footnote="Hover a cluster for the part it became. Click one to open its row below."
          showReplay={false}
          onOpenPart={onOpenPart ?? (() => {})}
        />
      </div>

      <div>
        {figures.map((f) => (
          <div key={f.label} className="mb-4">
            <p className="text-[22px] font-light leading-none text-text">{f.value}</p>
            <p className="mt-1 text-[12px] text-text-3">{f.label}</p>
          </div>
        ))}
        {wrong && (
          <p className="text-[12px] leading-relaxed text-text-3">
            The wrong one: it read “{wrong.a}” and “{wrong.b}” as one part. They
            are a {wrong.truthA.toLowerCase()} and a {wrong.truthB.toLowerCase()}.
          </p>
        )}
      </div>
    </div>
  );
}
