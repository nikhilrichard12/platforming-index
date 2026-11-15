"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { createTimeline, stagger, utils } from "animejs";
import AnimationPanel from "@/components/ui/AnimationPanel";
import Badge from "@/components/ui/Badge";
import useReducedMotion from "@/components/ui/useReducedMotion";
import { TOKEN } from "@/lib/anim";
import {
  CONFLICT_CAP,
  Chip,
  Lane,
  MatcherEval,
  REVIEW,
  SAME,
  Similarity,
  WEIGHTS,
  parsePart,
  similarity,
} from "@/lib/similarity";
import { PartRow, VoltaraData } from "@/lib/voltaraData";

/**
 * How 252 part numbers became 60 parts, drawn once and then left standing.
 *
 * Three bands, top to bottom: the equation two real rows go through, the
 * decision that equation feeds (a score track with two thresholds), and what
 * that decision was graded at. Every figure is computed here from the parts
 * data, lib/similarity.ts or data/derived/matcher_eval.json. A row or a file
 * the story depends on that is missing raises an error rather than leaving a
 * gap in the diagram.
 */

const n2 = (v: number) => v.toFixed(2);

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function must<T>(v: T | undefined | null, what: string): T {
  if (v === undefined || v === null) throw new Error(`Inventory diagram: ${what}`);
  return v;
}

/* ---------- what the diagram is made of ---------- */

/** The two rows the equation is shown on, by part number. */
const ROW_A = "10-92550";
const ROW_B = "SL5-2214B";
/** The one row on the track that says almost nothing. */
const ROW_DWG = "BS-6955-17";

const LANES: { lane: Lane; term: string; weight: number; key: "type" | "specs" | "words" }[] = [
  { lane: "type", term: "Type", weight: WEIGHTS.type, key: "type" },
  { lane: "ratings", term: "Ratings", weight: WEIGHTS.specs, key: "specs" },
  { lane: "wording", term: "Wording", weight: WEIGHTS.words, key: "words" },
];

interface Slot {
  token: string;
  /** Index of the word in each row's own reading, to find where it started. */
  a?: number;
  b?: number;
}

interface Marker {
  key: string;
  score: number;
  title: string;
  note: string;
  sub?: string;
  madeUp: boolean;
  verdict: Similarity["verdict"];
  /** Which side of its dot the label sits on. */
  lean: "left" | "mid" | "right";
}

interface Hero {
  rowA: PartRow;
  rowB: PartRow;
  chipsA: Chip[];
  chipsB: Chip[];
  /** Words that landed in each term, matched pairs sharing a slot. */
  lanes: { term: string; weight: number; value: number; slots: Slot[] }[];
  result: Similarity;
  markers: Marker[];
  seeDwgLines: number;
  parts: number;
  partNumbers: number;
}

function buildHero(data: VoltaraData): Hero {
  const rows = data.parts.flatMap((p) => p.rows);
  const row = (pn: string) => must(rows.find((r) => r.pn === pn), `row ${pn} is not in voltara_parts.json`);
  const part = (name: string) => must(data.parts.find((p) => p.name === name), `part "${name}" is not in voltara_parts.json`);

  const rowA = row(ROW_A);
  const rowB = row(ROW_B);
  const result = similarity(rowA.desc, rowB.desc);
  const pa = parsePart(rowA.desc);
  const pb = parsePart(rowB.desc);

  const lanes = LANES.map((L) => {
    const slots: Slot[] = [];
    pa.chips.forEach((c, i) => {
      if (c.lane === L.lane) slots.push({ token: c.token, a: i });
    });
    pb.chips.forEach((c, i) => {
      if (c.lane !== L.lane) return;
      const mate = slots.find((s) => s.token === c.token && s.b === undefined);
      if (mate) mate.b = i;
      else slots.push({ token: c.token, b: i });
    });
    return { term: L.term, weight: L.weight, value: result[L.key], slots };
  });

  const fan = part("Axial Fan 120mm 24VDC");
  const guard = part("Wire Fan Guard 120mm");
  const dwg = row(ROW_DWG);
  const eighty = "Axial Fan 80mm 24VDC"; // made up: no 80mm fan is in the data

  const raw: Omit<Marker, "score" | "verdict">[] = [
    { key: "pair", title: "Fan pair", note: "same part", sub: `${rowA.pn} and ${rowB.pn}`, madeUp: false, lean: "right" },
    { key: "guard", title: "Fan vs wire fan guard", note: "different type", madeUp: false, lean: "left" },
    { key: "rating", title: "120mm vs 80mm", note: "one rating disagrees", madeUp: true, lean: "left" },
    { key: "dwg", title: dwg.desc, note: "not enough to tell", sub: dwg.pn, madeUp: false, lean: "mid" },
  ];
  const pairs: [string, string][] = [
    [rowA.desc, rowB.desc],
    [fan.name, guard.name],
    [fan.name, eighty],
    [dwg.desc, fan.name],
  ];
  const markers = raw.map((m, i) => {
    const s = similarity(pairs[i][0], pairs[i][1]);
    return { ...m, score: s.score, verdict: s.verdict };
  });

  return {
    rowA,
    rowB,
    chipsA: pa.chips,
    chipsB: pb.chips,
    lanes,
    result,
    markers,
    seeDwgLines: rows.filter((r) => /see dwg/i.test(r.desc)).length,
    parts: data.summary.realParts,
    partNumbers: data.summary.partNumbers,
  };
}

