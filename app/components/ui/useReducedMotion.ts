"use client";

import { useEffect, useState } from "react";

/**
 * True when the reader has asked for less motion. Every animated panel reads
 * this and renders its end state instead of playing, so the information is
 * never carried by the movement alone.
 */
export default function useReducedMotion(): boolean {
  // Read on the first render, not in an effect: an animation that starts the
  // moment a tab opens would otherwise play once before the setting lands.
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
