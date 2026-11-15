"use client";

import { useCallback, useEffect, useRef } from "react";
import { animate, utils } from "animejs";
import useReducedMotion from "@/components/ui/useReducedMotion";
import { TOKEN } from "@/lib/anim";

const W = 260;
const STROKE = 6;
const R = (W - STROKE) / 2;
const CY = R + STROKE / 2;
const H = CY + STROKE / 2;
const LENGTH = Math.PI * R;

/** A half ring from the left of the arc to the right of it. */
const ARC = `M ${STROKE / 2} ${CY} A ${R} ${R} 0 0 1 ${W - STROKE / 2} ${CY}`;

/**
 * The score as a half ring: the track is the whole scale, the filled arc is
 * what this company scored. It sweeps and counts once, then holds.
 */
export default function ScoreGauge({ score }: { score: number }) {
  const reduced = useReducedMotion();
  const arcRef = useRef<SVGPathElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null);

  const play = useCallback(() => {
    const arc = arcRef.current;
    const num = numRef.current;
    if (!arc || !num) return;

    const offset = LENGTH * (1 - Math.max(0, Math.min(100, score)) / 100);

    if (reduced) {
      utils.set(arc, { strokeDashoffset: offset });
      num.textContent = String(score);
      return;
    }

    utils.set(arc, { strokeDashoffset: LENGTH });
    num.textContent = "0";

    animate(arc, { strokeDashoffset: offset, duration: 1100, ease: "outCubic" });

    const counter = { value: 0 };
    animate(counter, {
      value: score,
      duration: 1100,
      ease: "outCubic",
      modifier: utils.round(0),
      onUpdate: () => {
        num.textContent = String(Math.round(counter.value));
      },
    });
  }, [score, reduced]);

  // Sweeps once when the page opens, and again only if the score moves.
  useEffect(() => {
    if (shown.current === score) return;
    shown.current = score;
    play();
  }, [score, play]);

  return (
    <div className="relative" style={{ width: W, height: H + 56 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <path
          d={ARC}
          fill="none"
          stroke={TOKEN.line}
          strokeWidth={STROKE}
          strokeLinecap="butt"
        />
        <path
          ref={arcRef}
          d={ARC}
          fill="none"
          stroke={TOKEN.text}
          strokeWidth={STROKE}
          strokeLinecap="butt"
          strokeDasharray={LENGTH}
          strokeDashoffset={LENGTH}
        />
      </svg>

      <div
        className="absolute inset-x-0 flex flex-col items-center"
        style={{ top: CY - 58 }}
      >
        <span
          ref={numRef}
          className="text-[56px] font-light leading-none tabular-nums text-text"
        >
          {score}
        </span>
        <span className="mt-1 text-[13px] text-text-3">of 100</span>
      </div>
    </div>
  );
}
