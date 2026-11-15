"use client";

import { Fragment } from "react";
import StepStrip, {
  IconIndex,
  IconLoop,
  IconView,
  Step,
} from "@/components/ui/StepStrip";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Reveal, Source } from "../parts";

const STEPS: Step[] = [
  {
    title: "Ballpark",
    body: "Eight questions, two minutes, no data needed. It gets the C-suite in the door.",
    icon: <IconIndex />,
  },
  {
    title: "Measured",
    body: "The parts list and the purchase history, read and scored. It shows where the money sits.",
    icon: <IconView />,
  },
  {
    title: "Sustained",
    body: "A check at the moment a part gets chosen, so the gain does not leak back.",
    icon: <IconLoop />,
  },
];

/** Who inside the client is actually using that step. */
const WHO = [
  "The client's leadership",
  "The Kearney team with the client",
  "The client's engineers",
];

/**
 * Screen 3. The three steps are the survey overview's StepStrip, unchanged.
 *
 * They arrive left to right under a scrim anchored to the right edge: the
 * strip is laid out in full from the first paint, so nothing reflows as each
 * step appears, and the end state is the whole strip. The caption row below
 * mirrors the strip's own flex structure (three flex-1 columns separated by
 * the 56px arrow slot) so the two rows stay in step at any width.
 */
export default function ScreenAnswer({ step }: ScreenProps) {
  const shown = Math.min(step + 1, STEPS.length);

  return (
    <Frame
      kicker="What we built"
      title="Platforming Index, a fourth accelerator."
    >
      <div className="relative">
        <StepStrip steps={STEPS} />

        <div className="mt-7 flex gap-4">
          {STEPS.map((s, i) => (
            <Fragment key={s.title}>
              {i > 0 ? <div className="hidden w-14 shrink-0 md:block" /> : null}
              <div className="flex-1">
                <Source>{WHO[i]}</Source>
              </div>
            </Fragment>
          ))}
        </div>

        {/* The wipe. Its edges land in the arrow gaps at every width. */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 bg-surface transition-[width] duration-500 ease-out"
          style={{
            // The extra 36px swallows the arrow the cut would otherwise halve.
            width:
              shown >= STEPS.length
                ? 0
                : `calc(${((STEPS.length - shown) / STEPS.length) * 100}% + 36px)`,
          }}
          aria-hidden="true"
        />
      </div>

      <Reveal show={shown >= STEPS.length} delay={200}>
        <p className="mt-12 text-[19px] leading-snug text-text-2">
          Each step pays for the next one. That is Kearney&rsquo;s own path:
          cost-out on current products first, then consolidate duplicate parts
          and variants, then platforms and modules.
        </p>
        <div className="mt-3">
          <Source>Kearney PERLab, docs/CONTEXT.md line 10</Source>
        </div>
      </Reveal>
    </Frame>
  );
}
