"use client";

import { FUNCTION_PATHS } from "@/components/ui/FunctionIcons";
import { CLIPS, STEP_TWO } from "@/lib/pitch";
import { FUNCTIONS, FUNCTION_IDENTITY } from "@/lib/roles";
import type { ScreenProps } from "../PitchDeck";
import Clip from "../Clip";
import { Frame, Reveal } from "../parts";

/**
 * Screen 8. The measured step.
 *
 * The recording is the dashboard the company's own parts list produces; the
 * row under it is the same score said in each function's own unit, read live
 * from lib/roles.ts over the parts and purchase data rather than typed here.
 */
export default function ScreenStepTwo({ bundle, step, active, printing }: ScreenProps) {
  const c = CLIPS.summary;
  const score = bundle.before.score;

  return (
    <Frame title={STEP_TWO.title}>
      <div className="flex h-full flex-col">
        <p className="max-w-[1040px] shrink-0 text-[19px] leading-snug text-text-2">
          {STEP_TWO.body}
        </p>

        <div className="mt-6 min-h-0 flex-1">
          <Clip
            src={c.src}
            label={c.label}
            still={c.still}
            play={active && !printing}
            loop
          />
        </div>

        <Reveal show={step >= 1} className="mt-5 shrink-0">
          <div className="flex gap-4 border-t border-line pt-4">
            {FUNCTIONS.map((f) => {
              const id = FUNCTION_IDENTITY[f];
              const fig = id.figure(bundle.data, score);
              return (
                <div key={f} className="flex-1">
                  <p className="flex items-center gap-2 text-[13px] font-semibold leading-none text-text">
                    <svg
                      width={13}
                      height={13}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#B8BBBE"
                      strokeWidth={1.5}
                      aria-hidden
                    >
                      {FUNCTION_PATHS[f]}
                    </svg>
                    {f}
                  </p>
                  <p className="mt-2 text-[22px] font-light leading-none text-text">
                    {fig.value}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-text-2">
                    {id.unit}
                  </p>
                </div>
              );
            })}
          </div>
        </Reveal>

        <p className="mt-4 shrink-0 text-[13px] leading-none text-text-3">
          {STEP_TWO.note}
        </p>
      </div>
    </Frame>
  );
}
