"use client";

import { STEP_THREE } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Reveal } from "../parts";

/**
 * Screen 9. The third step, and the only one that keeps running after the
 * engagement ends. The diagram is the sentence drawn: a decision goes in,
 * the data it is read from gets larger, the next decision is answered better.
 */
export default function ScreenStepThree({ step }: ScreenProps) {
  return (
    <Frame title={STEP_THREE.title}>
      <div className="flex h-full flex-col">
        <p className="max-w-[1000px] shrink-0 text-[19px] leading-snug text-text-2">
          {STEP_THREE.body}
        </p>

        <Reveal show={step >= 1} className="my-auto">
          <div className="flex items-center justify-center gap-6">
            {[
              "An engineer picks a part",
              "The plugin answers from the data",
              "The decision goes back in",
              "The next answer is better",
            ].map((label, i) => (
              <div key={label} className="flex items-center gap-6">
                {i > 0 && (
                  <svg width="42" height="12" viewBox="0 0 42 12" aria-hidden>
                    <path
                      d="M0 6 H34 M28 1 L34 6 L28 11"
                      fill="none"
                      stroke="#6A7275"
                      strokeWidth="1.3"
                    />
                  </svg>
                )}
                <div
                  className="flex h-[132px] w-[196px] items-end p-4"
                  style={{
                    background: i === 2 ? "rgba(124,34,221,0.18)" : "#1B1C20",
                    border: `1px solid ${i === 2 ? "#7C22DD" : "#2F3234"}`,
                  }}
                >
                  <p className="text-[16px] leading-snug text-text">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </Frame>
  );
}
