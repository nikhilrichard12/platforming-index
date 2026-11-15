"use client";

import { useRef } from "react";
import PartMergeAnimation from "@/components/dashboard/PartMergeAnimation";
import { PRODUCT_MASTER } from "@/lib/voltaraData";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Typed } from "../parts";

/**
 * Screen 1. One line, then the parts list collapses under it.
 *
 * The merge is the dashboard's own component, animating one element per part
 * number in the parts list, so the figure on screen and the number of squares
 * moving are the same fact.
 *
 * It is mounted from the first paint and hidden, because it plays once on
 * mount and a print has no time to wait for it. The advance the presenter
 * makes changes its key, which replays it in view; a print raises the step
 * without touching the key, so the page is captured with the clusters already
 * landed.
 */
export default function ScreenHook({ bundle, step, printing }: ScreenProps) {
  const s = bundle.data.summary;
  const products = bundle.products ?? PRODUCT_MASTER.length;

  const merged = step >= 1;
  const advanced = useRef(false);
  if (merged && !printing) advanced.current = true;

  const line = merged
    ? `It needs ${s.realParts}.`
    : `Voltara builds ${products} products with ${s.partNumbers} part numbers.`;

  return (
    <Frame dark>
      <div className="flex h-full flex-col">
        <h1 className="min-h-[132px] max-w-[1050px] text-[52px] font-light leading-[1.1] text-text">
          <Typed text={line} play={!merged && !printing} />
        </h1>

        <div
          className={`mt-2 flex-1 transition-opacity duration-500 ${
            merged ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={!merged}
        >
          <PartMergeAnimation
            key={advanced.current ? "replay" : "first"}
            data={bundle.data}
            title={`${s.partNumbers} part numbers, grouped by the product that carries them`}
            note="Every square is one line of the parts list."
            tail={`${s.coreCandidates} of them fit a common core`}
            footnote="Sample data. The squares are the rows in data/derived/voltara_parts.json."
            onOpenPart={() => {}}
          />
        </div>

        <p className="mt-6 shrink-0 text-[13px] text-text-3">
          Fictional sample company. Real pattern.
        </p>
      </div>
    </Frame>
  );
}
