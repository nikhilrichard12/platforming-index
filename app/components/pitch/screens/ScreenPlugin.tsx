"use client";

import { CLIPS, PLUGIN } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import Clip from "../Clip";
import { Frame, Reveal } from "../parts";

/**
 * Screen 3. The product, running where the work happens.
 *
 * The recording plays for the whole screen and the three lines land one per
 * advance, so the presenter can talk over it without the deck moving under
 * them.
 *
 * The frame is given the video's own shape rather than a shape of its own:
 * the clip is 1126 by 1080, near enough square, so a box cut to 16:9 would
 * either crop a third of the panel away or sit it between two black bars.
 * A clip wider than about 7:5 is treated as landscape instead, and takes the
 * full width with the three lines under it.
 */

/** The stage inside the frame's own padding. */
const STAGE_W = 1280 - 96;
const STAGE_H = 720 - 88;
/** Above this, a clip is wide enough to be worth the full width. */
const LANDSCAPE = 1.4;

export default function ScreenPlugin({ step, active, printing }: ScreenProps) {
  const clip = CLIPS.plugin;
  const ratio = clip.width / clip.height;
  const landscape = ratio >= LANDSCAPE;

  /* Beside the lines, the clip takes the height; above them, the width. */
  const box = landscape
    ? { width: STAGE_W, height: Math.round(STAGE_W / ratio) }
    : { width: Math.round(STAGE_H * ratio), height: STAGE_H };

  const player = (
    <div style={{ width: box.width, height: box.height }} className="shrink-0">
      <Clip
        src={clip.src}
        label={clip.label}
        play={active && !printing}
        loop
      />
    </div>
  );

  const words = (
    <>
      <h1 className="text-[42px] font-light leading-[1.12] text-text">
        {PLUGIN.title}
      </h1>
      <ul className={landscape ? "mt-6 flex gap-10" : "mt-12 space-y-8"}>
        {PLUGIN.lines.map((line, i) => (
          <Reveal key={line} show={step >= i + 1} className={landscape ? "flex-1" : ""}>
            <li className="flex items-baseline gap-5">
              <span
                aria-hidden
                className="block h-[2px] w-[34px] shrink-0 bg-accent"
              />
              <span className="text-[26px] font-light leading-snug text-text">
                {line}
              </span>
            </li>
          </Reveal>
        ))}
      </ul>
    </>
  );

  return (
    <Frame>
      {landscape ? (
        <div className="flex h-full flex-col">
          {player}
          <div className="mt-auto">{words}</div>
        </div>
      ) : (
        <div className="flex h-full gap-10">
          {player}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            {words}
          </div>
        </div>
      )}
    </Frame>
  );
}
