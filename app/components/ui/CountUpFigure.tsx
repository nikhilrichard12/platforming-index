"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import useReducedMotion from "./useReducedMotion";

/**
 * A figure already formatted for reading — "$1.13M", "13,700", "192" — that
 * counts to its new value when the number behind it changes.
 *
 * It only counts when the two figures are written the same way, so "$1.13M"
 * counts to "$1.09M" but never to "$966K": a count across two different units
 * would print numbers the data never held. Anything else crossfades.
 */

const FIGURE = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/;

interface Parsed {
  prefix: string;
  value: number;
  suffix: string;
  decimals: number;
  grouped: boolean;
}

function parse(text: string): Parsed | null {
  const m = FIGURE.exec(text.trim());
  if (!m) return null;
  const raw = m[2];
  const dot = raw.indexOf(".");
  return {
    prefix: m[1],
    value: Number(raw.replace(/,/g, "")),
    suffix: m[3],
    decimals: dot === -1 ? 0 : raw.length - dot - 1,
    grouped: raw.includes(","),
  };
}

function print(p: Parsed, v: number): string {
  const n = p.grouped
    ? v.toLocaleString("en-US", {
        minimumFractionDigits: p.decimals,
        maximumFractionDigits: p.decimals,
      })
    : v.toFixed(p.decimals);
  return `${p.prefix}${n}${p.suffix}`;
}

export default function CountUpFigure({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || shown.current === value) return;
    const from = parse(shown.current);
    const to = parse(value);
    shown.current = value;

    const sameShape =
      from && to && from.prefix === to.prefix && from.suffix === to.suffix;

    if (reduced || !sameShape) {
      el.textContent = value;
      if (!reduced) {
        animate(el, { opacity: [0.2, 1], duration: 420, ease: "outQuad" });
      }
      return;
    }

    const counter = { v: from.value };
    animate(counter, {
      v: to.value,
      duration: 700,
      ease: "outQuad",
      onUpdate: () => {
        el.textContent = print(to, counter.v);
      },
      onComplete: () => {
        el.textContent = value;
      },
    });
  }, [value, reduced]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
