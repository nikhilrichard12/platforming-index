"use client";

import { TIMELINE, TIMELINE_SOURCE } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Reveal, Source } from "../parts";

/**
 * Screen 7. The four turns that shaped the product, one per advance.
 *
 * Three of them are people who told us something we did not know, and the
 * fourth is the research that started it. They are named as they named
 * themselves; docs/CONTEXT.md records the conversations.
 */
export default function ScreenProcess({ step }: ScreenProps) {
  return (
    <Frame title="How we got here.">
      <div className="flex h-full flex-col">
        <div className="relative my-auto shrink-0">
          {/* The line the four points sit on. */}
          <div className="absolute left-0 right-0 top-[7px] h-px bg-line" />

          <div className="relative grid grid-cols-4 gap-8">
            {TIMELINE.map((t, i) => (
              <Reveal key={t.who} show={step >= i}>
                <span
                  aria-hidden
                  className="block h-[15px] w-[15px] rounded-full border border-accent bg-surface"
                />
                <p className="mt-6 text-[26px] font-light leading-none text-text">
                  {t.who}
                </p>
                <p className="mt-4 text-[19px] leading-snug text-text-2">
                  {t.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          <Source>{TIMELINE_SOURCE}</Source>
        </div>
      </div>
    </Frame>
  );
}
