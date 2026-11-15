"use client";

import { CLIPS, PLUGIN } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import Clip from "../Clip";
import { Frame, Reveal } from "../parts";

/**
 * Screen 4. The product, running where the work happens.
 *
 * The recording plays for the whole screen and the three sentences land one
 * per advance. The frame is given the video's own shape rather than a shape
 * of its own: the clip is 1126 by 1080, near enough square, so a box cut to
 * 16:9 would either crop a third of the panel away or sit it between two
 * black bars. A clip wider than 7:5 would take the full width instead, with
 * the sentences underneath.
 *
 * The title sits in the right-hand column rather than in the frame's own
 * slot, which is what lets the recording have the full height of the stage.
 */

const STAGE_W = 1280 - 96;
const STAGE_H = 720 - 88;
const LANDSCAPE = 1.4;

export default function ScreenPlugin({ step, active, printing }: ScreenProps) {
  const clip = CLIPS.plugin;
  const ratio = clip.width / clip.height;
  const landscape = ratio >= LANDSCAPE;

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
      <h1 className="text-[40px] font-light leading-[1.14] text-text">
        {PLUGIN.title}
      </h1>
      <ul className={landscape ? "mt-6 flex gap-8" : "mt-10 space-y-7"}>
        {PLUGIN.lines.map((line, i) => (
          <Reveal
            key={line}
            show={step >= i + 1}
            className={landscape ? "flex-1" : ""}
          >
            <li className="flex items-baseline gap-4">
              <span
                aria-hidden
                className="block h-[2px] w-[28px] shrink-0 bg-accent"
              />
              <span className="text-[19px] leading-snug text-text">{line}</span>
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
