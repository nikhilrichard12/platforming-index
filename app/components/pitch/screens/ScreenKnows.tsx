"use client";

import { MATCH_NEXT } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import MatchingSlot from "../MatchingSlot";
import { Frame, Reveal, Source } from "../parts";

/** What the presenter is pointing at, one line per band. */
const BANDS = [
  "Two descriptions, three terms, one number.",
  "The number decides, or it asks a person.",
  "Graded blind against a key the matcher never reads.",
];

/**
 * Screen 4. The matcher, walked band by band.
 *
 * The diagram is the dashboard's own (components/dashboard/MatchingPanel),
 * imported rather than redrawn, so every figure on it is the one the
 * Inventory tab shows: the two rows and their words come from the parts
 * file, the weights and the thresholds from lib/similarity.ts, and the three
 * graded figures from data/derived/matcher_eval.json. The deck adds no
 * number of its own; the last beat adds the one thing the diagram cannot
 * claim, which is what happens next and that it is not built.
 */
export default function ScreenKnows({ bundle, step }: ScreenProps) {
  const bands = Math.min(3, step + 1);
  const next = step >= 3;

  return (
    <Frame>
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-baseline justify-between gap-6">
          <p className="text-[15px] font-light leading-none text-text-3">
            How it knows
          </p>
          <p className="text-[15px] font-light leading-none text-text-2">
            {BANDS[Math.min(BANDS.length - 1, step)]}
          </p>
        </div>

        <div className="mt-4 shrink-0">
          <MatchingSlot
            data={bundle.data}
            evaluation={bundle.matcherEval}
            bands={bands}
          />
        </div>

        <Reveal show={next} className="mt-auto">
          <div className="flex items-end justify-between gap-10 border-t border-line pt-4">
            <div>
              <p className="text-[30px] font-light leading-none text-text">
                {MATCH_NEXT.line}
              </p>
              <p className="mt-3 text-[15px] leading-snug text-text-2">
                {MATCH_NEXT.planned}
              </p>
            </div>
            <div className="max-w-[420px] text-right">
              <Source>{MATCH_NEXT.citation}</Source>
            </div>
          </div>
        </Reveal>
      </div>
    </Frame>
  );
}
