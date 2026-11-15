"use client";

import { PrimaryButton } from "@/components/ui/Button";
import { SCREENS } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Source } from "../parts";

const BEATS = [
  {
    name: "Ballpark",
    body: "Eight questions about your own company. A score, a range, and the arithmetic with your numbers in it.",
  },
  {
    name: "Measured dashboard",
    body: "The same four dimensions, computed from the parts list and the purchase history. One assistant, a different brief for each role.",
  },
  {
    name: "Panel on a product page",
    body: "A page in the customer's own system. The engineer types a need, the panel finds the part already in stock, and a part number never gets created.",
  },
];

/**
 * Screen 4. The deck stops here and the product takes over, so the screen
 * carries only the running order. The script lives in the presenter notes.
 */
export default function ScreenDemo({ bundle }: ScreenProps) {
  const s = bundle.data.summary;
  const seconds = SCREENS[3].targetSeconds;

  return (
    <Frame kicker="Demo" title="Live.">
      <div className="flex h-full flex-col">
        <ol className="flex-1 border-t border-line">
          {BEATS.map((b, i) => (
            <li
              key={b.name}
              className="flex gap-8 border-b border-line py-7"
            >
              <span className="w-10 shrink-0 text-[26px] font-light leading-none tabular-nums text-text-3">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h2 className="text-[26px] font-light leading-none text-text">
                  {b.name}
                </h2>
                <p className="mt-3 max-w-[820px] text-[17px] leading-snug text-text-2">
                  {b.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex shrink-0 items-center justify-between">
          <Source>
            Running on sample data from {s.partNumbers} part numbers
            {bundle.purchaseOrders
              ? ` and ${bundle.purchaseOrders.toLocaleString("en-US")} purchase orders`
              : ""}
            . {seconds} seconds.
          </Source>
          <PrimaryButton onClick={() => window.open("/", "_blank")}>
            Open the product
          </PrimaryButton>
        </div>
      </div>
    </Frame>
  );
}
