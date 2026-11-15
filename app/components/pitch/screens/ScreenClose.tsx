"use client";

import ExplodedView from "@/components/dashboard/ExplodedView";
import { CORE_PRODUCTS } from "@/lib/index";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Reveal, Source } from "../parts";

const TEAM = ["Nikhil Richard", "Rittrija Mandal"];

/**
 * Screen 9. The core, then the ask.
 *
 * The stack is the dashboard's exploded view, one block per part the chosen
 * product carries, with accent reserved for a part five or more products
 * already share. It is a schematic read out of the parts list, not a design,
 * and the panel's own footnote says so.
 */
export default function ScreenClose({ bundle, step }: ScreenProps) {
  const s = bundle.data.summary;

  return (
    <Frame
      kicker="The shared core"
      title={`${s.coreCandidates} parts fit ${CORE_PRODUCTS} or more products.`}
    >
      <div className="flex h-full gap-12">
        {/* Sized so the panel's own footnote still lands inside the stage. */}
        <div className="w-[468px] shrink-0">
          <ExplodedView data={bundle.data} onAsk={() => {}} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[17px] leading-snug text-text-2">
            Design concept drawn from the parts data. Accent marks a part that{" "}
            {CORE_PRODUCTS} or more products already share, which is the same
            definition the index scores on.
          </p>
          <div className="mt-2">
            <Source>Parts list, sample data</Source>
          </div>

          <Reveal show={step >= 1} className="mt-auto">
            <p className="max-w-[560px] text-[34px] font-light leading-[1.2] text-text">
              Ballpark today. Measured in two weeks. Sustained every time an
              engineer picks a part.
            </p>
            <p className="mt-8 text-[17px] text-text-2">
              {TEAM.join(" and ")}
            </p>
            <div className="mt-1">
              <Source>Team Ladebuggers</Source>
            </div>
          </Reveal>
        </div>
      </div>
    </Frame>
  );
}
