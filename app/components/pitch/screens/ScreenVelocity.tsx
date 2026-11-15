"use client";

import Image from "next/image";
import { VELOCITY } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { Frame } from "../parts";

/**
 * Screen 11. Three things the research tool did, one per advance.
 *
 * The picture for the beat holds the right of the stage; the one before it
 * slides off to the left rather than disappearing, so the presenter can
 * point back at it. Each shot is a copy of a screenshot in docs/velocity,
 * named in lib/pitch.ts by the file it came from.
 */
export default function ScreenVelocity({ step }: ScreenProps) {
  return (
    <Frame title={VELOCITY.title}>
      <div className="flex h-full gap-10">
        <div className="flex w-[340px] shrink-0 flex-col justify-center gap-7">
          {VELOCITY.items.map((item, i) => (
            <p
              key={item.image}
              className="text-[16px] leading-snug transition-opacity duration-300"
              style={{
                color: i === step ? "#FFFFFF" : "#818182",
                opacity: i <= step ? 1 : 0.25,
              }}
            >
              {item.line}
            </p>
          ))}
        </div>

        {/* The pictures, the current one in place and the rest to its left. */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {VELOCITY.items.map((item, i) => (
            <div
              key={item.image}
              className="absolute inset-y-0 left-0 flex w-full items-center transition-all duration-500 ease-out"
              style={{
                transform: `translateX(${(i - step) * 112}%)`,
                opacity: i === step ? 1 : 0,
              }}
              aria-hidden={i !== step}
            >
              <Image
                src={item.image}
                alt={item.alt}
                width={1280}
                height={720}
                className="max-h-full w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}
