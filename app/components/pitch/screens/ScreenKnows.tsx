"use client";

import { MATCHING } from "@/lib/pitch";
import { REVIEW, SAME, WEIGHTS, similarity } from "@/lib/similarity";
import { PartRow, VoltaraData } from "@/lib/voltaraData";
import type { ScreenProps } from "../PitchDeck";
import { CountTo, Frame, Reveal, Source } from "../parts";

/**
 * Screen 4. Why two part numbers are one part, in five beats.
 *
 *   1. Two real rows of the parts list, written two different ways.
 *   2. The formula, and the two rules that override it.
 *   3. Where four real comparisons land on the track.
 *   4. What the matcher scored when it was graded blind.
 *   5. The lines text cannot read, and what would read them.
 *
 * Every number is computed here rather than written down: the weights and
 * the two thresholds come from lib/similarity.ts, the four scores from
 * running similarity() over descriptions in data/derived/voltara_parts.json,
 * and the graded figures from data/derived/matcher_eval.json.
 */
export default function ScreenKnows({ bundle, step }: ScreenProps) {
  const rows = bundle.data.parts.flatMap((p) => p.rows);
  const row = (pn: string) => rows.find((r) => r.pn === pn) ?? null;

  const a = row(MATCHING.rowA);
  const b = row(MATCHING.rowB);
  const markers = buildMarkers(bundle.data, rows);
  const ev = bundle.matcherEval;
  const seeDwg = rows.filter((r) => /see dwg/i.test(r.desc)).length;

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

  return (
    <Frame title={MATCHING.title}>
      <div className="flex h-full flex-col">
        {/* Beat 1: the two rows. */}
        <div className="grid shrink-0 grid-cols-2 gap-6">
          {[a, b].map((r, i) => (
            <Reveal key={r?.pn ?? i} show delay={i * 90}>
              <div className="bg-panel px-5 py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[12px] text-text-3">
                    {r?.pn ?? "row not in the parts file"}
                  </span>
                  <span className="text-[12px] text-text-3">
                    {r?.products.join(", ")}
                  </span>
                </div>
                <p className="mt-2 text-[26px] font-light leading-none text-text">
                  {r?.desc ?? "—"}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-2 shrink-0 text-[19px] font-light leading-none text-text-2">
          {MATCHING.sameLine}
        </p>

        {/* Beat 2: the formula, and the rules that override it. */}
        <Reveal show={step >= 1} className="mt-6 shrink-0">
          <p className="flex flex-wrap items-baseline gap-x-3 text-[32px] font-light leading-none text-text">
            <span>Similarity</span>
            <span className="text-text-3">=</span>
            <span className="tabular-nums">{WEIGHTS.type.toFixed(2)}</span>
            <span className="text-text-3">×</span>
            <span>Type</span>
            <span className="text-text-3">+</span>
            <span className="tabular-nums">{WEIGHTS.specs.toFixed(2)}</span>
            <span className="text-text-3">×</span>
            <span>Ratings</span>
            <span className="text-text-3">+</span>
            <span className="tabular-nums">{WEIGHTS.words.toFixed(2)}</span>
            <span className="text-text-3">×</span>
            <span>Wording</span>
          </p>
          <p className="mt-3 max-w-[1000px] text-[17px] leading-snug text-text-2">
            {MATCHING.terms}
          </p>
          <p className="mt-3 text-[17px] leading-snug text-text">
            {MATCHING.rules}
          </p>
          <div className="mt-1">
            <Source>{MATCHING.rulesCheck}</Source>
          </div>
        </Reveal>

        {/* Beat 3: four real comparisons on the track. */}
        <Reveal show={step >= 2} className="mt-4 shrink-0">
          <div className="relative mx-[6px] h-[136px]">
            {markers.map((m, i) => {
              // Three label rows, so two scores close together never share a
              // line, and the label hangs on the side that keeps it inside.
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
                  className="absolute top-0 z-10 h-[86px] w-0"
                  style={{ left: pct(m.score) }}
                >
                  <p
                    className="absolute flex items-baseline gap-2 whitespace-nowrap bg-surface px-1 leading-none"
                    style={{ ...lean, top: tier * 26 }}
                  >
                    <span
                      className="text-[17px] font-light tabular-nums"
                      style={{ color: m.tone }}
                    >
                      {m.score.toFixed(2)}
                    </span>
                    <span className="text-[14px] text-text">{m.title}</span>
                    <span className="text-[13px] text-text-3">{m.note}</span>
                  </p>
                  <span
                    className="absolute left-0 block w-px -translate-x-1/2"
                    style={{ background: m.tone, top: tier * 26 + 22, bottom: 0 }}
                  />
                  <span
                    className="absolute bottom-0 left-0 block h-[11px] w-[11px] -translate-x-1/2 -translate-y-[5px] rounded-full"
                    style={{ background: m.tone }}
                  />
                </div>
              );
            })}

            <div className="absolute inset-x-0 bottom-[18px] h-[32px]">
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
        </Reveal>

        {/* Beats 4 and 5: the grading, and the part that is not built. */}
        <div className="mt-auto grid shrink-0 grid-cols-2 gap-6">
          <Reveal show={step >= 3}>
            <div className="h-full bg-panel p-4">
              <p className="text-[13px] uppercase leading-none tracking-wide text-text-3">
                {MATCHING.blindTitle}
              </p>
              {ev ? (
                <>
                  <p className="mt-3 text-[17px] leading-snug text-text-2">
                    Tested blind on {ev.partNumbers} part numbers against a
                    hand-labeled key.
                  </p>
                  <p className="mt-3 flex items-baseline gap-2 leading-none text-text">
                    <CountTo
                      value={ev.pairwisePrecision * 100}
                      show={step >= 3}
                      format={(n) => n.toFixed(1)}
                      className="text-[40px] font-light tabular-nums"
                    />
                    <span className="text-[17px] text-text-2">
                      percent of merges correct
                    </span>
                  </p>
                  <p className="mt-3 text-[17px] leading-snug text-text-2">
                    {ev.wrongMerges} mistake: {MATCHING.mistake}.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-[15px] text-text-2">
                  The matcher has not been graded yet. Run
                  engine/evaluate_matcher.ts.
                </p>
              )}
            </div>
          </Reveal>

          <Reveal show={step >= 4} delay={90}>
            <div className="h-full border border-line-2 p-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[13px] uppercase leading-none tracking-wide text-text-3">
                  {MATCHING.nextTitle}
                </p>
                <p className="text-[12px] leading-none text-warn">
                  {MATCHING.planned}
                </p>
              </div>
              <p className="mt-3 text-[17px] leading-snug text-text-2">
                {seeDwg} lines in the sample only say SEE DWG. {MATCHING.next}
              </p>
              <div className="mt-3">
                <Source>{MATCHING.citation}</Source>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Frame>
  );
}

interface Marker {
  key: string;
  score: number;
  title: string;
  note: string;
  tone: string;
}

/**
 * Four comparisons, all of them between descriptions that are in the parts
 * file, scored by the same function the matcher runs. The wrong merge is the
 * one data/derived/matcher_eval.json names, so beat 3 and beat 4 are the
 * same mistake seen twice.
 */
function buildMarkers(data: VoltaraData, rows: PartRow[]): Marker[] {
  const tone = (score: number) =>
    score >= SAME ? "#59C376" : score >= REVIEW ? "#F5C042" : "#818182";

  const by = (pn: string) => rows.find((r) => r.pn === pn);
  const part = (name: string) => data.parts.find((p) => p.name === name);

  const pairs: { key: string; a?: string; b?: string; title: string; note: string }[] = [
    {
      key: "same",
      a: by("10-92550")?.desc,
      b: by("SL5-2214B")?.desc,
      title: "Axial fan, two part numbers",
      note: "· 10-92550 and SL5-2214B",
    },
    {
      key: "mppt",
      a: by("SL5-7042C")?.desc,
      b: by("SL10-8433D")?.desc,
      title: "Two-input vs three-input board",
      note: "· merged, and wrong",
    },
    {
      key: "dwg",
      a: by("BS-6955-17")?.desc,
      b: part("Axial Fan 120mm 24VDC")?.name,
      title: "FAN - SEE DWG",
      note: "· not enough to tell",
    },
    {
      key: "guard",
      a: part("Axial Fan 120mm 24VDC")?.name,
      b: part("Wire Fan Guard 120mm")?.name,
      title: "Fan vs wire fan guard",
      note: "· different type",
    },
  ];

  return pairs
    .filter((p) => p.a && p.b)
    .map((p) => {
      const score = similarity(p.a!, p.b!).score;
      return { key: p.key, score, title: p.title, note: p.note, tone: tone(score) };
    })
    .sort((x, y) => x.score - y.score);
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
