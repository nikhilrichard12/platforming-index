"use client";

import { SMARTER } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Reveal, Source } from "../parts";

/**
 * Screen 6. What the product accumulates.
 *
 *   1. Three kinds of decision, and what each one leaves behind.
 *   2. What that adds up to, and why it compounds.
 *
 * No figure on this screen, because there is no run long enough to have one
 * yet: it describes what the check already records, not something measured.
 */
export default function ScreenSmarter({ step }: ScreenProps) {
  return (
    <Frame>
      <div className="flex h-full flex-col">
        <h1 className="shrink-0 text-[42px] font-light leading-[1.12] text-text">
          {SMARTER.title}
        </h1>

        <ul className="my-auto shrink-0 space-y-10">
          {SMARTER.lines.map((line, i) => {
            const [before, after] = line.split(": ");
            return (
              <Reveal key={line} show delay={i * 110}>
                <li className="flex items-baseline gap-6 border-l border-accent pl-6">
                  <span className="w-[420px] shrink-0 text-[26px] font-light leading-snug text-text-2">
                    {before}
                  </span>
                  <span className="text-[26px] font-light leading-snug text-text">
                    {after}
                  </span>
                </li>
              </Reveal>
            );
          })}
        </ul>

        <Reveal show={step >= 1} className="shrink-0">
          <p className="text-[42px] font-light leading-[1.12] text-text">
            {SMARTER.benchmark}
          </p>
          <p className="mt-4 text-[26px] font-light leading-snug text-text-2">
            {SMARTER.close}
          </p>
          <div className="mt-3">
            <Source>{SMARTER.source}</Source>
          </div>
        </Reveal>
      </div>
    </Frame>
  );
}
