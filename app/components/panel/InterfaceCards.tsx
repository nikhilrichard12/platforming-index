"use client";

import Badge from "@/components/ui/Badge";
import { PrimaryButton } from "@/components/ui/Button";
import { PlanSummary, PlannedNeed } from "@/lib/plan";

/**
 * Start from what you have.
 *
 * A part is one line of a bill of materials. An interface is the boundary a
 * product designs to, and it brings the brackets, the harness, the firmware
 * and the test fixture with it — so this layer leads, and the parts list sits
 * underneath it.
 */

export default function InterfaceCards({
  interfaces,
  adopted,
  busy,
  onAdopt,
}: {
  interfaces: PlanSummary["interfaces"];
  /** Interface ids already adopted for this page. */
  adopted: string[];
  busy: string;
  onAdopt: (iface: PlanSummary["interfaces"][number]) => void;
}) {
  if (interfaces.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] text-text">Start from what you have</h2>
        <span className="text-[11px] text-text-3">
          {interfaces.length} {interfaces.length === 1 ? "interface" : "interfaces"}
        </span>
      </div>

      {interfaces.map((iface) => {
        const on = adopted.includes(iface.id);
        return (
          <article key={iface.id} className="bg-panel px-3 py-[10px]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] text-text" title={iface.name}>
                  {iface.name}
                </p>
                <p className="mt-[2px] text-[11px] text-text-3">{iface.subsystem}</p>
              </div>
              {on ? (
                <Badge tone="positive">Adopted</Badge>
              ) : (
                <span className="shrink-0 text-[11px] text-text-3">
                  {iface.needs.length} {iface.needs.length === 1 ? "need" : "needs"}
                </span>
              )}
            </div>

            <p className="mt-2 text-[12px] leading-snug text-text-2">{iface.spec}</p>

            <p
              className="mt-[6px] text-[11px] leading-snug text-text-3"
              title={iface.products.join(", ")}
            >
              On {iface.products.length}{" "}
              {iface.products.length === 1 ? "product" : "products"}
              {iface.since ? ` since ${iface.since}` : ""}
            </p>

            <div className="mt-2 border-t border-line pt-2">
              <p className="text-[11px] text-text-3">You inherit</p>
              <ul className="mt-1 space-y-[2px]">
                {iface.inherits.map((line) => (
                  <li key={line} className="text-[12px] leading-snug text-text-2">
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-2 text-[11px] leading-snug text-text-3">
              Covers: {iface.needs.join("; ")}
            </p>

            <div className="mt-2 space-y-1">
              <p className="truncate text-[11px] text-text-3">
                {on
                  ? `${iface.needs.length} ${iface.needs.length === 1 ? "need" : "needs"} settled`
                  : "Recorded against this page"}
              </p>
              <PrimaryButton
                onClick={() => onAdopt(iface)}
                disabled={on || busy === iface.id}
                className="w-full whitespace-nowrap"
              >
                {on ? "Designed to this interface" : "Design to this interface"}
              </PrimaryButton>
            </div>
          </article>
        );
      })}
    </section>
  );
}

/**
 * The needs with nothing behind them. Proposing one is how the next product
 * finds it: a company gets interfaces by somebody naming the first one.
 */
export function NewThinkingCard({
  needs,
  proposed,
  busy,
  onPropose,
}: {
  needs: PlannedNeed[];
  /** Needs already proposed as an interface. */
  proposed: string[];
  busy: string;
  onPropose: (need: PlannedNeed) => void;
}) {
  if (needs.length === 0) return null;

  return (
    <section className="bg-panel p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] text-text">No existing interface.</p>
          <p className="mt-[2px] text-[12px] text-text-2">Starting new thinking.</p>
        </div>
        <Badge tone="warn">{needs.length}</Badge>
      </div>

      <ul className="mt-2 divide-y divide-line border-t border-line">
        {needs.map((n) => {
          const done = proposed.includes(n.need);
          return (
            <li key={n.need} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-[12px] text-text-2" title={n.need}>
                {n.need}
              </span>
              {done ? (
                <Badge>Proposed</Badge>
              ) : (
                <button
                  type="button"
                  onClick={() => onPropose(n)}
                  disabled={busy === n.need}
                  className="h-[24px] shrink-0 rounded-full border border-line-2 bg-panel-2 px-3 text-[11px] text-text transition-colors hover:border-text-2 disabled:text-text-3"
                >
                  Propose as a new interface
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
