"use client";

import { useEffect, useRef } from "react";
import { animate, utils } from "animejs";
import useReducedMotion from "./useReducedMotion";

/**
 * A number that counts to its new value when it changes. The first render
 * prints the value outright, so the server HTML and a reader with reduced
 * motion both see the real figure.
 */
export default function CountUp({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (shown.current === value || reduced) {
      el.textContent = String(value);
      shown.current = value;
      return;
    }
    const counter = { v: shown.current };
    shown.current = value;
    animate(counter, {
      v: value,
      duration: 700,
      ease: "outQuad",
      modifier: utils.round(0),
      onUpdate: () => {
        el.textContent = String(Math.round(counter.v));
      },
    });
  }, [value, reduced]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
