"use client";

import { PROBLEM } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { CountTo, Frame, Reveal, Source } from "../parts";

/**
 * Screen 2. The two problems, side by side.
 *
 *   1. The effort it takes, and the share of leaders who name it.
 *   2. How few companies do it, by industry, with energy and power picked
 *      out because that is the sector the sample company sits in.
 *   3. What the two of them leave behind.
 *
 * The two percentages are the survey's own, carried from docs/CONTEXT.md
 * through lib/pitch.ts. The industry bars are the figures the deck brief
 * supplies, printed with the survey they came from under the chart.
 */
export default function ScreenProblem({ step }: ScreenProps) {
  const bars = step >= 1;
  const top = Math.max(...PROBLEM.bars.map((b) => b.value));

  return (
    <Frame title={PROBLEM.title}>
      <div className="flex h-full flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-14">
          {/* Left: the effort. */}
          <div className="flex flex-col">
            <p className="text-[24px] font-light leading-snug text-text">
              {PROBLEM.effortHead}
            </p>
            <p className="mt-4 text-[17px] leading-snug text-text-2">
              {PROBLEM.effortBody}
            </p>
            <div className="mt-auto">
              <p className="flex items-baseline gap-3 font-light tabular-nums text-text">
                <CountTo
                  value={PROBLEM.effortFigure}
                  show
                  className="text-[104px] leading-none"
                />
                <span className="text-[30px] leading-none text-text-2">
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
          </div>

          {/* Right: the chart. */}
          <div className="flex flex-col">
            <p className="text-[24px] font-light leading-snug text-text">
              {PROBLEM.adoptionHead}
            </p>
            <p className="mt-4 text-[13px] leading-snug text-text-3">
              {PROBLEM.chartTitle}
            </p>

            <ul className="mt-4 space-y-[9px]">
              {PROBLEM.bars.map((b, i) => (
                <li key={b.name} className="flex items-center gap-3">
                  <span className="w-[162px] shrink-0 text-right text-[13px] leading-none text-text-2">
                    {b.name}
                  </span>
                  <span className="relative h-[17px] min-w-0 flex-1">
                    <span
                      className="absolute inset-y-0 left-0 block origin-left transition-transform duration-500 ease-out"
                      style={{
                        width: `${(b.value / top) * 100}%`,
                        background: b.accent ? "#EC5E31" : "#7C22DD",
                        opacity: b.accent ? 1 : 0.55,
                        transform: bars ? "scaleX(1)" : "scaleX(0)",
                        transitionDelay: `${i * 70}ms`,
                      }}
                    />
                  </span>
                  <span
                    className="w-[30px] shrink-0 text-[14px] tabular-nums leading-none transition-opacity duration-300"
                    style={{
                      color: b.accent ? "#EC5E31" : "#B8BBBE",
                      opacity: bars ? 1 : 0,
                      transitionDelay: `${i * 70 + 160}ms`,
                    }}
                  >
                    {b.value}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-3">
              <Source>{PROBLEM.chartSource}</Source>
            </div>
          </div>
        </div>

        <Reveal show={step >= 2} className="mt-6 shrink-0">
          <p className="border-t border-line pt-5 text-[24px] font-light leading-snug text-text">
            {PROBLEM.close}
          </p>
        </Reveal>
      </div>
    </Frame>
  );
}
