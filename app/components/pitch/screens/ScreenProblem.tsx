"use client";

import { QUOTES, RESEARCH_FIGURES } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { CountTo, Frame, Reveal, Source } from "../parts";

/**
 * Screen 2. The two figures and the one quoted line are copied from
 * docs/CONTEXT.md and carry their attribution on screen. The mentor line is
 * attributed to the mentor, not to the published research, because that is
 * what the file records.
 */
export default function ScreenProblem({ step }: ScreenProps) {
  return (
    <Frame title="Everyone knows platforming pays. Few start. Fewer sustain.">
      <div className="flex h-full flex-col">
        <div className="grid grid-cols-2 gap-12">
          {RESEARCH_FIGURES.map((f, i) => (
            <Reveal key={f.value} show={step >= 1} delay={i * 160} className="h-full">
              <div className="flex h-full flex-col bg-panel p-7">
                <p className="flex items-baseline gap-2 font-light tabular-nums text-text">
                  <CountTo
                    value={f.value}
                    show={step >= 1}
                    className="text-[86px] leading-none"
                  />
                  <span className="text-[30px] leading-none text-text-2">%</span>
                </p>
                <p className="mt-5 text-[19px] leading-snug text-text-2">
                  {f.read}
                </p>
                <div className="mt-auto pt-4">
                  <Source>{f.source}</Source>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal show={step >= 2} className="mt-9">
          <blockquote className="border-l border-line-2 pl-6">
            <p className="max-w-[1050px] text-[23px] font-light leading-snug text-text">
              {QUOTES.mentor.text}
            </p>
            <footer className="mt-3">
              <Source>{QUOTES.mentor.attribution}</Source>
            </footer>
          </blockquote>
        </Reveal>
        <Reveal show={step >= 2} delay={260} className="mt-auto pt-8">
          <p className="text-[30px] font-light leading-snug text-text">
            The blocker is agreement, before it is engineering.
          </p>
        </Reveal>
      </div>
    </Frame>
  );
}
