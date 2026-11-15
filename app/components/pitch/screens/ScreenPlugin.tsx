"use client";

import { CLIPS, PLUGIN } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import Clip from "../Clip";
import { Frame, Reveal } from "../parts";

/**
 * Screen 3. The product, running where the work happens.
 *
 * The recording holds the left half of the stage for the whole screen; the
 * three lines on the right land one per advance, so the presenter can talk
 * over the clip without the deck moving under them.
 */
export default function ScreenPlugin({ step, active, printing }: ScreenProps) {
  return (
    <Frame>
      <div className="flex h-full gap-12">
        <div className="h-full w-[520px] shrink-0">
          <Clip
            src={CLIPS.plugin.src}
            label={CLIPS.plugin.label}
            play={active && !printing}
            loop
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h1 className="text-[42px] font-light leading-[1.12] text-text">
            {PLUGIN.title}
          </h1>

          <ul className="mt-12 space-y-8">
            {PLUGIN.lines.map((line, i) => (
              <Reveal key={line} show={step >= i + 1}>
                <li className="flex items-baseline gap-5">
                  <span
                    aria-hidden
                    className="block h-[2px] w-[34px] shrink-0 bg-accent"
                  />
                  <span className="text-[30px] font-light leading-snug text-text">
                    {line}
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </Frame>
  );
}
