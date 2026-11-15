"use client";

import Badge from "@/components/ui/Badge";
import { ALIGNMENT, RingResult } from "@/lib/alignment";
import { FUNCTIONS, FUNCTION_IDENTITY } from "@/lib/roles";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Reveal, Source } from "../parts";
// Swap this one line for the real orbit after merge:
//   import OrbitView from "@/components/dashboard/OrbitView";
import OrbitSlot, { UnitMark } from "../OrbitSlot";

/** Everyone starts on the outer ring, as far from the group as the view goes. */
const PARKED: Record<string, RingResult> = Object.fromEntries(
  FUNCTIONS.map((f) => [f, { ring: 3, apart: [] }])
);

/**
 * Screen 6. Two advances, both carried by props.
 *
 *   0  everyone parked on the outer ring
 *   1  they settle onto the ring their survey answers put them on
 *   2  the two decisions are recorded, they pull in, and the centre counts
 *
 * The second score is not typed in anywhere. lib/index.ts computes it on the
 * server from the same four formulas, reading a survey that has had the two
 * decisions applied to it by applyAlignment. Which is the whole point of the
 * screen: the parts list is identical in both states.
 */
export default function ScreenOrbit({ bundle, step }: ScreenProps) {
  const rings =
    step === 0 ? PARKED : step === 1 ? bundle.ringsBefore : bundle.ringsAfter;
  const score = step < 2 ? bundle.before.score : bundle.after.score;

  const decisions = [
    { action: ALIGNMENT.ownership.action, choice: bundle.ownerChoice },
    { action: ALIGNMENT.measured.action, choice: bundle.targetChoice },
  ];

  return (
    <Frame
      kicker="One number, five readings"
      title="The same score, said five ways."
      footer={
        <div className="flex gap-4 border-t border-line pt-5">
          {FUNCTIONS.map((f) => {
            const id = FUNCTION_IDENTITY[f];
            const fig = id.figure(bundle.data, score);
            return (
              <div key={f} className="flex-1">
                <p className="flex items-center gap-2 text-[14px] font-semibold leading-none text-text">
                  <svg width={12} height={12} viewBox="-6 -6 12 12" aria-hidden>
                    <UnitMark />
                  </svg>
                  {f}
                </p>
                <p className="mt-3 text-[26px] font-light leading-none text-text">
                  {fig.value}
                </p>
                <p className="mt-2 text-[13px] leading-snug text-text-2">
                  {id.unit}
                </p>
                <div className="mt-1">
                  <Source>{fig.source}</Source>
                </div>
              </div>
            );
          })}
        </div>
      }
    >
      <div className="flex h-full items-center gap-10">
        <div className="w-[700px] shrink-0">
          <OrbitSlot
            score={score}
            rings={rings}
            you={null}
            selected={null}
            highlight={null}
            onSelect={() => {}}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-snug text-text-2">
            Each function sits on the ring that counts how many open questions
            it answers differently from everyone else.
          </p>

          <Reveal show={step >= 2} className="mt-7">
            <ul className="space-y-3">
              {decisions.map((d) => (
                <li key={d.action} className="bg-panel p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[15px] font-semibold text-text">
                      {d.action}
                    </p>
                    <Badge tone="positive">Decided</Badge>
                  </div>
                  <p className="mt-2 text-[14px] leading-snug text-text-2">
                    {d.choice}
                  </p>
                </li>
              ))}
            </ul>

            <p className="mt-7 text-[34px] font-light leading-none text-text">
              No part changed.
            </p>
            <p className="mt-3 text-[15px] leading-snug text-text-2">
              {bundle.before.score} to {bundle.after.score}, from the same{" "}
              {bundle.data.summary.partNumbers} part numbers.
            </p>
            <div className="mt-2">
              <Source>
                Computed by lib/index.ts from the parts list and the survey
                after both decisions
              </Source>
            </div>
          </Reveal>
        </div>
      </div>
    </Frame>
  );
}
