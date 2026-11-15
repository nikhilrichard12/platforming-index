"use client";

import { CLIPS, STEP_THREE } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import ClipFrame from "../ClipFrame";
import { Frame, Reveal, StepCount } from "../parts";

/**
 * Screen 9. The step where the functions take ownership. The recording is
 * the alignment view: where they disagree, who owns what, and the decision
 * recorded against the disagreement.
 */
const CLIP_W = 740;
const CLIP_H = 500;

export default function ScreenStepThree({ step, active, printing }: ScreenProps) {
  return (
    <Frame>
      <div className="flex h-full items-center gap-10">
        <ClipFrame
          clip={CLIPS.alignment}
          width={CLIP_W}
          height={CLIP_H}
          play={active && !printing}
          caption={CLIPS.alignment.label}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <StepCount n={3} />
          <h1 className="mt-5 text-[40px] font-light leading-[1.14] text-text">
            {STEP_THREE.title}
          </h1>
          <p className="mt-6 text-[17px] leading-snug text-text-2">
            {STEP_THREE.body}
          </p>
          <Reveal show={step >= 1} className="mt-7">
            <p className="border-l-2 border-accent pl-5 text-[22px] font-light leading-snug text-text">
              Each decision goes back into the data the next answer is read
              from.
            </p>
          </Reveal>
        </div>
      </div>
    </Frame>
  );
}