/** The tiles and the closing line, read from the graded run. */
function readEval(evaluation: MatcherEval) {
  const wrong = must(
    evaluation.worst.find((w) => w.kind === "wrong merge"),
    "matcher_eval.json lists no wrong merge to name"
  );
  // The tile names the wrong merge in plain words. If the grading ever finds a
  // different one, this copy is stale: say so instead of printing a false line.
  if (!/dual input/i.test(wrong.truthA) || !/triple input/i.test(wrong.truthB)) {
    throw new Error(
      `Inventory diagram: the wrong merge is now "${wrong.truthA}" with "${wrong.truthB}", not dual-input with triple-input. Update the tile.`
    );
  }
  return {
    precision: evaluation.pairwisePrecision * 100,
    correct: evaluation.correctMerges,
    merged: evaluation.mergedPairs,
    recall: Math.round(evaluation.pairwiseRecall * 100),
    wrongMerges: evaluation.wrongMerges,
    groups: evaluation.groupsFound,
  };
}

/* ---------- timing ---------- */

/** When each part of the diagram starts, in ms. The run is about ten seconds. */
const AT = {
  cards: 0,
  equation: 600,
  fly: 900,
  fuse: 2900,
  resolve: 3900,
  result: 4700,
  bandB: 5600,
  markers: 6100,
  markerGap: 550,
  bandC: 8500,
  flow: 9300,
  foot: 9800,
};

const TICK_PATH = "M2.5 6.5 L5.5 9.5 L10.5 3.5";

/* ---------- the diagram ---------- */

