"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import CountUp from "@/components/ui/CountUp";
import ScoreNote from "./BallparkNote";
import ScoreGauge from "./ScoreGauge";
import { FUNCTION_ICON } from "@/components/ui/FunctionIcons";
import { ComputedIndex, scoreMethod } from "@/lib/index";
import { FUNCTION_IDENTITY, FUNCTIONS } from "@/lib/roles";
import { FunctionName } from "@/lib/survey";
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
  meaning,
  fn,
  onFunction,
}: {
  data: VoltaraData & { index: ComputedIndex };
  /** What the score was measured from, printed under the badge. */
  basis?: string;
  /** The same score said in this reader's unit. */
  meaning?: string;
  fn?: FunctionName;
  onFunction?: (f: FunctionName) => void;
}) {
  const idx = data.index;
  const [open, setOpen] = useState(false);
  const method = scoreMethod(idx);

  return (
    <div className="bg-panel">
      <div className="px-6 pb-5 pt-4">
        {/* The score on the left, what it means on the right */}
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
          <div className="flex justify-center lg:justify-start">
            <div className="flex w-[260px] flex-col items-center">
              <ScoreGauge score={idx.score} />
              <div className="-mt-10">
                <Badge tone="positive">Measured</Badge>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[17px] leading-snug text-text">
              Sharing parts, not yet a platform
            </p>
            {meaning && fn && (
              <p className="mt-2 flex items-center gap-2 text-[13px] text-text-2">
                <span className="text-text-2">
                  {(() => {
                    const Mark = FUNCTION_ICON[fn];
                    return <Mark size={15} />;
                  })()}
                </span>
                {meaning}
              </p>
            )}
            {basis && <p className="mt-1 text-[12px] text-text-3">{basis}</p>}
            <ScoreNote avoided={idx.avoided} />

            <div className="mt-4 grid grid-cols-3 gap-4">
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

        {/* The four dimensions, across the whole width */}
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 lg:grid-cols-4">
          {idx.dimensions.map((d) => (
            <div key={d.name} title={`${d.basis} (${d.source})`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] leading-tight text-text-2">{d.name}</span>
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

      {/* The same score, in five units */}
      {onFunction && (
        <div className="border-t border-line px-6 py-3">
          <p className="text-[12px] text-text-3">Same score, five units</p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {FUNCTIONS.map((f) => {
              const Mark = FUNCTION_ICON[f];
              const id = FUNCTION_IDENTITY[f];
              const figure = id.figure(data, idx.score);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => onFunction(f)}
                  title={`Read the dashboard as ${f}`}
                  className={`flex items-center gap-2 text-left transition-colors ${
                    f === fn ? "text-text" : "text-text-2 hover:text-text"
                  }`}
                >
                  <Mark size={15} />
                  <span className="text-[12px] tabular-nums">{figure.value}</span>
                  <span className="text-[12px] text-text-3">{id.unit}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
