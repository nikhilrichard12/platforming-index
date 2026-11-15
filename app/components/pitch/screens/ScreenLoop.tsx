"use client";

import { LOOP } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { Frame } from "../parts";

/**
 * Screen 10. The three steps, closed into a circle.
 *
 * Three segments travel on arrival. The fourth, from the recorded decisions
 * back to the ballpark, is the whole point of the screen and waits for the
 * advance: it is drawn thicker and in the accent, and when it lands the two
 * nodes it improves grow a little and say what they gained.
 *
 * The two index figures under the circle are not written here. lib/index.ts
 * computes both from the same parts list, the second after the two
 * alignment decisions have been applied to the survey.
 */

const CX = 560;
const CY = 250;
const R = 182;
/** Clockwise from the top: ballpark, measured, plugin, decisions. */
const ANGLE = [-90, 0, 90, 180];
const SEG = (R * Math.PI) / 2;

const point = (deg: number) => ({
  x: CX + R * Math.cos((deg * Math.PI) / 180),
  y: CY + R * Math.sin((deg * Math.PI) / 180),
});

/** The arc from one node to the next, clockwise. */
function arc(from: number, to: number) {
  const a = point(ANGLE[from]);
  const b = point(ANGLE[to]);
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${R} ${R} 0 0 1 ${b.x.toFixed(
    1
  )} ${b.y.toFixed(1)}`;
}

export default function ScreenLoop({ bundle, step, printing }: ScreenProps) {
  const closed = step >= 1 || printing;
  const before = bundle.before.score;
  const after = bundle.after.score;

  return (
    <Frame>
      <div className="flex h-full flex-col items-center justify-center">
        <div className="relative">
          <svg width="1120" height="546" viewBox="0 0 1120 546" aria-hidden>
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="#2F3234"
              strokeWidth={1.2}
            />

            {/* The three segments that travel on arrival. */}
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                d={arc(i, i + 1)}
                fill="none"
                stroke="#8E979B"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeDasharray={SEG}
                style={
                  printing
                    ? { strokeDashoffset: 0 }
                    : {
                        strokeDashoffset: SEG,
                        animation: `pitch-draw-seg 360ms ${i * 320}ms forwards`,
                      }
                }
              />
            ))}

            {/* The closing segment: thicker, accent, and the point. */}
            <path
              d={arc(3, 0)}
              fill="none"
              stroke="#EC5E31"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={SEG}
              style={
                closed
                  ? printing
                    ? { strokeDashoffset: 0 }
                    : { strokeDashoffset: SEG, animation: "pitch-draw-seg 700ms forwards" }
                  : { strokeDashoffset: SEG }
              }
            />

            {LOOP.nodes.map((node, i) => {
              const p = point(ANGLE[i]);
              const grows = closed && (i === 1 || i === 2);
              const anchor = ANGLE[i] === 0 ? "start" : ANGLE[i] === 180 ? "end" : "middle";
              const dx = ANGLE[i] === 0 ? 30 : ANGLE[i] === 180 ? -30 : 0;
              const dy = ANGLE[i] === 90 ? 44 : ANGLE[i] === -90 ? -40 : -6;
              return (
                <g key={node.name}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={grows ? 17 : 12}
                    fill="#16171A"
                    stroke="#EC5E31"
                    strokeWidth={grows ? 3 : 2}
                    style={{ transition: "r 400ms ease, stroke-width 400ms ease" }}
                  />
                  <text
                    x={p.x + dx}
                    y={p.y + dy}
                    textAnchor={anchor}
                    fontSize={19}
                    fill="#FFFFFF"
                  >
                    {node.name}
                  </text>
                  <text
                    x={p.x + dx}
                    y={p.y + dy + 22}
                    textAnchor={anchor}
                    fontSize={14}
                    fill="#B8BBBE"
                  >
                    {node.line}
                  </text>
                  {/* What the closing segment gave this node. */}
                  {(i === 1 || i === 2) && (
                    <text
                      x={p.x + (i === 1 ? 30 : 0)}
                      y={p.y + (i === 1 ? -30 : 92)}
                      textAnchor={i === 1 ? "start" : "middle"}
                      fontSize={14}
                      fill="#EC5E31"
                      style={{
                        opacity: closed ? 1 : 0,
                        transition: "opacity 400ms ease 500ms",
                      }}
                    >
                      {i === 1 ? LOOP.gains.measured : LOOP.gains.plugin}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* The sentence the circle is making, inside it. */}
          <div
            className="pointer-events-none absolute flex w-[300px] justify-center text-center transition-opacity duration-500"
            style={{
              left: CX - 150,
              top: CY - 44,
              opacity: closed ? 1 : 0,
            }}
          >
            <p className="text-[24px] font-light leading-snug text-text">
              {LOOP.center}
            </p>
          </div>
        </div>

        <p
          className="mt-4 text-[19px] font-light leading-none text-accent transition-opacity duration-500"
          style={{ opacity: closed ? 1 : 0 }}
        >
          {LOOP.decisionsLead} {before} to {after}, {LOOP.decisionsTail}
        </p>
      </div>
    </Frame>
  );
}