export default function MatchingPanel({
  data,
  evaluation,
}: {
  data: VoltaraData;
  evaluation: MatcherEval | null;
}) {
  const hero = useMemo(() => buildHero(data), [data]);
  const stats = useMemo(() => (evaluation ? readEval(evaluation) : null), [evaluation]);
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const bandA = useRef<HTMLDivElement>(null);
  const tlRef = useRef<ReturnType<typeof createTimeline> | null>(null);
  const flyers = useMemo(
    () => hero.lanes.flatMap((l, li) => l.slots.map((s, si) => ({ ...s, lane: li, slot: si }))),
    [hero]
  );

  const q = useCallback(
    <T extends Element = HTMLElement>(sel: string) =>
      Array.from(root.current?.querySelectorAll<T>(sel) ?? []),
    []
  );

  /** Draw a curve from each word's place in its row to where it landed. */
  const drawConnectors = useCallback(() => {
    const stage = bandA.current;
    if (!stage) return;
    const box = stage.getBoundingClientRect();
    flyers.forEach((f, i) => {
      for (const side of ["a", "b"] as const) {
        const idx = f[side];
        if (idx === undefined) continue;
        const ghost = stage.querySelector<HTMLElement>(`[data-ghost="${side}:${idx}"]`);
        const slot = stage.querySelector<HTMLElement>(`[data-slot="${i}"]`);
        const path = stage.querySelector<SVGPathElement>(`[data-path="${side}:${i}"]`);
        if (!ghost || !slot || !path) continue;
        const g = ghost.getBoundingClientRect();
        const s = slot.getBoundingClientRect();
        const x1 = g.left + g.width / 2 - box.left;
        const y1 = g.bottom - box.top;
        const x2 = s.left + s.width / 2 - box.left;
        const y2 = s.top - box.top;
        const mid = (y1 + y2) / 2;
        path.setAttribute("d", `M${x1} ${y1} C${x1} ${mid} ${x2} ${mid} ${x2} ${y2}`);
      }
    });
  }, [flyers]);

  /** Every element at its resting place and value. */
  const settle = useCallback(() => {
    tlRef.current?.pause();
    const all = q("[data-a],[data-b],[data-c]");
    utils.set(all, { opacity: 1, x: 0, y: 0, scale: 1 });
    utils.set(q("[data-a='ghost']"), { opacity: 0.35 });
    utils.set(q("[data-a='fuse']"), { opacity: 0 });
    utils.set(q("[data-a='path']"), { opacity: 0.25, strokeDashoffset: 0 });
    utils.set(q("[data-a='tick']"), { opacity: 1, scale: 1 });
    utils.set(q("[data-c='rule']"), { scaleX: 1 });
    q("[data-a='value']").forEach((el) => (el.textContent = n2(Number(el.dataset.value))));
    q("[data-a='result']").forEach((el) => (el.textContent = n2(hero.result.score)));
    q("[data-c='num']").forEach((el) => (el.textContent = Number(el.dataset.value).toFixed(Number(el.dataset.dp))));
    drawConnectors();
  }, [q, hero, drawConnectors]);

  const play = useCallback(() => {
    if (!root.current) return;
    tlRef.current?.pause();
    if (reduced) {
      settle();
      return;
    }

    /* Measure first, while every word sits where it will rest. */
    drawConnectors();
    const stage = bandA.current;
    const fly = flyers.map((f, i) => {
      const slot = stage?.querySelector<HTMLElement>(`[data-slot="${i}"]`);
      const out: { el: HTMLElement; ghost: HTMLElement | null; dx: number; dy: number; side: "a" | "b" }[] = [];
      for (const side of ["a", "b"] as const) {
        const idx = f[side];
        if (idx === undefined || !slot) continue;
        const el = slot.querySelector<HTMLElement>(`[data-side="${side}"]`);
        const ghost = stage?.querySelector<HTMLElement>(`[data-ghost="${side}:${idx}"]`) ?? null;
        if (!el || !ghost) continue;
        const a = el.getBoundingClientRect();
        const g = ghost.getBoundingClientRect();
        out.push({ el, ghost, side, dx: g.left + g.width / 2 - (a.left + a.width / 2), dy: g.top + g.height / 2 - (a.top + a.height / 2) });
      }
      return out;
    });
    const flat = fly.flat();

    /* Start state: nothing drawn that the story has not reached. */
    utils.set(q("[data-a='card']"), { opacity: 0 });
    utils.set(q("[data-a='card'][data-side='a']"), { x: -28 });
    utils.set(q("[data-a='card'][data-side='b']"), { x: 28 });
    utils.set(q("[data-a='equation']"), { opacity: 0 });
    utils.set(q("[data-a='ghost']"), { opacity: 1 });
    flat.forEach((f) => utils.set(f.el, { opacity: 0, x: f.dx, y: f.dy, scale: 0.85 }));
    utils.set(q("[data-a='path']"), { opacity: 0, strokeDashoffset: 1 });
    utils.set(q("[data-a='tick']"), { opacity: 0, scale: 0 });
    utils.set(q("[data-a='value']"), { opacity: 0 });
    utils.set(q("[data-a='result']"), { opacity: 0 });
    q("[data-a='value']").forEach((el) => (el.textContent = "0.00"));
    q("[data-a='result']").forEach((el) => (el.textContent = "0.00"));
    utils.set(q("[data-b='zone']"), { opacity: 0 });
    utils.set(q("[data-b='thr']"), { opacity: 0 });
    utils.set(q("[data-b='marker']"), { opacity: 0, y: -26 });
    utils.set(q("[data-c='tile']"), { opacity: 0, y: 14 });
    utils.set(q("[data-c='rule']"), { scaleX: 0 });
    utils.set(q("[data-c='flowtext']"), { opacity: 0 });
    utils.set(q("[data-c='foot']"), { opacity: 0 });
    q("[data-c='num']").forEach((el) => (el.textContent = (0).toFixed(Number(el.dataset.dp))));

    const tl = createTimeline({ defaults: { ease: "inOutQuad" } });

    /* A. the equation: two rows, their words, three terms, one number */
    tl.add(q("[data-a='card']"), { opacity: 1, x: 0, duration: 620, ease: "outCubic", delay: stagger(120) }, AT.cards);
    tl.add(q("[data-a='equation']"), { opacity: 1, duration: 520 }, AT.equation);

    flat.forEach((f, i) => {
      const at = AT.fly + i * 90;
      tl.add(f.ghost!, { opacity: 0.35, duration: 300 }, at);
      tl.add(f.el, { opacity: 1, scale: 1, x: 0, y: 0, duration: 900, ease: "inOutCubic" }, at);
    });
    tl.add(q("[data-a='path']"), { opacity: 0.7, strokeDashoffset: 0, duration: 900, delay: stagger(90) }, AT.fly);
    tl.add(q("[data-a='path']"), { opacity: 0.25, duration: 700 }, AT.resolve + 300);

    // Matching words fuse, and the pair earns a tick.
    const fused = flyers.map((f, i) => ({ f, i })).filter(({ f }) => f.a !== undefined && f.b !== undefined);
    fused.forEach(({ i }, n) => {
      const at = AT.fuse + n * 140;
      const slot = `[data-slot="${i}"]`;
      tl.add(q(`${slot} [data-a='fuse']`), { opacity: 0, scale: 0.8, duration: 320 }, at);
      tl.add(q(`${slot} [data-side='a']`), { scale: [1.14, 1], duration: 420, ease: "outBack" }, at + 120);
      tl.add(q(`${slot} [data-a='tick']`), { opacity: 1, scale: 1, duration: 360, ease: "outBack" }, at + 140);
    });

    // Each term resolves to its value, then the result counts up to the score.
    hero.lanes.forEach((l, li) => {
      const el = q(`[data-a='value'][data-lane="${li}"]`)[0];
      if (!el) return;
      const c = { v: 0 };
      tl.add(el, { opacity: 1, duration: 360 }, AT.resolve + li * 150);
      tl.add(c, { v: l.value, duration: 620, ease: "outQuad", onUpdate: () => (el.textContent = n2(c.v)) }, AT.resolve + li * 150);
    });
    const res = q("[data-a='result']")[0];
    if (res) {
      const c = { v: 0 };
      tl.add(res, { opacity: 1, duration: 300 }, AT.result);
      tl.add(c, { v: hero.result.score, duration: 900, ease: "outQuad", onUpdate: () => (res.textContent = n2(c.v)) }, AT.result);
    }

    /* B. the decision: the track, then four real pairs dropped onto it */
    tl.add(q("[data-b='zone']"), { opacity: 1, duration: 520, delay: stagger(120) }, AT.bandB);
    tl.add(q("[data-b='thr']"), { opacity: 1, duration: 420, delay: stagger(120) }, AT.bandB + 360);
    q("[data-b='marker']").forEach((m, i) => {
      tl.add(m, { opacity: 1, y: 0, duration: 560, ease: "outBack" }, AT.markers + i * AT.markerGap);
    });

    /* C. the result: what the matcher scored when graded blind */
    tl.add(q("[data-c='tile']"), { opacity: 1, y: 0, duration: 520, ease: "outCubic", delay: stagger(140) }, AT.bandC);
    q("[data-c='num']").forEach((el, i) => {
      const c = { v: 0 };
      const to = Number(el.dataset.value);
      const dp = Number(el.dataset.dp);
      tl.add(c, { v: to, duration: 900, ease: "outQuad", onUpdate: () => (el.textContent = c.v.toFixed(dp)) }, AT.bandC + i * 140);
    });
    tl.add(q("[data-c='rule']"), { scaleX: 1, duration: 520, delay: stagger(180) }, AT.flow);
    tl.add(q("[data-c='flowtext']"), { opacity: 1, duration: 420, delay: stagger(180) }, AT.flow);
    tl.add(q("[data-c='foot']"), { opacity: 1, duration: 520 }, AT.foot);

    tlRef.current = tl;
  }, [reduced, flyers, hero, q, settle, drawConnectors]);

  // Plays once on load, before the first paint so no frame shows the end state first.
  useLayoutEffect(() => {
    play();
    return () => {
      tlRef.current?.pause();
    };
    // Once. Replay runs play() again by hand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A resized stage keeps its words where they are and redraws the connectors.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => drawConnectors());
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawConnectors]);

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const zoneTone = (v: Similarity["verdict"]) =>
    v === "same" ? TOKEN.positive : v === "review" ? TOKEN.warn : TOKEN.text2;

  return (
    <AnimationPanel
      title={`How ${hero.partNumbers} part numbers became ${hero.parts} parts`}
      onReplay={play}
    >
      <div ref={root} className="flex flex-col gap-[14px] lg:h-[484px]">
        {/* ─── A. the equation ─── */}
        <div ref={bandA} className="relative flex flex-col justify-between lg:h-[176px]">
          <svg aria-hidden className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
            {flyers.flatMap((f, i) =>
              (["a", "b"] as const)
                .filter((side) => f[side] !== undefined)
                .map((side) => (
                  <path
                    key={`${side}:${i}`}
                    data-a="path"
                    data-path={`${side}:${i}`}
                    pathLength={1}
                    fill="none"
                    stroke={TOKEN.accent}
                    strokeWidth={1}
                    strokeDasharray={1}
                    opacity={0.25}
                  />
                ))
            )}
          </svg>

          <div className="relative z-10 grid grid-cols-2 gap-4">
            {(
              [
                ["a", hero.rowA, hero.chipsA],
                ["b", hero.rowB, hero.chipsB],
              ] as const
            ).map(([side, row, chips]) => (
              <div key={side} data-a="card" data-side={side} className="bg-surface px-4 py-[10px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[12px] text-text-2">{row.pn}</span>
                  <Badge>{row.products.join(", ")}</Badge>
                </div>
                <p className="mt-2 flex flex-wrap gap-x-[18px] text-[22px] font-light leading-snug text-text">
                  {chips.map((c, i) => (
                    <span key={i} data-a="ghost" data-ghost={`${side}:${i}`}>
                      {c.raw}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>

          <div data-a="equation" className="relative z-10 flex items-start justify-center gap-[10px]">
            <span className="sr-only">
              Similarity = {n2(WEIGHTS.type)} × Type + {n2(WEIGHTS.specs)} × Ratings + {n2(WEIGHTS.words)} × Wording
              = {n2(hero.result.score)}. The two rows share every word, so each term is 1.00.
            </span>
            <Cell label="Similarity" />
            <Op>=</Op>
            {hero.lanes.map((l, li) => (
              <div key={l.term} className="flex items-start gap-[10px]">
                <div className="flex flex-col items-center">
                  <div aria-hidden className="flex h-[28px] items-center gap-2">
                    {l.slots.map((s) => {
                      const i = flyers.findIndex((f) => f.lane === li && f.token === s.token);
                      return (
                        <span key={s.token} data-slot={i} className="relative inline-flex">
                          {s.a !== undefined && <WordChip side="a">{s.token}</WordChip>}
                          {s.b !== undefined &&
                            (s.a !== undefined ? (
                              <span data-a="fuse" className="absolute inset-0">
                                <WordChip side="b">{s.token}</WordChip>
                              </span>
                            ) : (
                              <WordChip side="b">{s.token}</WordChip>
                            ))}
                          {s.a !== undefined && s.b !== undefined && (
                            <svg data-a="tick" aria-label="the two words match" viewBox="0 0 13 13" className="absolute -right-[5px] -top-[6px] h-[13px] w-[13px] rounded-full bg-surface">
                              <path d={TICK_PATH} fill="none" stroke={TOKEN.positive} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  <p className="flex h-[30px] items-center whitespace-nowrap text-[22px] font-light leading-none text-text">
                    <span className="tabular-nums">{n2(l.weight)}</span>
                    <span className="mx-2 text-text-3">×</span>
                    {l.term}
                  </p>
                  <p
                    aria-hidden
                    data-a="value"
                    data-lane={li}
                    data-value={l.value}
                    className="h-[20px] text-[15px] tabular-nums leading-[20px] text-positive"
                  >
                    {n2(l.value)}
                  </p>
                </div>
                {li < hero.lanes.length - 1 && <Op>+</Op>}
              </div>
            ))}
            <Op>=</Op>
            <div className="flex flex-col items-center">
              <div className="h-[28px]" />
              <p
                data-a="result"
                data-value={hero.result.score}
                className="flex h-[30px] items-center text-[22px] font-light leading-none tabular-nums text-text"
              >
                {n2(hero.result.score)}
              </p>
              <div className="h-[20px]" />
            </div>
          </div>
        </div>

        {/* ─── B. the decision ─── */}
        <div className="border-t border-line pt-[14px] lg:h-[148px]">
          <div className="relative mx-[6px] h-[134px]">
            {hero.markers.map((m) => {
              const tone = zoneTone(m.verdict);
              const lean =
                m.lean === "left"
                  ? { left: 0 }
                  : m.lean === "right"
                  ? { right: 0 }
                  : { left: 0, transform: "translateX(-50%)" };
              return (
                // A zero-width anchor at the score, so the dot is exactly on it.
                <div key={m.key} className="absolute top-0 z-10 h-[80px] w-0" style={{ left: pct(m.score) }}>
                  <div data-b="marker" title={m.sub} className="absolute inset-0">
                    <div
                      className={`absolute bottom-[21px] flex flex-col ${m.lean === "right" ? "items-end text-right" : m.lean === "left" ? "items-start" : "items-center text-center"}`}
                      style={lean}
                    >
                      <p className="flex items-baseline gap-2 whitespace-nowrap leading-none">
                        <span className="text-[17px] font-light tabular-nums" style={{ color: tone }}>
                          {n2(m.score)}
                        </span>
                        <span className="text-[13px] text-text">{m.title}</span>
                      </p>
                      <p className="mt-[3px] whitespace-nowrap text-[12px] leading-tight text-text-2">{m.note}</p>
                      {m.madeUp && (
                        <span className="mt-[3px]">
                          <Badge tone="warn">Made-up example</Badge>
                        </span>
                      )}
                    </div>
                    <span className="absolute bottom-[11px] left-0 block h-[10px] w-px -translate-x-1/2" style={{ background: tone }} />
                    <span
                      className="absolute bottom-0 left-0 block h-[11px] w-[11px] -translate-x-1/2 rounded-full"
                      style={{
                        background: m.madeUp ? TOKEN.surface : tone,
                        border: `1.5px ${m.madeUp ? "dashed" : "solid"} ${tone}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* The track. The marker dots sit on its top edge. */}
            <div className="absolute inset-x-0 bottom-[20px] h-[36px]">
              <Zone from={0} to={REVIEW} color={TOKEN.text3} label="Different part" />
              <Zone from={REVIEW} to={SAME} color={TOKEN.warn} label="Engineer reviews" />
              <Zone from={SAME} to={1} color={TOKEN.positive} label="Same part" />
              {[REVIEW, SAME].map((t) => (
                <div key={t} data-b="thr" className="absolute -top-[6px] bottom-0 w-px bg-text-2" style={{ left: pct(t) }} />
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[18px] text-[12px] tabular-nums text-text-3">
              {[0, REVIEW, SAME, 1].map((t) => (
                <span
                  key={t}
                  data-b="thr"
                  className="absolute"
                  style={{ left: pct(t), transform: t === 0 ? "none" : t === 1 ? "translateX(-100%)" : "translateX(-50%)" }}
                >
                  {t === 0 ? "0" : t === 1 ? "1" : n2(t)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ─── C. the result ─── */}
        <div className="border-t border-line pt-[14px] lg:h-[132px]">
          {stats ? (
            <div className="flex h-full flex-col justify-between">
              <div className="grid grid-cols-3 gap-4">
                <Tile
                  value={stats.precision}
                  dp={1}
                  unit=" percent"
                  label={`of merges correct, ${stats.correct} of ${stats.merged}`}
                />
                <Tile value={stats.recall} dp={0} unit=" percent" label="of duplicates found alone" />
                <Tile
                  value={stats.wrongMerges}
                  dp={0}
                  unit={stats.wrongMerges === 1 ? " wrong merge" : " wrong merges"}
                  label="dual-input vs triple-input board"
                />
              </div>

              <div className="flex items-center gap-3 text-[14px] text-text">
                <span data-c="flowtext" className="whitespace-nowrap">Matcher proposes {stats.groups} groups.</span>
                <Rule />
                <span data-c="flowtext" className="whitespace-nowrap">Engineer confirms.</span>
                <Rule arrow />
                <span data-c="flowtext" className="whitespace-nowrap">{hero.parts} parts.</span>
              </div>

              <p data-c="foot" className="text-[12px] leading-snug text-text-3">
                Next: read datasheets and drawings for the {hero.seeDwgLines} SEE DWG lines. Source: Anthropic, Testing
                Claude on real-world electronics design, Nov 9 2026, BenchCAD 2.1 83.5 percent.
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-text-2">
              The matcher has not been graded yet, so there are no results to show. Run engine/evaluate_matcher.ts to
              write data/derived/matcher_eval.json.
            </p>
          )}
        </div>
      </div>
    </AnimationPanel>
  );
}

/* ---------- small parts of the diagram ---------- */

function Cell({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="h-[28px]" />
      <p className="flex h-[30px] items-center whitespace-nowrap text-[22px] font-light leading-none text-text">{label}</p>
      <div className="h-[20px]" />
    </div>
  );
}

function Op({ children }: { children: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="h-[28px]" />
      <p className="flex h-[30px] items-center text-[22px] font-light leading-none text-text-3">{children}</p>
      <div className="h-[20px]" />
    </div>
  );
}

function WordChip({ side, children }: { side: "a" | "b"; children: string }) {
  return (
    <span
      data-a="flyer"
      data-side={side}
      className="inline-block whitespace-nowrap rounded-full border border-line-2 bg-panel-2 px-[9px] py-[2px] text-[12px] leading-[18px] text-text"
    >
      {children}
    </span>
  );
}

function Zone({ from, to, color, label }: { from: number; to: number; color: string; label: string }) {
  return (
    <div
      data-b="zone"
      className="absolute inset-y-0 flex items-center justify-center text-[13px] text-text"
      style={{
        left: `${from * 100}%`,
        width: `${(to - from) * 100}%`,
        background: rgba(color, 0.14),
        borderTop: `2px solid ${rgba(color, 0.7)}`,
      }}
    >
      {label}
    </div>
  );
}

function Tile({ value, dp, unit, label }: { value: number; dp: number; unit: string; label: string }) {
  return (
    <div data-c="tile" className="flex items-center gap-3 bg-surface px-4 py-[7px]">
      <p className="whitespace-nowrap text-[22px] font-light leading-none text-text">
        <span data-c="num" data-value={value} data-dp={dp} className="tabular-nums">
          {value.toFixed(dp)}
        </span>
        <span className="text-[14px]">{unit}</span>
      </p>
      <div className="min-w-0">
        <p className="text-[12px] leading-snug text-text-2">{label}</p>
        <p className="font-mono text-[11px] text-text-3">matcher_eval.json</p>
      </div>
    </div>
  );
}

function Rule({ arrow = false }: { arrow?: boolean }) {
  return (
    <span className="relative flex h-[10px] flex-1 items-center">
      <span data-c="rule" className="block h-px w-full origin-left bg-text-3" />
      {arrow && (
        <svg data-c="flowtext" aria-hidden viewBox="0 0 8 10" className="absolute -right-px h-[10px] w-[8px]">
          <path d="M0.5 1 L6.5 5 L0.5 9" fill="none" stroke={TOKEN.text2} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/* ---------- the comparison as a table, for the parts list ---------- */

const VERDICT_TONE = {
  same: "positive",
  review: "warn",
  different: "neutral",
} as const;

const VERDICT_WORD = {
  same: "Same part",
  review: "Send to a person",
  different: "Different parts",
};

/**
 * Two descriptions lined up: what each one is, which ratings agree, and the
 * three weighted lines that add to the score.
 */
export function SimilarityBreakdown({
  a,
  b,
  result,
}: {
  a: string;
  b: string;
  result: Similarity;
}) {
  const { parsedA, parsedB, checks, terms } = result;
  const sum = terms.reduce((n, t) => n + t.contribution, 0);

  return (
    <div className="bg-surface">
      <table className="w-full border-collapse text-[13px]">
        <tbody>
          <tr className="border-b border-line">
            <td className="w-[110px] py-2 pl-3 pr-3 align-top text-[12px] text-text-3">
              Description
            </td>
            <td className="w-1/2 py-2 pr-3 align-top text-text">{a || "—"}</td>
            <td className="w-1/2 py-2 pr-3 align-top text-text">{b || "—"}</td>
            <td className="w-[40px] py-2 pr-3" />
          </tr>
          <tr className="border-b border-line">
            <td className="py-2 pl-3 pr-3 align-top text-[12px] text-text-3">
              Kind of thing
            </td>
            <td className="py-2 pr-3 align-top text-text-2">
              {parsedA.type || "not stated"}
            </td>
            <td className="py-2 pr-3 align-top text-text-2">
              {parsedB.type || "not stated"}
            </td>
            <td className="py-2 pr-3 align-top text-right">
              <Mark ok={result.type === 1} />
            </td>
          </tr>
          {checks.length === 0 && (
            <tr className="border-b border-line">
              <td className="py-2 pl-3 pr-3 align-top text-[12px] text-text-3">
                Ratings
              </td>
              <td colSpan={3} className="py-2 pr-3 text-text-3">
                Neither description carries a rating.
              </td>
            </tr>
          )}
          {checks.map((c) => (
            <tr key={c.unit} className="border-b border-line">
              <td className="py-2 pl-3 pr-3 align-top font-mono text-[12px] text-text-3">
                {c.unit}
              </td>
              <td className="py-2 pr-3 align-top tabular-nums text-text-2">
                {c.a ?? "not stated"}
              </td>
              <td className="py-2 pr-3 align-top tabular-nums text-text-2">
                {c.b ?? "not stated"}
              </td>
              <td className="py-2 pr-3 align-top text-right">
                {c.a === null || c.b === null ? (
                  <span className="text-[12px] text-text-3">—</span>
                ) : (
                  <Mark ok={c.agrees} />
                )}
              </td>
            </tr>
          ))}
          <tr className="border-b border-line">
            <td className="py-2 pl-3 pr-3 align-top text-[12px] text-text-3">
              Rest of the wording
            </td>
            <td className="py-2 pr-3 align-top text-text-2">
              {parsedA.words.join(", ") || "nothing left"}
            </td>
            <td className="py-2 pr-3 align-top text-text-2">
              {parsedB.words.join(", ") || "nothing left"}
            </td>
            <td className="py-2 pr-3 align-top text-right tabular-nums text-text-3">
              {n2(result.words)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-line px-3 py-3">
        {terms.map((t) => (
          <div
            key={t.label}
            className="flex items-baseline justify-between gap-4 py-[3px]"
          >
            <span className="font-mono text-[12px] text-text-2">
              {n2(t.weight)} × {n2(t.value)}
            </span>
            <span className="flex-1 text-[12px] text-text-3">{t.label}</span>
            <span className="tabular-nums text-[12px] text-text-2">
              {n2(t.contribution)}
            </span>
          </div>
        ))}
        {result.override && (
          <p className="mt-1 text-[12px] text-text-3">
            {sum !== result.score ? `${n2(sum)}, then ` : ""}
            {result.override}.
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-4 border-t border-line pt-2">
          <span className="text-[13px] text-text">Score</span>
          <span className="flex items-center gap-3">
            <span className="text-[17px] font-light tabular-nums text-text">
              {n2(result.score)}
            </span>
            <Badge tone={VERDICT_TONE[result.verdict]}>
              {VERDICT_WORD[result.verdict]}
            </Badge>
          </span>
        </div>
        {result.verdict === "review" && result.score < SAME && (
          <p className="mt-2 text-[12px] text-text-3">
            Under {n2(SAME)}, so nothing merges until a person says so.
          </p>
        )}
        {result.score === CONFLICT_CAP && (
          <p className="mt-2 text-[12px] text-text-3">
            One rating that disagrees holds the whole comparison back.
          </p>
        )}
      </div>
    </div>
  );
}

function Mark({ ok }: { ok: boolean }) {
  return (
    <span
      className={`text-[13px] ${ok ? "text-positive" : "text-text-3"}`}
      aria-label={ok ? "agrees" : "does not agree"}
    >
      {ok ? "✓" : "✕"}
    </span>
  );
}
