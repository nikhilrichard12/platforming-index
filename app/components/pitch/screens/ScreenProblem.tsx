"use client";

import { PROBLEM } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { CountTo, Frame, Reveal, Source } from "../parts";

/**
 * Screen 2. The two problems, side by side.
 *
 *   1. The effort it takes, with the share of leaders who name it.
 *   2. How few companies do it, by industry. The four under half are the
 *      market this is aimed at, and the bracket says so.
 *   3. Why both of them are the opportunity.
 *
 * The two percentages are the survey's own, carried from docs/CONTEXT.md
 * through lib/pitch.ts. The industry bars are the figures the deck brief
 * supplies, printed with the survey they came from under the chart.
 */

/** Bar geometry, 40 percent larger than the first cut. */
const ROW = 32;
const LABEL_W = 190;
/** The gutter the bracket and its label live in, left of the names. */
const GUTTER = 116;

export default function ScreenProblem({ step }: ScreenProps) {
  const bars = step >= 1;
  const top = Math.max(...PROBLEM.bars.map((b) => b.value));
  const target = PROBLEM.bars
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.value < PROBLEM.targetUnder);
  const firstTarget = target[0]?.i ?? 0;

  return (
    <Frame title={PROBLEM.title}>
      <div className="flex h-full flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-[440px_1fr] gap-16 pt-6">
          {/* Left: the effort. */}
          <div className="flex flex-col">
            <p className="text-[24px] font-light leading-snug text-text">
              {PROBLEM.effortHead}
            </p>
            <p className="mt-4 text-[17px] leading-snug text-text-2">
              {PROBLEM.effortBody}
            </p>
            <p className="mt-8 flex items-baseline gap-3 font-light tabular-nums text-text">
              <CountTo
                value={PROBLEM.effortFigure}
                show
                className="text-[96px] leading-none"
              />
              <span className="text-[28px] leading-none text-text-2">
                percent
              </span>
            </p>
            <p className="mt-3 text-[19px] font-light leading-snug text-text-2">
              {PROBLEM.effortRead}
            </p>
            <div className="mt-2">
              <Source>{PROBLEM.effortSource}</Source>
            </div>
          </div>

          {/* Right: the chart. */}
          <div className="flex flex-col">
            <p className="text-[24px] font-light leading-snug text-text">
              {PROBLEM.adoptionHead}
            </p>
            <p className="mt-4 text-[14px] leading-snug text-text-3">
              {PROBLEM.chartTitle}
            </p>

            <div className="relative mt-4">
              <ul>
                {PROBLEM.bars.map((b, i) => {
                  const picked = b.value < PROBLEM.targetUnder;
                  return (
                    <li
                      key={b.name}
                      className="flex items-center gap-3"
                      style={{ height: ROW, paddingLeft: GUTTER }}
                    >
                      <span
                        className="shrink-0 text-right text-[15px] leading-none"
                        style={{
                          width: LABEL_W,
                          color: picked ? "#FFFFFF" : "#B8BBBE",
                        }}
                      >
                        {b.name}
                      </span>
                      <span className="relative h-[22px] min-w-0 flex-1">
                        <span
                          className="absolute inset-y-0 left-0 block origin-left transition-transform duration-500 ease-out"
                          style={{
                            width: `${(b.value / top) * 100}%`,
                            background: picked ? "#EC5E31" : "#7C22DD",
                            opacity: picked ? 1 : 0.55,
                            transform: bars ? "scaleX(1)" : "scaleX(0)",
                            transitionDelay: `${i * 60}ms`,
                          }}
                        />
                      </span>
                      <span
                        className="w-[34px] shrink-0 text-[17px] tabular-nums leading-none transition-opacity duration-300"
                        style={{
                          color: picked ? "#EC5E31" : "#B8BBBE",
                          opacity: bars ? 1 : 0,
                          transitionDelay: `${i * 60 + 140}ms`,
                        }}
                      >
                        {b.value}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* The bracket beside the four industries under half. */}
              <div
                className="absolute left-0 flex items-center gap-2 transition-opacity duration-500"
                style={{
                  width: GUTTER - 8,
                  top: firstTarget * ROW,
                  height: target.length * ROW,
                  opacity: bars ? 1 : 0,
                  transitionDelay: `${PROBLEM.bars.length * 60 + 160}ms`,
                }}
              >
                <p className="min-w-0 flex-1 text-right text-[15px] leading-snug text-accent">
                  {PROBLEM.targetLabel}
                </p>
                <svg width="12" height={target.length * ROW} aria-hidden>
                  <path
                    d={`M11 2 H4 V${target.length * ROW - 2} H11`}
                    fill="none"
                    stroke="#EC5E31"
                    strokeWidth="1.4"
                  />
                </svg>
              </div>
            </div>

            <div className="mt-4">
              <Source>{PROBLEM.chartSource}</Source>
            </div>
          </div>
        </div>

        <Reveal show={step >= 2} className="mt-5 shrink-0">
          <p className="max-w-[1120px] border-t border-line pt-5 text-[22px] font-light leading-snug text-text">
            {PROBLEM.close}
          </p>
        </Reveal>
      </div>
    </Frame>
  );
}
