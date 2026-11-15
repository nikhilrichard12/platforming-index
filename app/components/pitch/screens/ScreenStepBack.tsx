"use client";

import ScreenPlugin from "./ScreenPlugin";
import ScreenSimilar from "./ScreenSimilar";
import { STEP_BACK } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { Frame } from "../parts";

/**
 * Screen 6. The camera pulls back.
 *
 * The tile in the middle is not a drawing of the two screens before this
 * one: it is those two screens, rendered at their own size and scaled down,
 * so there is never an empty box on the stage. They are handed active false,
 * which keeps the plugin recording paused inside the thumbnail.
 *
 * Each line replaces the one before it rather than stacking, so the screen
 * stays as empty as the argument it is making.
 */

const THUMB_W = 1280;
const THUMB_H = 720;
const THUMB_SCALE = 0.3;

export default function ScreenStepBack(props: ScreenProps) {
  const { step } = props;
  /* The pair shrinks as the lines land, which is the pull-back. */
  const scale = [1.26, 0.96, 0.74][Math.min(2, step)];

  return (
    <Frame>
      <div className="flex h-full flex-col items-center justify-center">
        <div
          className="flex items-center gap-5 transition-transform duration-[900ms] ease-out"
          style={{ transform: `scale(${scale})` }}
        >
          <Thumb {...props}>
            <ScreenPlugin {...props} step={3} active={false} />
          </Thumb>
          <Thumb {...props}>
            <ScreenSimilar {...props} step={2} active={false} />
          </Thumb>
        </div>

        <div className="relative mt-20 h-[96px] w-full max-w-[1000px] text-center">
          {STEP_BACK.lines.map((line, i) => (
            <p
              key={line}
              className="absolute inset-x-0 text-[30px] font-light leading-snug text-text transition-opacity duration-500"
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

/** One real screen, drawn at its own size and shrunk into a card. */
function Thumb({ children }: ScreenProps & { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden border border-line-2"
      style={{ width: THUMB_W * THUMB_SCALE, height: THUMB_H * THUMB_SCALE }}
    >
      <div
        style={{
          width: THUMB_W,
          height: THUMB_H,
          transform: `scale(${THUMB_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
