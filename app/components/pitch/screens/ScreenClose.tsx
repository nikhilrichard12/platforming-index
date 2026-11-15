"use client";

import { CLOSE, PRODUCT, TEAM } from "@/lib/pitch";
import { usd } from "@/lib/voltaraData";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Reveal, Source } from "../parts";

/**
 * Screen 12. What the sample run found, and what comes after it.
 *
 * Both figures are read from the purchase history rather than written here:
 * the gap is the difference between what each shared part was paid and the
 * lowest price already paid for it.
 */
export default function ScreenClose({ bundle, step }: ScreenProps) {
  const s = bundle.data.summary;
  const products = bundle.products ?? 6;

  return (
    <Frame title={CLOSE.title}>
      <div className="flex h-full flex-col">
        <p className="max-w-[1080px] text-[34px] font-light leading-[1.2] text-text">
          In a {products}-product sample it found {usd(s.yearlyPriceGapUsd)} a
          year on {usd(s.yearlySpendUsd)} of spend.
        </p>
        <div className="mt-3">
          <Source>
            Purchase history, data/derived/voltara_parts.json. Sample data.
          </Source>
        </div>

        <p className="mt-10 max-w-[1080px] text-[26px] font-light leading-snug text-text-2">
          {CLOSE.next}
        </p>

        <Reveal show={step >= 1} className="mt-auto">
          <span aria-hidden className="block h-[3px] w-[180px] bg-accent" />
          <p className="mt-6 text-[26px] font-light leading-none text-text">
            {TEAM.members.join(" and ")}
          </p>
          <p className="mt-3 text-[19px] font-light leading-none text-text-2">
            {TEAM.name} · {PRODUCT}
          </p>
        </Reveal>
      </div>
    </Frame>
  );
}
