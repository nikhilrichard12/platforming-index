"use client";

import { BUSINESS, PROBLEM, TEAM } from "@/lib/pitch";
import { usd } from "@/lib/voltaraData";
import type { ScreenProps } from "../PitchDeck";
import { CountTo, Frame, Reveal } from "../parts";

/**
 * Screen 12. The two problems the deck opened with, answered.
 *
 * The two headings come back in the positions they held on screen 2, small,
 * and each one turns into the opportunity it is. Both figures under the left
 * column are computed from the purchase history, and the chart on the right
 * is the same chart screen 2 draws, at a quarter of the size.
 */
export default function ScreenBusiness({ bundle, step }: ScreenProps) {
  const s = bundle.data.summary;
  const products = bundle.products ?? 6;
  const share = Math.round((s.yearlyPriceGapUsd / s.yearlySpendUsd) * 100);
  const top = Math.max(...PROBLEM.bars.map((b) => b.value));

  return (
    <Frame title={BUSINESS.title}>
      <div className="flex h-full flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-[440px_1fr] gap-16 pt-4">
          {/* Left: the effort becomes sustained work. */}
          <div className="flex flex-col">
            <Turn was={BUSINESS.left.was} now={BUSINESS.left.now} show={step >= 1} />
            <Reveal show={step >= 1} className="mt-5">
              <p className="text-[16px] leading-snug text-text-2">
                {BUSINESS.left.body}
              </p>
              <p className="mt-6 flex items-baseline gap-2 font-light leading-none text-text">
                <span className="text-[26px]">$</span>
                <CountTo
                  value={s.yearlyPriceGapUsd / 1_000_000}
                  show={step >= 1}
                  format={(n) => n.toFixed(2)}
                  className="text-[64px] tabular-nums leading-none"
                />
                <span className="text-[26px]">M</span>
                <span className="text-[18px] text-text-2">a year</span>
              </p>
              <p className="mt-3 text-[15px] leading-snug text-text-2">
                found on {usd(s.yearlySpendUsd)} of parts spend in a{" "}
                {products}-product sample, about {share} percent.
              </p>
            </Reveal>
          </div>

          {/* Right: the companies that do not see it become the opening. */}
          <div className="flex flex-col">
            <Turn was={BUSINESS.right.was} now={BUSINESS.right.now} show={step >= 2} />
            <Reveal show={step >= 2} className="mt-5">
              <p className="max-w-[620px] text-[16px] leading-snug text-text-2">
                {BUSINESS.right.body}
              </p>
              <div className="mt-5 flex items-end gap-6">
                <ul className="w-[300px] shrink-0">
                  {PROBLEM.bars.map((b) => {
                    const picked = b.value < PROBLEM.targetUnder;
                    return (
                      <li key={b.name} className="flex h-[15px] items-center gap-2">
                        <span className="relative h-[8px] min-w-0 flex-1">
                          <span
                            className="absolute inset-y-0 left-0 block"
                            style={{
                              width: `${(b.value / top) * 100}%`,
                              background: picked ? "#EC5E31" : "#7C22DD",
                              opacity: picked ? 1 : 0.5,
                            }}
                          />
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="pb-1 text-[15px] leading-snug text-accent">
                  {BUSINESS.right.chartLabel}
                </p>
              </div>
            </Reveal>
          </div>
        </div>

        {/* The three steps, as the thing a client buys. */}
        <Reveal show={step >= 3} className="mt-5 shrink-0">
          <div className="flex items-center gap-5 border-t border-line pt-5">
            {BUSINESS.steps.map((st, i) => (
              <div key={st.name} className="flex flex-1 items-center gap-5">
                {i > 0 && (
                  <svg width="30" height="10" viewBox="0 0 30 10" aria-hidden>
                    <path
                      d="M0 5 H24 M19 1 L24 5 L19 9"
                      fill="none"
                      stroke="#6A7275"
                      strokeWidth="1.2"
                    />
                  </svg>
                )}
                <p className="min-w-0 flex-1 text-[16px] leading-snug text-text-2">
                  <span className="text-text">{st.name}:</span> {st.what}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal show={step >= 4} className="mt-5 shrink-0">
          <p className="max-w-[1120px] text-[26px] font-light leading-snug text-text">
            {BUSINESS.close}
          </p>
          <p className="mt-3 text-[16px] font-light leading-none text-text-2">
            {TEAM.name}
          </p>
        </Reveal>
      </div>
    </Frame>
  );
}

/** A heading from screen 2 turning into what it is worth. */
function Turn({ was, now, show }: { was: string; now: string; show: boolean }) {
  return (
    <div>
      <p className="text-[14px] leading-none text-text-3">{was}</p>
      <p
        className="mt-3 text-[30px] font-light leading-none transition-opacity duration-500"
        style={{ opacity: show ? 1 : 0, color: "#FFFFFF" }}
      >
        {now}
      </p>
    </div>
  );
}
