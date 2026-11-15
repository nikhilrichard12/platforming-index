"use client";

import { KEARNEY } from "@/lib/pitch";
import { usd } from "@/lib/voltaraData";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Reveal, Source } from "../parts";

/**
 * Screen 8. Why this is Kearney's to sell.
 *
 *   1. What the free step is actually for.
 *   2. The three stages, with no price on any of them.
 *   3. The one figure the client cares about, computed from the sample's own
 *      purchase history rather than from anything we chose.
 */
export default function ScreenModel({ bundle, step }: ScreenProps) {
  const s = bundle.data.summary;
  const products = bundle.products ?? 6;

  return (
    <Frame title={KEARNEY.title}>
      <div className="flex h-full flex-col">
        <p className="max-w-[1080px] shrink-0 text-[26px] font-light leading-snug text-text-2">
          {KEARNEY.lead}
        </p>

        {/* The three stages, each one narrower than the last. */}
        <div className="my-auto shrink-0 space-y-4">
          {KEARNEY.stages.map((stage, i) => (
            <Reveal key={stage.name} show={step >= 1} delay={i * 110}>
              <div
                className="flex items-baseline justify-between gap-8 bg-panel px-6 py-5"
                style={{
                  width: `${100 - i * 22}%`,
                  borderLeft: `2px solid ${["#EC5E31", "#EC5E31b0", "#EC5E3170"][i]}`,
                }}
              >
                <p className="text-[30px] font-light leading-none text-text">
                  {stage.name}
                </p>
                <p className="text-[19px] leading-none text-text-2">
                  {stage.what}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal show={step >= 2} className="shrink-0">
          <p className="max-w-[1100px] text-[34px] font-light leading-[1.2] text-text">
            {usd(s.yearlyPriceGapUsd)} a year on {usd(s.yearlySpendUsd)} of
            spend, in a {products}-product sample.
          </p>
          <div className="mt-3">
            <Source>
              Purchase history, data/derived/voltara_parts.json. The gap is the
              difference between what each shared part was paid and the lowest
              price already paid for it.
            </Source>
          </div>
        </Reveal>
      </div>
    </Frame>
  );
}
