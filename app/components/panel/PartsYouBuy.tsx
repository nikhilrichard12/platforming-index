"use client";

import Badge from "@/components/ui/Badge";
import { NeedTone, TONE_COLOR, TONE_LABEL } from "@/lib/models/planStage";
import { PlannedNeed } from "@/lib/plan";
import { usd } from "@/lib/voltaraData";

/**
 * Parts you already buy: the bottom layer, deliberately compact. Each row is
 * a need that landed on a part, with the part number and the lowest price the
 * company already pays. Picking one opens its card above.
 */
export default function PartsYouBuy({
  needs,
  settled,
  selected,
  onPick,
}: {
  needs: PlannedNeed[];
  /** Needs an adopted interface has already settled. */
  settled: string[];
  selected?: string;
  onPick: (need: PlannedNeed) => void;
}) {
  const rows = needs.filter((n) => n.part);
  if (rows.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] text-text">Parts you already buy</h2>
        <span className="text-[11px] text-text-3">{rows.length}</span>
      </div>

      <ul className="divide-y divide-line bg-panel">
        {rows.map((n) => {
          const on = selected === n.need;
          const done = settled.includes(n.need);
          return (
            <li key={n.need}>
              <button
                type="button"
                onClick={() => onPick(n)}
                aria-pressed={on}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                  on ? "bg-panel-2" : "hover:bg-panel-2"
                }`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0"
                  style={{
                    backgroundColor:
                      TONE_COLOR[
                        (n.status === "blocked by rule"
                          ? "blocked"
                          : n.landing) as NeedTone
                      ],
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] text-text" title={n.need}>
                    {n.need}
                  </span>
                  <span className="mt-[1px] block truncate text-[11px] text-text-3">
                    {n.part} · {n.partNumber}
                    {n.price !== undefined ? ` · ${usd(n.price)}` : ""}
                  </span>
                </span>
                {done && <Badge tone="positive">Settled</Badge>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The four outcomes on the stage, with how many of each this page has. */
export function StageLegend({
  counts,
}: {
  counts: Record<NeedTone, number>;
}) {
  const tones: NeedTone[] = ["interface", "part", "new", "blocked"];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {tones
        .filter((t) => counts[t] > 0)
        .map((t) => (
          <span key={t} className="flex items-center gap-[6px]" title={TONE_LABEL[t]}>
            <i
              aria-hidden
              className="block h-2 w-2 shrink-0"
              style={{ backgroundColor: TONE_COLOR[t] }}
            />
            <span className="text-[11px] tabular-nums text-text-2">{counts[t]}</span>
            <span className="text-[11px] text-text-3">{TONE_LABEL[t]}</span>
          </span>
        ))}
    </div>
  );
}
