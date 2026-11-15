"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import { TIMELINE } from "@/lib/pitch";
import { TOKEN } from "@/lib/anim";
import type { ScreenProps } from "../PitchDeck";
import { DrawPath, Frame, Reveal, Source } from "../parts";

const RULE_W = 1184;

/**
 * Screen 8. The timeline draws itself left to right on arrival, so the
 * screen holds one advance and the whole thing is its end state.
 *
 * The Velocity band is a stand-in on purpose. What Velocity AI Studio
 * contributed at each turn is not written down anywhere in this repository,
 * and the rule for this deck is that nothing on screen is invented, so the
 * band shows four empty slots and says what belongs in them rather than
 * filling them with a sentence nobody can check.
 */
export default function ScreenProcess({ printing }: ScreenProps) {
  // A print has no time to wait for an entrance, so it starts arrived.
  const [entered, setEntered] = useState(printing);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const n = TIMELINE.length;
  const slot = RULE_W / n;

  return (
    <Frame kicker="Process" title="How we got here.">
      <svg
        viewBox={`0 0 ${RULE_W} 26`}
        className="h-[26px] w-full"
        role="img"
        aria-label="Friday, two mentor conversations, Saturday"
      >
        <DrawPath
          d={`M0 13 H${RULE_W}`}
          play
          duration={900}
          stroke={TOKEN.line2}
        />
        {TIMELINE.map((b, i) => (
          <circle
            key={b.when}
            cx={slot * i + slot / 2}
            cy={13}
            r={5}
            fill={TOKEN.accent}
            style={{
              opacity: entered ? 1 : 0,
              transition: "opacity 400ms ease",
              transitionDelay: `${300 + i * 180}ms`,
            }}
          />
        ))}
      </svg>

      <div className="mt-7 grid grid-cols-4 gap-8">
        {TIMELINE.map((b, i) => (
          <Reveal key={b.when} show={entered} delay={400 + i * 180}>
            <p className="text-[13px] leading-none text-text-3">{b.when}</p>
            <h2 className="mt-3 text-[20px] font-extrabold leading-tight text-text">
              {b.title}
            </h2>
            <p className="mt-3 text-[15px] leading-snug text-text-2">{b.body}</p>
            <div className="mt-3">
              <Source>{b.source}</Source>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal show={entered} delay={1100} className="mt-8 border-t border-line pt-5">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[15px] font-semibold text-text">
            What Velocity AI Studio contributed at each point
          </h3>
          <Badge tone="warn">Stand-in</Badge>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-8">
          {TIMELINE.map((b) => (
            <div
              key={b.when}
              className="border border-dashed border-line-2 px-4 py-3"
            >
              <p className="text-[13px] leading-none text-text-3">{b.when}</p>
              <p className="mt-2 text-[14px] text-text-2">To fill in</p>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Source>
            Not recorded in docs/CONTEXT.md. Research on why platforming fails
            to stick, the competitor scan and the dimension design go here, from
            the Velocity session history.
          </Source>
        </div>
      </Reveal>
    </Frame>
  );
}
