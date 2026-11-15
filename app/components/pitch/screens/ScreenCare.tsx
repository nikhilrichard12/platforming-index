"use client";

import Badge from "@/components/ui/Badge";
import OrbitView from "@/components/dashboard/OrbitView";
import { FUNCTION_PATHS } from "@/components/ui/FunctionIcons";
import { ALIGNMENT, RingResult } from "@/lib/alignment";
import { CARE, CLIPS, THREE_STEPS } from "@/lib/pitch";
import { FUNCTIONS, FUNCTION_IDENTITY } from "@/lib/roles";
import { PRODUCT_MASTER } from "@/lib/voltaraData";
import type { ScreenProps } from "../PitchDeck";
import Clip from "../Clip";
import { Frame, Reveal, Source } from "../parts";

/** Everyone starts on the outer ring, as far from the group as the view goes. */
const PARKED: Record<string, RingResult> = Object.fromEntries(
  FUNCTIONS.map((f) => [f, { ring: 3, apart: [] }])
);

/**
 * Screen 5. How a client is brought to care, in six beats.
 *
 *   0  what the sample company is
 *   1  the three steps, and where the questions came from
 *   2  the survey becoming the dashboard, recorded
 *   3  the orbit, everyone parked on the outer ring
 *   4  they settle onto the ring their own answers put them on
 *   5  two decisions are recorded, they pull in, and the centre counts
 *
 * Both scores are computed by lib/index.ts on the server, the second from the
 * same survey with the two decisions applied. Nothing here types a score in,
 * which is the argument the screen is making: the parts list is identical on
 * either side of the advance.
 */
export default function ScreenCare({ bundle, step, active, printing }: ScreenProps) {
  const clip = step === 2;
  const orbit = step >= 3;
  const decided = step >= 5;

  const rings =
    step <= 3 ? PARKED : step === 4 ? bundle.ringsBefore : bundle.ringsAfter;
  const score = decided ? bundle.after.score : bundle.before.score;
  const s = bundle.data.summary;
  const products = bundle.products ?? PRODUCT_MASTER.length;

  const decisions = [
    { action: ALIGNMENT.ownership.action, choice: bundle.ownerChoice },
    { action: ALIGNMENT.measured.action, choice: bundle.targetChoice },
  ];

  return (
    <Frame>
      <div className="relative h-full">
        {/* Beats 1 and 2: what the company is, and the three steps. */}
        <Layer show={!orbit && !clip}>
          <h1 className="shrink-0 text-[42px] font-light leading-[1.12] text-text">
            {CARE.title}
          </h1>

          <p className="mt-10 max-w-[1050px] shrink-0 text-[26px] font-light leading-snug text-text-2">
            {CARE.sampleLead} {products} power products,{" "}
            {s.partNumbers.toLocaleString("en-US")} part numbers,{" "}
            {CARE.sampleTail}
          </p>
          <div className="mt-2 shrink-0">
            <Source>
              Parts list and purchase history, data/derived/voltara_parts.json
            </Source>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-8 pb-2">
            {THREE_STEPS.map((t, i) => (
              <Reveal key={t.name} show={step >= 1} delay={i * 110}>
                <div className="h-px w-full bg-line-2" />
                <p className="mt-4 text-[30px] font-light leading-none text-text">
                  {t.name}
                </p>
                <p className="mt-3 text-[19px] leading-snug text-text-2">
                  {t.line}
                </p>
                <p className="mt-2 text-[17px] leading-snug text-text-2">
                  {t.who}
                </p>
                {t.note && (
                  <p className="mt-4 text-[14px] leading-snug text-text-3">
                    {t.note}
                  </p>
                )}
              </Reveal>
            ))}
          </div>
        </Layer>

        {/* Beat 3: the survey becoming the dashboard. */}
        <Layer show={clip}>
          <h1 className="shrink-0 text-[34px] font-light leading-none text-text">
            {THREE_STEPS[1].name}. {THREE_STEPS[1].who}
          </h1>
          <div className="mt-6 min-h-0 flex-1">
            <Clip
              src={CLIPS.dashboard.src}
              label={CLIPS.dashboard.label}
              play={active && clip && !printing}
              loop
            />
          </div>
        </Layer>

        {/* Beats 4 to 6: the same score, said five ways. */}
        <Layer show={orbit}>
          <div className="flex min-h-0 flex-1 items-center gap-10">
            <div className="w-[700px] shrink-0">
              <OrbitView
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
                Each function sits on the ring that counts how many open
                questions it answers differently from everyone else.
              </p>

              <Reveal show={decided} className="mt-6">
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

                <p className="mt-6 text-[34px] font-light leading-none text-text">
                  No part changed.
                </p>
                <p className="mt-3 text-[15px] leading-snug text-text-2">
                  {bundle.before.score} to {bundle.after.score}, from the same{" "}
                  {s.partNumbers} part numbers.
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

          {/* The same score, in each function's own unit. */}
          <div className="mt-6 flex shrink-0 gap-4 border-t border-line pt-4">
            {FUNCTIONS.map((f) => {
              const id = FUNCTION_IDENTITY[f];
              const fig = id.figure(bundle.data, score);
              return (
                <div key={f} className="flex-1">
                  <p className="flex items-center gap-2 text-[14px] font-semibold leading-none text-text">
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#B8BBBE"
                      strokeWidth={1.5}
                      aria-hidden
                    >
                      {FUNCTION_PATHS[f]}
                    </svg>
                    {f}
                  </p>
                  <p className="mt-2 text-[24px] font-light leading-none text-text">
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
        </Layer>
      </div>
    </Frame>
  );
}

/** One of the three states this screen crossfades between. */
function Layer({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 flex flex-col transition-opacity duration-[250ms] ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!show}
    >
      {children}
    </div>
  );
}
