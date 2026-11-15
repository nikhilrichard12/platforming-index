"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import CountUp from "@/components/ui/CountUp";
import ScoreGauge from "./ScoreGauge";
import { FUNCTION_ICON, IconInterface } from "@/components/ui/FunctionIcons";
import { ComputedIndex, scoreMethod } from "@/lib/index";
import { Emphasis } from "@/lib/roleHighlights";
import { FUNCTION_IDENTITY, FUNCTIONS } from "@/lib/roles";
import { FunctionName } from "@/lib/survey";
import { VoltaraData } from "@/lib/voltaraData";

/**
 * The score is the product, so it leads the page: one slim row carrying the
 * score, what it was measured from, the four dimensions, and where the company
 * sits on the three steps. Every figure here is computed, and the disclosure
 * prints the arithmetic that produced it.
 */
export default function IndexStrip({
  data,
  fn,
  roleLabel,
  emphasis,
  reuse,
  onNextSteps,
}: {
  data: VoltaraData & { index: ComputedIndex };
  /** The reader's function, from the survey. It picks which unit reads brightest. */
  fn?: FunctionName;
  /** The reader's role, shown as plain text. It is fixed for the session. */
  roleLabel?: string;
  /** What this reader's role leads with; those items get a quiet outline. */
  emphasis?: ReadonlySet<Emphasis>;
  /** Asks the assistant for a recommendation for this reader's role. */
  onNextSteps?: () => void;
  /** How much of a new product starts from an interface that already exists. */
  reuse?: {
    concept: string;
    needs: number;
    startFromSomethingBuilt: number;
    onInterface: number;
    newThinking: number;
  };
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

          <button
            type="button"
            onClick={onNextSteps}
            disabled={!onNextSteps}
            className="w-full rounded-field border border-line-2 px-5 py-4 text-left transition-colors hover:border-text-2 disabled:cursor-default disabled:hover:border-line-2"
          >
            <span className="block text-[17px] leading-snug text-text">What should you do next?</span>
            <span className="mt-2 block text-[13px] leading-relaxed text-text-2">
              Ask the assistant to explore this analysis and recommend next steps.
            </span>
          </button>
        </div>

        {/* The four dimensions, across the whole width, and beside them the
            one figure the formula does not read. */}
        <div
          className={`mt-5 grid grid-cols-2 gap-x-8 gap-y-4 ${
            reuse ? "lg:grid-cols-5" : "lg:grid-cols-4"
          }`}
        >
          {idx.dimensions.map((d) => (
            <div key={d.name} title={`${d.basis} (${d.source})`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={`text-[12px] leading-tight ${emphasis?.has("dimensions") ? "text-text" : "text-text-2"}`}>{d.name}</span>
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

          {reuse && (
            <div
              title={`${reuse.concept}: ${reuse.onInterface} needs land on an interface Voltara already has, ${reuse.newThinking} need new thinking (sample concept)`}
            >
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 text-text-2">
                  <IconInterface size={14} />
                </span>
                <span className={`text-[12px] leading-tight ${emphasis?.has("interfaces") ? "text-text" : "text-text-2"}`}>
                  Start from what exists
                </span>
              </div>
              <div className="mt-1 h-[3px] w-full bg-line">
                <div
                  className="h-full bg-positive"
                  style={{
                    width: `${Math.round((100 * reuse.startFromSomethingBuilt) / Math.max(1, reuse.needs))}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] leading-tight text-text-3">
                <span className="tabular-nums text-text-2">
                  {reuse.startFromSomethingBuilt} of {reuse.needs}
                </span>{" "}
                needs. Sample concept, not in the score.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* The same score, in five units. The role is the survey's, shown as text. */}
      {fn && (
        <div className="border-t border-line px-6 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="text-[12px] text-text-3">Same score, five units</p>
            {roleLabel && <p className="text-[12px] text-text-3">Viewing as {roleLabel}</p>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {FUNCTIONS.map((f) => {
              const Mark = FUNCTION_ICON[f];
              const id = FUNCTION_IDENTITY[f];
              const figure = id.figure(data, idx.score);
              return (
                <div
                  key={f}
                  className={`flex items-center gap-2 ${f === fn ? "text-text" : "text-text-2"}`}
                >
                  <Mark size={15} />
                  <span className="text-[12px] tabular-nums">{figure.value}</span>
                  <span className="text-[12px] text-text-3">{id.unit}</span>
                </div>
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
          <p className="mt-2 text-[12px] leading-relaxed text-text-3">
            Shared architecture and Complexity control both depend on part
            matching. Part numbers → matcher → engineer review → index. See
            Inventory for how matches get scored.
          </p>
        </div>
      )}
    </div>
  );
}
