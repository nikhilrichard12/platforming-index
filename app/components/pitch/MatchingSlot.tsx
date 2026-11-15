"use client";

import { useEffect, useRef } from "react";
import MatchingPanel from "@/components/dashboard/MatchingPanel";
import { MatcherEval } from "@/lib/similarity";
import { VoltaraData } from "@/lib/voltaraData";

/**
 * The Inventory tab's matching diagram, walked one band at a time.
 *
 * components/dashboard/MatchingPanel draws itself once, on mount, as a single
 * ten second timeline across three bands: the equation, the decision track,
 * and the blind grading. It takes no step, and this deck must not edit it, so
 * the walking is done from the outside: the panel mounts once and plays its
 * own run, and each band is held at opacity zero until the advance it belongs
 * to. Nothing is redrawn and nothing is restarted.
 *
 * The bands are found through the markers the panel already puts on its own
 * contents rather than by counting children, so a change to its layout costs
 * the spotlight, not the screen.
 */
export default function MatchingSlot({
  data,
  evaluation,
  /** How many bands are shown: 1 is the equation alone. */
  bands,
  /** Natural width of the panel before it is scaled to fit the stage. */
  width = 1316,
  scale = 0.9,
}: {
  data: VoltaraData;
  evaluation: MatcherEval | null;
  bands: number;
  width?: number;
  scale?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const found = useRef<HTMLElement[] | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    if (!found.current) {
      found.current = findBands(el);
      found.current.forEach((b) => {
        b.style.transition = "opacity 500ms ease";
      });
    }
    found.current.forEach((b, i) => {
      b.style.opacity = i < bands ? "1" : "0";
    });
  }, [bands]);

  return (
    <div
      className="pitch-match overflow-hidden"
      style={{ height: `${540 * scale}px` }}
    >
      <div
        ref={root}
        style={{
          width,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <MatchingPanel data={data} evaluation={evaluation} />
      </div>
    </div>
  );
}

/**
 * The three bands, as the direct children of whatever element holds them.
 * Band A carries the two description cards, band B the score track, band C
 * the graded tiles; each one is the ancestor of its marker that sits directly
 * inside the column they share.
 */
function findBands(root: HTMLElement): HTMLElement[] {
  const first = root.querySelector<HTMLElement>("[data-a='card']");
  const second = root.querySelector<HTMLElement>("[data-b='zone']");
  if (!first || !second) return [];

  const line = new Set<Element>();
  for (let e: Element | null = first; e; e = e.parentElement) line.add(e);
  let column: HTMLElement | null = second;
  while (column && !line.has(column)) column = column.parentElement;
  if (!column) return [];

  const bandOf = (selector: string) => {
    let e = root.querySelector<HTMLElement>(selector);
    while (e && e.parentElement !== column) e = e.parentElement;
    return e;
  };

  // Band C is the tiles when the matcher has been graded, and the sentence
  // explaining that it has not been when it has not.
  const third = bandOf("[data-c='tile']") ?? bandOf("[data-c='foot']");
  return [bandOf("[data-a='card']"), bandOf("[data-b='zone']"), third].filter(
    (b): b is HTMLElement => b !== null
  );
}
