"use client";

import { CLIPS, STEP_ONE } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import ClipFrame from "../ClipFrame";
import { Frame, Reveal, StepCount } from "../parts";

/**
 * Screen 7. The free step.
 *
 * The two recordings run back to back in the same frame: the questions on
 * the first advance, the result they produce on the second. The clip holds
 * the left of the stage at the same size the plugin screen uses, so the
 * three step screens and the product screen all carry the same weight.
 */
const CLIP_W = 740;
const CLIP_H = 500;

export default function ScreenStepOne({ step, active, printing }: ScreenProps) {
  const clip = step >= 2 ? CLIPS.ballpark : CLIPS.survey;

  return (
    <Frame>
      <div className="flex h-full items-center gap-10">
        <ClipFrame
          key={clip.src}
          clip={clip}
          width={CLIP_W}
          height={CLIP_H}
          play={active && step >= 1 && !printing}
          caption={step >= 1 ? clip.label : null}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <StepCount n={1} />
          <h1 className="mt-5 text-[40px] font-light leading-[1.14] text-text">
            {STEP_ONE.title}
          </h1>
          <p className="mt-6 text-[17px] leading-snug text-text-2">
            {STEP_ONE.body}
          </p>
          <Reveal show={step >= 1} className="mt-6">
            <p className="text-[13px] leading-snug text-text-3">
              {STEP_ONE.note}
            </p>
          </Reveal>
        </div>
      </div>
    </Frame>
  );
}
