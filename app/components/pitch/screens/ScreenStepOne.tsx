"use client";

import { CLIPS, STEP_ONE } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import Clip from "../Clip";
import { Frame, Reveal } from "../parts";

/**
 * Screen 7. The free step, and what it is for.
 *
 * Two recordings run back to back, the questions and then the result. Where
 * a recording does not exist yet the Clip shows a still of the same screen
 * instead, so the deck always has the real product on it.
 */
export default function ScreenStepOne({ step, active, printing }: ScreenProps) {
  const shots = [CLIPS.survey, CLIPS.ballpark];

  return (
    <Frame title={STEP_ONE.title}>
      <div className="flex h-full flex-col">
        <p className="max-w-[1040px] shrink-0 text-[19px] leading-snug text-text-2">
          {STEP_ONE.body}
        </p>

        <div className="mt-7 grid min-h-0 flex-1 grid-cols-2 gap-8">
          {shots.map((c, i) => (
            <Reveal key={c.src} show={step >= i + 1} className="flex flex-col">
              <div className="min-h-0 flex-1">
                <Clip
                  src={c.src}
                  label={c.label}
                  still={c.still}
                  play={active && step >= i + 1 && !printing}
                  loop
                />
              </div>
              <p className="mt-3 shrink-0 text-[15px] leading-snug text-text-2">
                {c.label}
              </p>
            </Reveal>
          ))}
        </div>

        <p className="mt-5 shrink-0 text-[13px] leading-none text-text-3">
          {STEP_ONE.note}
        </p>
      </div>
    </Frame>
  );
}
