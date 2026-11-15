"use client";

import { LOOP } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { Frame } from "../parts";

/**
 * Screen 10. The three steps, closed into a circle.
 *
 * Four nodes light in turn and the arc travels between them, arriving back
 * where it started. The whole run is under a second and a half, so the
 * presenter says one sentence over it rather than waiting for it.
 */

const R = 176;
const CX = 540;
const CY = 236;

/** Clockwise from the top. */
const ANGLE = [-90, 0, 90, 180];

const point = (deg: number) => ({
  x: CX + R * Math.cos((deg * Math.PI) / 180),
  y: CY + R * Math.sin((deg * Math.PI) / 180),
});

export default function ScreenLoop({ step, printing }: ScreenProps) {
  return (
    <Frame>
      <div className="relative flex h-full items-center justify-center">
        <svg
          width="1080"
          height="472"
          viewBox="0 0 1080 472"
          role="img"
          aria-label={LOOP.nodes.join(", then ")}
        >
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="#2F3234"
            strokeWidth={1.4}
          />
          {/* The arc that travels the circle once, on arrival. */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="#EC5E31"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * R}
            strokeDashoffset={printing ? 0 : undefined}
            className={printing ? undefined : "pitch-loop-arc"}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
          {ANGLE.map((deg, i) => {
            const p = point(deg);
            const anchor = deg === 0 ? "start" : deg === 180 ? "end" : "middle";
            const dx = deg === 0 ? 24 : deg === 180 ? -24 : 0;
            const dy = deg === 90 ? 36 : deg === -90 ? -26 : 5;
            return (
              <g key={LOOP.nodes[i]}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={13}
                  fill="#16171A"
                  stroke="#EC5E31"
                  strokeWidth={2}
                  style={{
                    opacity: printing ? 1 : undefined,
                    animation: printing
                      ? undefined
                      : `pitch-node-light 400ms ${i * 300}ms both`,
                  }}
                />
                <text
                  x={p.x + dx}
                  y={p.y + dy}
                  textAnchor={anchor}
                  fontSize={16}
                  fill="#FFFFFF"
                >
                  {LOOP.nodes[i]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* The sentence the circle is making, inside it. */}
        <div
          className="pointer-events-none absolute flex w-[260px] justify-center text-center transition-opacity duration-500"
          style={{ opacity: step >= 1 ? 1 : 0 }}
        >
          <p className="text-[30px] font-light leading-snug text-text">
            {LOOP.center}
          </p>
        </div>
      </div>
    </Frame>
  );
}
