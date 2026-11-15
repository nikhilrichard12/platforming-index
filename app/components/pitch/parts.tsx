"use client";

import { ReactNode, useEffect, useRef } from "react";
import { animate, utils } from "animejs";
import useReducedMotion from "@/components/ui/useReducedMotion";

/**
 * The small pieces every pitch screen shares. Nothing here carries a figure
 * or a sentence of its own: a screen passes in what it reads from the data.
 */

/**
 * The deck's own ground: a dark field that runs to deep purple across the
 * right third, with two soft magenta circles low on that side. It is painted
 * once per screen behind the content rather than on the page, so a printed
 * sheet carries it too.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background: [
          "radial-gradient(760px 760px at 82% 104%, rgba(173,58,214,0.34) 0%, rgba(173,58,214,0) 62%)",
          "radial-gradient(520px 520px at 101% 72%, rgba(124,34,221,0.30) 0%, rgba(124,34,221,0) 60%)",
          "linear-gradient(96deg, #16171A 0%, #16171A 50%, #26124C 78%, #4B1B96 100%)",
        ].join(", "),
      }}
    />
  );
}

/** The 1280x720 stage, with the app's 48px page gutter. */
export function Frame({
  title,
  children,
  footer,
}: {
  /** The one title the screen is allowed. */
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Backdrop />
      {/*
        The title sits low and the content ends as far from the bottom edge
        as the title is from the top, so no screen crowds either edge.
      */}
      <div className="relative flex h-full w-full flex-col px-12 pb-14 pt-14">
        {title ? (
          <h1 className="max-w-[1120px] text-[40px] font-light leading-[1.14] text-text">
            {title}
          </h1>
        ) : null}
        {children ? (
          <div className={`${title ? "mt-8" : ""} min-h-0 flex-1`}>{children}</div>
        ) : null}
        {footer ? <div className="mt-7 shrink-0">{footer}</div> : null}
      </div>
    </div>
  );
}

/**
 * An equation, set in a serif maths face with italic variables, which is how
 * a formula is written everywhere except in a web app. Pass the terms; the
 * component spaces and styles them.
 */
export function Equation({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`pitch-math ${className}`}>{children}</span>;
}

/** A variable inside an Equation. */
export function Var({ children }: { children: ReactNode }) {
  return <span className="pitch-var">{children}</span>;
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
      className={`transition-all duration-[250ms] ease-out ${
        show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${className}`}
      style={{ transitionDelay: show ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

/**
 * The counter on the three step screens: which of the three this is, in the
 * accent, so a judge can see the shape of the argument without the words.
 */
export function StepCount({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <p className="text-[15px] font-light leading-none tracking-wide text-accent">
      {n} of {of}
    </p>
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
      duration: Math.min(900, text.length * 18),
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
  duration = 550,
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
 * An SVG path that draws itself. Used by the flow on screen 5 and the
 * timeline on screen 8, so neither one needs its own animation code.
 */
export function DrawPath({
  d,
  play,
  delay = 0,
  duration = 300,
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
