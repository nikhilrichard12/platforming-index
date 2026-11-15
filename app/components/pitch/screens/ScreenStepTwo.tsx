"use client";

import { FUNCTION_PATHS } from "@/components/ui/FunctionIcons";
import { CLIPS, STEP_TWO } from "@/lib/pitch";
import { FUNCTIONS, FUNCTION_IDENTITY } from "@/lib/roles";
import type { ScreenProps } from "../PitchDeck";
import ClipFrame from "../ClipFrame";
import { Frame, Reveal, StepCount } from "../parts";

/**
 * Screen 8. The measured step.
 *
 * Two recordings run back to back in the same frame: the ballpark the
 * executive already has, and then the measured dashboard the bill of
 * materials produces. The list beside them is the same score said in each
 * function's own unit, read live from lib/roles.ts over the parts and
 * purchase data.
 */
const CLIP_W = 740;
const CLIP_H = 500;

export default function ScreenStepTwo({ bundle, step, active, printing }: ScreenProps) {
  const score = bundle.before.score;
  const clip = step >= 1 ? CLIPS.summary : CLIPS.ballpark;

  return (
    <Frame>
      <div className="flex h-full items-center gap-10">
        <ClipFrame
          key={clip.src}
          clip={clip}
          width={CLIP_W}
          height={CLIP_H}
          play={active && !printing}
          caption={clip.label}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <StepCount n={2} />
          <h1 className="mt-5 text-[40px] font-light leading-[1.14] text-text">
            {STEP_TWO.title}
          </h1>
          <p className="mt-6 text-[17px] leading-snug text-text-2">
            {STEP_TWO.body}
          </p>

          <Reveal show={step >= 2} className="mt-6">
            <ul className="space-y-[10px] border-t border-line pt-4">
              {FUNCTIONS.map((f) => {
                const id = FUNCTION_IDENTITY[f];
                const fig = id.figure(bundle.data, score);
                return (
                  <li key={f} className="flex items-baseline gap-3">
                    <svg
                      width={13}
                      height={13}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#B8BBBE"
                      strokeWidth={1.5}
                      aria-hidden
                      className="shrink-0 translate-y-[2px]"
                    >
                      {FUNCTION_PATHS[f]}
                    </svg>
                    <span className="w-[104px] shrink-0 text-[13px] text-text-2">
                      {f}
                    </span>
                    <span className="w-[120px] shrink-0 text-[19px] font-light leading-none text-text">
                      {fig.value}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] leading-snug text-text-3">
                      {id.unit}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Reveal>

          <p className="mt-5 text-[13px] leading-snug text-text-3">
            {STEP_TWO.note}
          </p>
        </div>
      </div>
    </Frame>
  );
}
