"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import CountUp from "@/components/ui/CountUp";
import BallparkNote from "./BallparkNote";
import { ComputedIndex, scoreMethod } from "@/lib/index";
import { VoltaraData } from "@/lib/voltaraData";

const STEPS = ["Cut cost today", "Consolidate duplicates", "Common core, modules"];

/**
 * The score is the product, so it leads the page: one slim row carrying the
 * score, what it was measured from, the four dimensions, and where the company
 * sits on the three steps. Every figure here is computed, and the disclosure
 * prints the arithmetic that produced it.
 */
export default function IndexStrip({
  data,
  basis,
}: {
  data: VoltaraData & { index: ComputedIndex };
  /** What the score was measured from, printed under the badge. */
  basis?: string;
}) {
  const idx = data.index;
  const [open, setOpen] = useState(false);
  const method = scoreMethod(idx);

  return (
    <div className="bg-panel">
      <div className="flex flex-col gap-6 px-6 py-5 lg:flex-row lg:items-center lg:gap-10">
        {/* Score */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-baseline gap-2">
            <CountUp
              value={idx.score}
              className="text-[56px] font-light leading-none text-text"
            />
            <span className="text-[13px] text-text-3">of 100</span>
          </div>
          <div className="space-y-1">
            <Badge tone="positive">Measured</Badge>
            {basis && <p className="text-[12px] text-text-3">{basis}</p>}
            <BallparkNote />
            <p className="text-[12px] text-text-2">
              Part numbers avoided:{" "}
              <CountUp value={idx.avoided} className="tabular-nums text-text" />
            </p>
          </div>
        </div>

        {/* Read and dimensions */}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-text">Sharing parts, not yet a platform</p>
          <p className="mt-1 text-[12px] text-text-3">
            Every reuse retires a part number, and the score follows the
            arithmetic. An exception never lowers it.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {idx.dimensions.map((d) => (
              <div key={d.name} title={`${d.basis} (${d.source})`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12px] leading-tight text-text-2">
                    {d.name}
                  </span>
                  <CountUp
                    value={d.score}
                    className="shrink-0 text-[12px] tabular-nums text-text-3"
                  />
                </div>
                <div className="mt-1 h-[3px] w-full bg-line">
                  <div className="h-full bg-text-2" style={{ width: `${d.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Three steps */}
        <div className="shrink-0 lg:w-[300px]">
          <div className="grid grid-cols-3 gap-2">
            {STEPS.map((s, i) => {
              const current = i + 1 === idx.step;
              return (
                <div
                  key={s}
                  className={`border-t pt-2 ${current ? "border-text" : "border-line"}`}
                >
                  <p className={`text-[11px] ${current ? "text-text" : "text-text-3"}`}>
                    Step {i + 1}
                    {current ? " · now" : ""}
                  </p>
                  <p
                    className={`mt-1 text-[12px] leading-snug ${
                      current ? "text-text" : "text-text-2"
                    }`}
                  >
                    {s}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* How the score works */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-baseline justify-between gap-4 border-t border-line px-6 py-3 text-left"
      >
        <span className="text-[13px] text-text-2">How the score works</span>
        <span className="text-[12px] text-text-3">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="border-t border-line px-6 pb-5 pt-4">
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {method.map((m) => (
                <tr key={m.name} className="border-b border-line last:border-b-0">
                  <td className="whitespace-nowrap py-2 pr-4 text-text">{m.name}</td>
                  <td className="w-full max-w-0 py-2 pr-4 font-mono text-[12px] text-text-2">
                    {m.formula}
                  </td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums text-text">
                    {m.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] leading-relaxed text-text-3">
            Four dimensions, equal weight, each one a ratio of two numbers in
            the data. Recording a reuse retires a part number, which lifts
            Complexity control. Recording an exception changes nothing, because
            complexity a rule requires is not complexity anyone chose.
          </p>
        </div>
      )}
    </div>
  );
}
