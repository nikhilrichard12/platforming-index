"use client";

import { PROBLEM, RESEARCH_FIGURES } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { CountTo, Frame, Reveal, Source } from "../parts";

/**
 * Screen 1. Four beats on black.
 *
 *   1. What everybody already agrees with, and why it is worth agreeing with.
 *   2. Who asked, and of how many.
 *   3. The two figures that say the agreement is not enough.
 *   4. What the two figures add up to.
 *
 * Both figures and every word beside them are copied from docs/CONTEXT.md
 * through lib/pitch.ts, so nothing on this screen is a number we chose.
 */
export default function ScreenProblem({ step }: ScreenProps) {
  const counted = step >= 2;

  return (
    <Frame dark>
      <div className="flex h-full flex-col">
        <h1 className="max-w-[1060px] shrink-0 text-[56px] font-light leading-[1.12] text-text">
          {PROBLEM.headline}
        </h1>
        <p className="mt-6 max-w-[900px] shrink-0 text-[24px] font-light leading-snug text-text-2">
          {PROBLEM.sub}
        </p>

        <Reveal show={step >= 1} className="mt-8 shrink-0">
          <Source>{PROBLEM.citation}</Source>
        </Reveal>

        <div className="mt-10 grid shrink-0 grid-cols-2 gap-14">
          {RESEARCH_FIGURES.map((f, i) => (
            <Reveal key={f.value} show={counted} delay={i * 90}>
              <p className="flex items-baseline gap-2 font-light tabular-nums text-text">
                <CountTo
                  value={f.value}
                  show={counted}
                  className="text-[96px] leading-none"
                />
                <span className="text-[30px] leading-none text-text-2">
                  {f.unit}
                </span>
              </p>
              <p className="mt-4 max-w-[460px] text-[21px] font-light leading-snug text-text-2">
                {f.read}
              </p>
            </Reveal>
          ))}
        </div>

        <Reveal show={step >= 3} className="mt-auto">
          <p className="max-w-[1100px] text-[30px] font-light leading-snug text-text">
            {PROBLEM.close}
          </p>
        </Reveal>
      </div>
    </Frame>
  );
}
