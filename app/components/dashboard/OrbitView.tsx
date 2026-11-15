"use client";

import { useCallback, useEffect, useRef } from "react";
import { animate, utils } from "animejs";
import useReducedMotion from "@/components/ui/useReducedMotion";
import { FUNCTION_PATHS } from "@/components/ui/FunctionIcons";
import { TOKEN } from "@/lib/anim";
import { RING_LABELS, RingResult } from "@/lib/alignment";
import { FUNCTIONS } from "@/lib/roles";
import { FunctionName } from "@/lib/survey";

const W = 720;
const H = 430;
const CX = 290;
const CY = 212;
const R0 = 110;
const RING_GAP = 58;
const SQUASH = 0.34;
const TILT = -16;
const RINGS = 4;

const DISC = 44;
const PLANET = 15;

/** Where a ring sits, before the tilt. */
const radius = (ring: number) => R0 + ring * RING_GAP;

const RAD = (TILT * Math.PI) / 180;

/** A point on a tilted ellipse, in user units. */
function pointOn(ring: number, angle: number) {
  const rx = radius(ring);
  const ry = rx * SQUASH;
  const x = rx * Math.cos(angle);
  const y = ry * Math.sin(angle);
  return {
    x: CX + x * Math.cos(RAD) - y * Math.sin(RAD),
    y: CY + x * Math.sin(RAD) + y * Math.cos(RAD),
  };
}

/** Each function keeps its own lane, so they never stack on one another. */
const baseAngle = (i: number) => (-Math.PI * 2 * i) / FUNCTIONS.length - 0.6;

export default function OrbitView({
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
  const svgRef = useRef<SVGSVGElement>(null);
  const scoreRef = useRef<SVGTextElement>(null);
  const drifts = useRef<Record<string, { pause: () => void; play: () => void }>>({});
  /** Every animation currently writing to a planet, so a replay can stop them. */
  const running = useRef<Record<string, { cancel: () => void }[]>>({});
  const angles = useRef<Record<string, number>>({});
  const shownScore = useRef(score);
  /** The rings as data, read inside the animation without restarting it. */
  const ringsRef = useRef(rings);
  ringsRef.current = rings;
  /** Only a real change of position replays the orbit, not every render. */
  const ringKey = FUNCTIONS.map((f) => rings[f]?.ring ?? RINGS - 1).join(",");

  const place = useCallback((f: FunctionName, ring: number, angle: number) => {
    const el = svgRef.current?.querySelector<SVGGElement>(`[data-planet="${f}"]`);
    if (!el) return;
    const p = pointOn(ring, angle);
    el.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
  }, []);

  /** Nothing from an earlier round may keep writing to this planet. */
  const stop = useCallback((f: FunctionName) => {
    (running.current[f] ?? []).forEach((a) => a.cancel());
    running.current[f] = [];
    delete drifts.current[f];
  }, []);

  /** Each planet keeps turning on its own ring until something interrupts. */
  const startDrift = useCallback(
    (f: FunctionName, ring: number) => {
      if (reduced) return;
      const state = { t: 0 };
      const from = angles.current[f] ?? 0;
      const anim = animate(state, {
        t: 1,
        duration: 52000 + FUNCTIONS.indexOf(f) * 4000,
        ease: "linear",
        loop: true,
        onUpdate: () => {
          const angle = from + state.t * Math.PI * 2;
          angles.current[f] = angle;
          place(f, ring, angle);
        },
      });
      drifts.current[f] = anim;
      running.current[f] = [...(running.current[f] ?? []), anim];
    },
    [place, reduced]
  );

  /** Everyone starts on the outer ring and travels in to where they are. */
  const play = useCallback(() => {
    FUNCTIONS.forEach((f, i) => {
      const target = Math.min(RINGS - 1, ringsRef.current[f]?.ring ?? RINGS - 1);
      const angle = angles.current[f] ?? baseAngle(i);
      angles.current[f] = angle;
      stop(f);

      if (reduced) {
        place(f, target, angle);
        return;
      }

      const state = { ring: RINGS - 1, angle };
      place(f, state.ring, angle);
      const entry = animate(state, {
        ring: target,
        angle: angle + 0.45,
        duration: 1200,
        delay: i * 90,
        ease: "inOutQuad",
        onUpdate: () => {
          angles.current[f] = state.angle;
          place(f, state.ring, state.angle);
        },
        onComplete: () => startDrift(f, target),
      });
      running.current[f] = [...(running.current[f] ?? []), entry];
    });

    // The score in the middle counts to wherever the decisions left it.
    const el = scoreRef.current;
    if (el) {
      if (reduced || shownScore.current === score) {
        el.textContent = String(score);
      } else {
        const from = shownScore.current;
        const counter = { v: from };
        animate(counter, {
          v: score,
          duration: 900,
          ease: "outQuad",
          modifier: utils.round(0),
          onUpdate: () => {
            el.textContent = String(Math.round(counter.v));
          },
        });
      }
      shownScore.current = score;
    }
    // ringKey is the signal: the positions live in a ref so a re-render with
    // the same rings does not restart the orbit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringKey, score, place, startDrift, stop, reduced]);

  // Replays whenever the rings change, which is what a decision does.
  useEffect(() => {
    play();
    const live = running.current;
    return () => {
      Object.values(live).forEach((list) => list.forEach((a) => a.cancel()));
    };
  }, [play]);

  const dim = (f: FunctionName) =>
    highlight && !highlight.includes(f) ? 0.28 : 1;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="How far each function sits from the group"
    >
      {/* Rings, fading outward */}
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
            transform={`rotate(${TILT} ${CX} ${CY})`}
          />
          {/* A knockout halo keeps the label readable when a planet drifts past */}
          <text
            x={pointOn(n, 0).x + 10}
            y={pointOn(n, 0).y + 4}
            fill={TOKEN.text3}
            fontSize={11}
            stroke={TOKEN.panel}
            strokeWidth={3}
            paintOrder="stroke"
          >
            {RING_LABELS[n]}
          </text>
        </g>
      ))}

      {/* The score itself */}
      <circle cx={CX} cy={CY} r={DISC} fill={TOKEN.accent} />
      <text
        ref={scoreRef}
        x={CX}
        y={CY + 10}
        textAnchor="middle"
        fontSize={30}
        fontWeight={300}
        fill="#1E1E1E"
      >
        {score}
      </text>
      <text
        x={CX}
        y={CY + DISC + 20}
        textAnchor="middle"
        fontSize={12}
        fill={TOKEN.text3}
      >
        Platforming Index
      </text>

      {/* One planet per function */}
      {FUNCTIONS.map((f) => {
        const isYou = f === you;
        const isOn = selected === f;
        return (
          <g
            key={f}
            data-planet={f}
            className="cursor-pointer"
            opacity={dim(f)}
            onClick={() => onSelect(f)}
            onMouseEnter={() => drifts.current[f]?.pause()}
            onMouseLeave={() => drifts.current[f]?.play()}
          >
            <circle
              r={PLANET}
              fill={TOKEN.surface}
              stroke={isYou || isOn ? TOKEN.text : TOKEN.line2}
              strokeWidth={isOn ? 2 : 1.4}
            />
            <svg
              x={-8}
              y={-8}
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke={TOKEN.text2}
              strokeWidth={1.5}
            >
              {FUNCTION_PATHS[f]}
            </svg>
            <text
              x={PLANET + 7}
              y={4}
              fontSize={12}
              fill={isOn ? TOKEN.text : TOKEN.text2}
            >
              {f}
              {isYou && (
                <tspan fill={TOKEN.text3} dx={6}>
                  You
                </tspan>
              )}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
