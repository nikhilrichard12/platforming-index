"use client";

import { STEP_BACK } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { Frame } from "../parts";

/**
 * Screen 6. The camera pulls back.
 *
 * The two screens before this one shrink into a single tile in the middle of
 * an empty field, which is the point being made: what you have just watched
 * is one tile's worth of a company, and it only runs if the company hands
 * over its data. Each line replaces the one before it rather than stacking,
 * so the screen stays as empty as the argument.
 */
export default function ScreenStepBack({ step }: ScreenProps) {
  /* The tile shrinks on arrival and keeps shrinking as the lines land. */
  const scale = [1.55, 1.04, 0.72][Math.min(2, step)];

  return (
    <Frame>
      <div className="relative flex h-full flex-col items-center justify-center">
        <div
          className="flex items-center justify-center gap-3 transition-transform duration-[900ms] ease-out"
          style={{ transform: `scale(${scale})` }}
        >
          <Tile label="The plugin" />
          <Tile label="The matching" />
        </div>

        <div className="mt-24 h-[112px] w-full max-w-[940px] text-center">
          {STEP_BACK.lines.map((line, i) => (
            <p
              key={line}
              className="absolute inset-x-0 mx-auto max-w-[940px] px-12 text-[30px] font-light leading-snug text-text transition-opacity duration-500"
              style={{ opacity: step === i ? 1 : 0 }}
              aria-hidden={step !== i}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/** One of the two screens just presented, reduced to a card. */
function Tile({ label }: { label: string }) {
  return (
    <div className="flex h-[196px] w-[292px] flex-col justify-end border border-line-2 bg-[#1B1C20] p-4">
      <div aria-hidden className="mb-auto mt-2 space-y-2">
        <span className="block h-[6px] w-[70%] bg-line" />
        <span className="block h-[6px] w-[48%] bg-line" />
        <span className="block h-[6px] w-[60%] bg-line" />
      </div>
      <p className="text-[14px] leading-none text-text-3">{label}</p>
    </div>
  );
}
