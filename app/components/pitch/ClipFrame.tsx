"use client";

import { ReactNode } from "react";
import { ClipSpec } from "@/lib/pitch";
import Clip from "./Clip";

/**
 * A recording given its own shape inside a fixed box.
 *
 * The three step screens and the plugin screen all put a clip on the left of
 * the stage, and every recording is a different shape: one near square, two
 * close to sixteen by nine. The box is fixed so the screens line up with one
 * another, and the clip inside it is sized from its own filmed dimensions,
 * so nothing is ever cropped or letterboxed by us.
 */
export default function ClipFrame({
  clip,
  width,
  height,
  play,
  caption,
}: {
  clip: ClipSpec;
  width: number;
  height: number;
  play: boolean;
  /** Printed under the clip when the screen wants it named. */
  caption?: ReactNode;
}) {
  const ratio = clip.width / clip.height;
  const box =
    width / height > ratio
      ? { width: Math.round(height * ratio), height }
      : { width, height: Math.round(width / ratio) };

  return (
    // The box is a fixed size so the three step screens line up with one
    // another; the clip and its caption sit together inside it, centred, so
    // the words stay under the picture rather than under the empty space.
    <div
      style={{ width, height }}
      className="flex shrink-0 flex-col items-start justify-center"
    >
      <div style={{ width: box.width, height: box.height }}>
        <Clip src={clip.src} label={clip.label} play={play} loop />
      </div>
      {caption ? (
        <p
          className="mt-3 text-[15px] leading-snug text-text-2"
          style={{ width: box.width }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
