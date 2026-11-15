"use client";

import { ReactNode, useEffect, useRef } from "react";
import { animate, utils } from "animejs";
import useReducedMotion from "@/components/ui/useReducedMotion";

/**
 * The small pieces every pitch screen shares. Nothing here carries a figure
 * or a sentence of its own: a screen passes in what it reads from the data.
 */

/** The 1280x720 stage, with the app's 48px page gutter. */
export function Frame({
  kicker,
  title,
  children,
  footer,
  dark = false,
}: {
  kicker?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** The hook screen sits on black rather than surface. */
  dark?: boolean;
}) {
  return (
    <div
      className={`flex h-full w-full flex-col px-12 py-11 ${
        dark ? "bg-chrome" : "bg-surface"
      }`}
    >
      {kicker ? (
        <p className="text-[15px] font-light leading-none text-text-3">{kicker}</p>
      ) : null}
      {title ? (
        <h1 className="mt-3 max-w-[1100px] text-[42px] font-light leading-[1.12] text-text">
          {title}
        </h1>
      ) : null}
      {children ? <div className="mt-9 min-h-0 flex-1">{children}</div> : null}
      {footer ? <div className="mt-7 shrink-0">{footer}</div> : null}
    </div>
  );
}

/**
 * Step-gated fade. The transition is killed by the reduced-motion rule in
 * globals.css, so a reader who asked for less motion sees the end state.
 */
export function Reveal({
  show,
  delay = 0,
  children,
  className = "",
}: {
  show: boolean;
  delay?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`transition-all duration-500 ease-out ${
        show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${className}`}
      style={{ transitionDelay: show ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

/** Where a figure came from, in words, as every other surface writes it. */
export function Source({ children }: { children: ReactNode }) {
  return <p className="text-[12px] leading-snug text-text-3">{children}</p>;
}

/** One line typed out, used once, on the hook. */
export function Typed({
  text,
  play,
  className = "",
}: {
  text: string;
  play: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!play || reduced) {
      el.textContent = text;
      return;
    }
    const state = { n: 0 };
    el.textContent = "";
    const a = animate(state, {
      n: text.length,
      duration: Math.min(1700, text.length * 36),
      ease: "linear",
      modifier: utils.round(0),
      onUpdate: () => {
        el.textContent = text.slice(0, Math.round(state.n));
      },
      onComplete: () => {
        el.textContent = text;
      },
    });
    return () => {
      a.cancel();
    };
  }, [text, play, reduced]);

  // The first paint carries the whole line, so the print path and a reader
  // with reduced motion never see a half-typed sentence.
  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

/**
 * A number that counts from zero when its screen advances to it, rather than
 * from whatever it was holding. Screens remount on arrival, so the first
 * paint is the zero.
 */
export function CountTo({
  value,
  show,
  format = (n) => n.toLocaleString("en-US"),
  duration = 1100,
  className = "",
}: {
  value: number;
  show: boolean;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const from = useRef(show ? value : 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = show ? value : 0;
    if (from.current === target || reduced) {
      el.textContent = format(target);
      from.current = target;
      return;
    }
    const state = { v: from.current };
    from.current = target;
    const a = animate(state, {
      v: target,
      duration,
      ease: "outQuad",
      onUpdate: () => {
        el.textContent = format(state.v);
      },
      onComplete: () => {
        el.textContent = format(target);
      },
    });
    return () => {
      a.cancel();
    };
    // format is rebuilt on every render by design; the value is the signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, show, reduced, duration]);

  return (
    <span ref={ref} className={className}>
      {format(show ? value : 0)}
    </span>
  );
}

/**
 * The fan, five blades and a hub, drawn in the accent so the same part reads
 * as the same part wherever it appears. Screen 1 puts one inside each of six
 * products; screen 2 puts one on its own beside the interface it belongs to.
 * The turn is the `pitch-fan-blades` rule in pitch.css.
 */
export function FanGlyph({
  cx,
  cy,
  r,
  spin,
  rim = true,
}: {
  cx: number;
  cy: number;
  r: number;
  spin: boolean;
  /** The ring around the blades, which the cluster picture drops. */
  rim?: boolean;
}) {
  const blade = `M${cx} ${cy} C ${cx + 0.17 * r} ${cy - 0.35 * r} ${
    cx + 0.39 * r
  } ${cy - 0.57 * r} ${cx + 0.65 * r} ${cy - 0.61 * r}`;
  return (
    <>
      {rim && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2F3234" />}
      <g
        className={spin ? "pitch-fan-blades" : undefined}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {[0, 72, 144, 216, 288].map((a) => (
          <path
            key={a}
            d={blade}
            fill="none"
            stroke="#EC5E31"
            strokeWidth={Math.max(1.4, r * 0.08)}
            strokeLinecap="round"
            transform={`rotate(${a} ${cx} ${cy})`}
          />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={Math.max(2, r * 0.11)} fill="#EC5E31" />
    </>
  );
}

/**
 * An SVG path that draws itself. Used by the flow on screen 5 and the
 * timeline on screen 8, so neither one needs its own animation code.
 */
export function DrawPath({
  d,
  play,
  delay = 0,
  duration = 600,
  stroke,
  strokeWidth = 1.4,
}: {
  d: string;
  play: boolean;
  delay?: number;
  duration?: number;
  stroke: string;
  strokeWidth?: number;
}) {
  const ref = useRef<SVGPathElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    if (!play || reduced) {
      el.style.strokeDashoffset = "0";
      return;
    }
    el.style.strokeDashoffset = String(len);
    const a = animate(el, {
      strokeDashoffset: 0,
      duration,
      delay,
      ease: "inOutQuad",
    });
    return () => {
      a.cancel();
    };
  }, [d, play, delay, duration, reduced]);

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}
