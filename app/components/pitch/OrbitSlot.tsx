"use client";

import { useEffect, useRef } from "react";
import { animate, utils } from "animejs";
import useReducedMotion from "@/components/ui/useReducedMotion";
import { TOKEN } from "@/lib/anim";
import { RING_LABELS, RingResult } from "@/lib/alignment";
import { FUNCTIONS } from "@/lib/roles";
import { FunctionName } from "@/lib/survey";

/**
 * STAND-IN FOR THE REAL ORBIT. Swap it after merge.
 *
 * The dashboard's orbit (components/dashboard/OrbitView.tsx) is being built
 * on another branch. This draws the same picture flat and still: a disc with
 * the index in it, four rings, and one labelled dot per function on the ring
 * that counts how many open questions it sits apart from the group. No tilt,
 * no drift, no flight path.
 *
 * The swap is one import in screens/ScreenOrbit.tsx:
 *
 *     import OrbitView from "@/components/dashboard/OrbitView";
 *
 * The props below are OrbitView's props, same names and same shapes, so
 * nothing else on the screen has to change. The two advances on screen 6 are
 * carried entirely by `rings` and `score`, which is why they are props rather
 * than state in here: the real orbit replays its own flight whenever the
 * rings change, and this stand-in slides the dots instead.
 */

const W = 580;
const H = 420;
const CX = 250;
const CY = 210;
/** The innermost ring clears the disc and the dot that rides on it. */
const R0 = 82;
const RING_GAP = 52;
const SQUASH = 0.52;
const RINGS = 4;
const DISC = 46;
const DOT = 13;

const radius = (ring: number) => R0 + ring * RING_GAP;

/** Each function keeps its own lane, so two of them never stack up. */
const angleOf = (i: number) => (-Math.PI * 2 * i) / FUNCTIONS.length - 0.6;

function pointOn(ring: number, i: number) {
  const r = radius(ring);
  const a = angleOf(i);
  return {
    x: CX + r * Math.cos(a),
    y: CY + r * SQUASH * Math.sin(a),
    // A dot on the left half hangs its label to the left, so a name never
    // runs back across the disc.
    left: Math.cos(a) < 0,
  };
}

export default function OrbitSlot({
  score,
  rings,
  you,
  selected,
  highlight,
  onSelect,
}: {
  score: number;
  rings: Record<string, RingResult>;
  you: FunctionName | null;
  selected: FunctionName | null;
  /** Functions to pick out, from a row on the table below. */
  highlight: FunctionName[] | null;
  onSelect: (f: FunctionName) => void;
}) {
  const reduced = useReducedMotion();
  const scoreRef = useRef<SVGTextElement>(null);
  const shown = useRef(score);

  // The centre counts to wherever the decisions left it, as the real orbit does.
  useEffect(() => {
    const el = scoreRef.current;
    if (!el) return;
    if (reduced || shown.current === score) {
      el.textContent = String(score);
      shown.current = score;
      return;
    }
    const counter = { v: shown.current };
    shown.current = score;
    const a = animate(counter, {
      v: score,
      duration: 900,
      ease: "outQuad",
      modifier: utils.round(0),
      onUpdate: () => {
        el.textContent = String(Math.round(counter.v));
      },
    });
    return () => {
      a.cancel();
    };
  }, [score, reduced]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="How far each function sits from the group"
    >
      {Array.from({ length: RINGS }, (_, n) => (
        <g key={n}>
          <ellipse
            cx={CX}
            cy={CY}
            rx={radius(n)}
            ry={radius(n) * SQUASH}
            fill="none"
            stroke={TOKEN.accent}
            strokeWidth={1.2}
            strokeOpacity={0.6 - n * 0.13}
          />
          <text
            x={CX + radius(n) + 10}
            y={CY - 6}
            fontSize={11}
            fill={TOKEN.text3}
            stroke={TOKEN.surface}
            strokeWidth={3}
            paintOrder="stroke"
          >
            {RING_LABELS[n]}
          </text>
        </g>
      ))}

      <circle cx={CX} cy={CY} r={DISC} fill={TOKEN.accent} />
      <text
        ref={scoreRef}
        x={CX}
        y={CY + 11}
        textAnchor="middle"
        fontSize={32}
        fontWeight={300}
        fill="#1E1E1E"
      >
        {score}
      </text>
      {/* Below the outer ring, where no dot can land on it. */}
      <text
        x={CX}
        y={H - 36}
        textAnchor="middle"
        fontSize={12}
        fill={TOKEN.text3}
      >
        Platforming Index
      </text>

      {FUNCTIONS.map((f, i) => {
        const ring = Math.min(RINGS - 1, rings[f]?.ring ?? RINGS - 1);
        const p = pointOn(ring, i);
        const isYou = f === you;
        const isOn = selected === f;
        const dim = highlight && !highlight.includes(f) ? 0.28 : 1;
        return (
          <g
            key={f}
            className="cursor-pointer"
            opacity={dim}
            onClick={() => onSelect(f)}
            style={{
              transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`,
              transition: "transform 900ms cubic-bezier(.4,0,.2,1)",
            }}
          >
            <circle
              r={DOT}
              fill={TOKEN.surface}
              stroke={isYou || isOn ? TOKEN.text : TOKEN.line2}
              strokeWidth={isOn ? 2 : 1.4}
            />
            <UnitMark />
            <text
              x={p.left ? -(DOT + 7) : DOT + 7}
              y={4}
              textAnchor={p.left ? "end" : "start"}
              fontSize={12}
              fill={isOn ? TOKEN.text : TOKEN.text2}
              stroke={TOKEN.surface}
              strokeWidth={3}
              paintOrder="stroke"
            >
              {f}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * STAND-IN FOR THE PER-FUNCTION ICON, for the same reason and with the same
 * swap: components/ui/FunctionIcons.tsx draws a target, a dollar, a gear,
 * three linked nodes and a clock on a 24 grid. Until that lands, every
 * function carries the same neutral mark, so nothing on screen claims a
 * distinction the deck cannot yet draw.
 */
export function UnitMark({ size = 9 }: { size?: number }) {
  return (
    <circle
      r={size / 2}
      fill="none"
      stroke={TOKEN.text2}
      strokeWidth={1.5}
    />
  );
}
