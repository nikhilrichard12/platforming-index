"use client";

import { useState } from "react";
import Clip from "@/components/pitch/Clip";

/**
 * A bench for components/pitch/Clip, not part of the deck.
 *
 * It is here so the placeholder can be looked at before a clip exists and so
 * the play and pause gates can be worked without walking the deck. Every
 * clip the deck uses should be listed here as it is written.
 */
const CLIPS = [
  { src: "/pitch/clips/matcher.mp4", label: "The matcher grouping 252 part numbers" },
  { src: "/pitch/clips/panel.mp4", label: "The panel finding a part already in stock" },
];

export default function ClipBench() {
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <main className="h-screen overflow-auto bg-surface px-12 py-11">
      <h1 className="text-[28px] font-light text-text">Clips</h1>
      <p className="mt-2 max-w-[700px] text-[15px] leading-snug text-text-2">
        Files live in public/pitch/clips. A clip that is not there yet renders
        the frame below instead, so a missing recording never breaks the deck.
      </p>

      <div className="mt-9 grid grid-cols-2 gap-8">
        {CLIPS.map((c) => (
          <div key={c.src}>
            <div className="h-[260px]">
              <Clip src={c.src} label={c.label} play={playing === c.src} />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPlaying(playing === c.src ? null : c.src)}
                className="border border-line-2 px-3 py-1 text-[13px] text-text-2 hover:text-text"
              >
                {playing === c.src ? "Pause" : "Play"}
              </button>
              <span className="text-[12px] text-text-3">{c.src}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
