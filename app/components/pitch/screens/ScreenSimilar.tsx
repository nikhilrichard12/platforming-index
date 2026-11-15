"use client";

import { SIMILAR } from "@/lib/pitch";
import { REVIEW, SAME, WEIGHTS, similarity } from "@/lib/similarity";
import { PartRow, PRODUCT_MASTER, VoltaraData } from "@/lib/voltaraData";
import type { ScreenProps } from "../PitchDeck";
import { Equation, Frame, Reveal, Source, Var } from "../parts";

/**
 * Screen 5. How one part number is shown to stand for another.
 *
 *   1. Two real rows, the formula, where four real comparisons land, and
 *      what the matcher scored when it was graded blind.
 *   2. The harder case: two products that share no part numbers at all.
 *   3. The step that is planned and not built.
 *
 * Every figure is computed. The weights and the two thresholds come from
 * lib/similarity.ts, the four scores from running similarity() over
 * descriptions in the parts file, the blind result from matcher_eval.json,
 * and the two-product comparison from the parts list and the proven design
 * records.
 */
export default function ScreenSimilar({ bundle, step }: ScreenProps) {
  const rows = bundle.data.parts.flatMap((p) => p.rows);
  const a = rows.find((r) => r.pn === SIMILAR.rowA) ?? null;
  const b = rows.find((r) => r.pn === SIMILAR.rowB) ?? null;
  const markers = buildMarkers(bundle.data, rows);
  const ev = bundle.matcherEval;
  const precision = ev ? ev.pairwisePrecision * 100 : null;
  const pair = buildPair(bundle, rows);

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

  return (
    <Frame title={SIMILAR.title}>
      <div className="flex h-full flex-col">
        <p className="-mt-5 shrink-0 text-[13px] leading-none text-text-3">
          {SIMILAR.asked}
        </p>

        <div className="mt-6 flex min-h-0 flex-1 gap-10">
          <div className="flex min-w-0 flex-1 flex-col">
            {/* The two rows, as two fans with their part numbers. */}
            <div className="flex shrink-0 items-center gap-7">
              {[a, b].map((r, i) => (
                <div key={r?.pn ?? i} className="flex items-center gap-7">
                  {i === 1 && (
                    <span className="pitch-math text-[30px] leading-none text-text-3">
                      =
                    </span>
                  )}
                  <div className="text-center">
                    <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden>
                      <Fan />
                    </svg>
                    <p className="mt-1 font-mono text-[13px] leading-none text-text-2">
                      {r?.pn ?? "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* The formula. */}
            <Equation className="mt-7 block shrink-0 text-[34px] leading-none text-text">
              <Var>Similarity</Var>
              <span className="px-3 text-text-3">=</span>
              <span className="tabular-nums">{WEIGHTS.type.toFixed(2)}</span>
              <span className="px-2 text-text-3">·</span>
              <Var>Type</Var>
              <span className="px-3 text-text-3">+</span>
              <span className="tabular-nums">{WEIGHTS.specs.toFixed(2)}</span>
              <span className="px-2 text-text-3">·</span>
              <Var>Ratings</Var>
              <span className="px-3 text-text-3">+</span>
              <span className="tabular-nums">{WEIGHTS.words.toFixed(2)}</span>
              <span className="px-2 text-text-3">·</span>
              <Var>Wording</Var>
            </Equation>
            <p className="mt-4 shrink-0 text-[15px] leading-snug text-text-2">
              {SIMILAR.method}
            </p>

            {/* Where four real comparisons land. */}
            <div className="relative mx-[6px] mt-auto h-[118px] shrink-0">
              {markers.map((m, i) => {
                const tier = i % 3;
                const lean =
                  m.score >= 0.8
                    ? { right: 0 }
                    : m.score <= 0.2
                    ? { left: 0 }
                    : { left: 0, transform: "translateX(-50%)" };
                return (
                  <div
                    key={m.key}
                    className="absolute top-0 z-10 h-[68px] w-0"
                    style={{ left: pct(m.score) }}
                  >
                    <p
                      // A scrim, not a solid: the ground behind it is a
                      // gradient, and a stem from another marker has to pass
                      // behind the words rather than through them.
                      className="absolute flex items-baseline gap-2 whitespace-nowrap rounded-[2px] px-[5px] py-[2px] leading-none"
                      style={{
                        ...lean,
                        top: tier * 22,
                        background: "rgba(14,15,18,0.72)",
                      }}
                    >
                      <span
                        className="text-[16px] font-light tabular-nums"
                        style={{ color: m.tone }}
                      >
                        {m.score.toFixed(2)}
                      </span>
                      <span className="text-[13px] text-text">{m.title}</span>
                    </p>
                    <span
                      className="absolute left-0 block w-px -translate-x-1/2"
                      style={{ background: m.tone, top: tier * 22 + 18, bottom: 0 }}
                    />
                    <span
                      className="absolute bottom-0 left-0 block h-[10px] w-[10px] -translate-x-1/2 -translate-y-[5px] rounded-full"
                      style={{ background: m.tone }}
                    />
                  </div>
                );
              })}

              <div className="absolute inset-x-0 bottom-[18px] h-[30px]">
                <Zone from={0} to={REVIEW} color="#818182" label="Different part" />
                <Zone from={REVIEW} to={SAME} color="#F5C042" label="A person looks" />
                <Zone from={SAME} to={1} color="#59C376" label="Same part" />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-[16px] text-[12px] tabular-nums text-text-3">
                {[0, REVIEW, SAME, 1].map((t) => (
                  <span
                    key={t}
                    className="absolute"
                    style={{
                      left: pct(t),
                      transform:
                        t === 0
                          ? "none"
                          : t === 1
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                    }}
                  >
                    {t === 0 ? "0" : t === 1 ? "1" : t.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* The blind test, as a ring. */}
          <div className="flex w-[244px] shrink-0 flex-col items-center">
            <Ring value={precision ?? 0} show={precision !== null} />
            <p className="mt-4 text-center text-[15px] leading-snug text-text-2">
              {SIMILAR.ringRead}
            </p>
            {ev && (
              <p className="mt-2 text-[13px] leading-none text-text-3">
                {ev.wrongMerges} mistake in {ev.mergedPairs}.
              </p>
            )}
          </div>
        </div>

        {/* Beats 2 and 3. */}
        <div className="mt-5 grid shrink-0 grid-cols-[1fr_300px] gap-8">
          <Reveal show={step >= 1}>
            <div className="border-t border-line pt-4">
              <p className="text-[13px] uppercase leading-none tracking-wide text-text-3">
                {SIMILAR.pairTitle}
              </p>
              <p className="mt-3 text-[19px] font-light leading-snug text-text">
                {pair
                  ? `${pair.a} and ${pair.b} share ${pair.shared} of their ${pair.total} part numbers, and both are built on the same ${pair.interfaceName}.`
                  : "The two products are not both in the parts file."}
              </p>
              <p className="mt-2 text-[15px] leading-snug text-text-2">
                {SIMILAR.pairLine}
              </p>
            </div>
          </Reveal>

          <Reveal show={step >= 2}>
            <div className="h-full border-t border-accent pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] uppercase leading-none tracking-wide text-text-3">
                  {SIMILAR.nextTitle}
                </p>
                <p className="text-[12px] leading-none text-warn">
                  {SIMILAR.nextLabel}
                </p>
              </div>
              <p className="mt-3 text-[15px] leading-snug text-text-2">
                {SIMILAR.next}
              </p>
              <div className="mt-2">
                <Source>{SIMILAR.nextCitation}</Source>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Frame>
  );
}

/* ---------- the pieces ---------- */

/** The same fan both part numbers describe. */
function Fan() {
  const blade = "M37 37 C 42.6 25.8 50 18.1 58.1 16.7";
  return (
    <>
      <circle cx={37} cy={37} r={32} fill="none" stroke="#2F3234" />
      {[0, 72, 144, 216, 288].map((deg) => (
        <path
          key={deg}
          d={blade}
          fill="none"
          stroke="#EC5E31"
          strokeWidth={2.4}
          strokeLinecap="round"
          transform={`rotate(${deg} 37 37)`}
        />
      ))}
      <circle cx={37} cy={37} r={4} fill="#EC5E31" />
    </>
  );
}

/** The blind result, drawn as a ring that fills on arrival. */
function Ring({ value, show }: { value: number; show: boolean }) {
  const r = 78;
  const c = 2 * Math.PI * r;
  return (
    <svg width="196" height="196" viewBox="0 0 196 196" role="img" aria-label={`${value.toFixed(1)} percent`}>
      <circle cx={98} cy={98} r={r} fill="none" stroke="#2F3234" strokeWidth={10} />
      <circle
        cx={98}
        cy={98}
        r={r}
        fill="none"
        stroke="#EC5E31"
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={show ? c * (1 - value / 100) : c}
        transform="rotate(-90 98 98)"
        style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.4,0,.2,1)" }}
      />
      <text
        x={98}
        y={104}
        textAnchor="middle"
        fontSize={40}
        fontWeight={300}
        fill="#FFFFFF"
      >
        {value.toFixed(1)}
      </text>
      <text x={98} y={130} textAnchor="middle" fontSize={14} fill="#B8BBBE">
        percent
      </text>
    </svg>
  );
}

interface Marker {
  key: string;
  score: number;
  title: string;
  tone: string;
}

/** Four comparisons between descriptions that are all in the parts file. */
function buildMarkers(data: VoltaraData, rows: PartRow[]): Marker[] {
  const tone = (s: number) =>
    s >= SAME ? "#59C376" : s >= REVIEW ? "#F5C042" : "#818182";
  const by = (pn: string) => rows.find((r) => r.pn === pn)?.desc;
  const part = (name: string) => data.parts.find((p) => p.name === name)?.name;

  const pairs = [
    { key: "same", a: by("10-92550"), b: by("SL5-2214B"), title: "The same fan" },
    {
      key: "mppt",
      a: by("SL5-7042C"),
      b: by("SL10-8433D"),
      title: "Two-input vs three-input board",
    },
    { key: "dwg", a: by("BS-6955-17"), b: part("Axial Fan 120mm 24VDC"), title: "FAN - SEE DWG" },
    {
      key: "guard",
      a: part("Axial Fan 120mm 24VDC"),
      b: part("Wire Fan Guard 120mm"),
      title: "Fan vs wire fan guard",
    },
  ];

  return pairs
    .filter((p) => p.a && p.b)
    .map((p) => {
      const score = similarity(p.a!, p.b!).score;
      return { key: p.key, score, title: p.title, tone: tone(score) };
    })
    .sort((x, y) => x.score - y.score);
}

/**
 * The second beat, computed rather than written: how many part numbers two
 * products from different families have in common, and the proven design
 * they are both on anyway.
 */
function buildPair(bundle: ScreenProps["bundle"], rows: PartRow[]) {
  const { pairA, pairB, pairInterface } = SIMILAR;
  const named = (id: string) =>
    PRODUCT_MASTER.find((p) => p.id === id)?.id ?? id;

  const inA = new Set(rows.filter((r) => r.products.includes(pairA)).map((r) => r.pn));
  const inB = new Set(rows.filter((r) => r.products.includes(pairB)).map((r) => r.pn));
  if (inA.size === 0 || inB.size === 0) return null;

  const shared = [...inA].filter((pn) => inB.has(pn)).length;
  const total = new Set([...inA, ...inB]).size;
  const iface = bundle.interfaces.find((i) => i.id === pairInterface);
  if (!iface || !iface.products.includes(pairA) || !iface.products.includes(pairB)) {
    return null;
  }

  return {
    a: named(pairA),
    b: named(pairB),
    shared,
    total,
    interfaceName: iface.name.toLowerCase(),
  };
}

function Zone({
  from,
  to,
  color,
  label,
}: {
  from: number;
  to: number;
  color: string;
  label: string;
}) {
  return (
    <div
      className="absolute inset-y-0 flex items-center justify-center text-[13px] text-text"
      style={{
        left: `${from * 100}%`,
        width: `${(to - from) * 100}%`,
        background: `${color}24`,
        borderTop: `2px solid ${color}b0`,
      }}
    >
      {label}
    </div>
  );
}
