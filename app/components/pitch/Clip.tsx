"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A video on a pitch screen.
 *
 * Three things it has to do, in the order they matter:
 *
 *   1. Never break the deck. A clip that has not been recorded yet renders a
 *      labelled frame naming the file it is waiting for, so a missing asset
 *      costs a picture and nothing else. The file is checked with a HEAD
 *      request on mount as well as caught on the element's error event,
 *      because a dev server answers a missing public file with an HTML 404
 *      that a <video> only rejects after it has tried to decode it.
 *   2. Play on the advance, not on mount. `play` is the screen's own step
 *      gate, so the clip starts when the presenter walks onto its beat.
 *   3. Stop when the screen is left. Every screen stays mounted for the print
 *      path, so a clip that was not paused would go on playing behind the
 *      deck. The screen passes `play={active && step >= n}` and this pauses
 *      on either one going false.
 *
 * Muted, because a deck autoplays and a browser will not autoplay sound.
 */
export default function Clip({
  src,
  label,
  play,
  loop = false,
  className = "",
}: {
  /** A file under public/pitch/clips, given as its URL path. */
  src: string;
  /** What the clip shows, printed under the still that stands in for it. */
  label: string;
  /** True on the beat this clip belongs to, false once the screen is left. */
  play: boolean;
  loop?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(src, { method: "HEAD" })
      .then((r) => {
        // An HTML answer is the dev server's 404 page, not a video.
        const type = r.headers.get("content-type") ?? "";
        if (live && (!r.ok || type.startsWith("text/html"))) setMissing(true);
      })
      .catch(() => {
        if (live) setMissing(true);
      });
    return () => {
      live = false;
    };
  }, [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el || missing) return;
    if (play) {
      el.currentTime = 0;
      // A rejected play() is a browser policy, not a fault worth surfacing.
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [play, missing]);

  // Every clip the deck names exists; if one is ever removed, the frame goes
  // quiet rather than printing a placeholder over the design.
  if (missing) {
    return (
      <div
        className={`h-full w-full ${className}`}
        role="img"
        aria-label={label}
      />
    );
  }

  return (
    <video
      ref={ref}
      src={src}
      // Contain, not cover: a screen that has given the frame the video's own
      // shape gets the same picture either way, and a screen that has not
      // loses a black bar rather than a third of the recording.
      className={`block h-full w-full object-contain ${className}`}
      muted
      playsInline
      loop={loop}
      preload="auto"
      aria-label={label}
      onError={() => setMissing(true)}
    />
  );
}
