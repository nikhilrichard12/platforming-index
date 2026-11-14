import Badge from "@/components/ui/Badge";
import CountUp from "@/components/ui/CountUp";
import BallparkNote from "./BallparkNote";
import { VoltaraData } from "@/lib/voltaraData";

const STEPS = ["Cut cost today", "Consolidate duplicates", "Common core, modules"];

/**
 * The score is the product, so it leads the page: one slim row carrying the
 * score, the four dimensions, and where Voltara sits on the three steps.
 */
export default function IndexStrip({
  data,
  basis,
}: {
  data: VoltaraData;
  /** What the score was measured from, printed under the badge. */
  basis?: string;
}) {
  const idx = data.index;

  return (
    <div className="flex flex-col gap-6 bg-panel px-6 py-5 lg:flex-row lg:items-center lg:gap-10">
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
        </div>
      </div>

      {/* Read and dimensions */}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-text">Sharing parts, not yet a platform</p>
        <p className="mt-1 text-[12px] text-text-3">
          Complexity control moves as engineers reuse parts. Exceptions with a
          reason do not lower it.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 xl:grid-cols-4">
          {idx.dimensions.map((d) => (
            <div key={d.name} title={`${d.basis} (${d.source})`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12px] text-text-2">{d.name}</span>
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
  );
}
