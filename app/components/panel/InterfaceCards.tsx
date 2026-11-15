"use client";

import Badge from "@/components/ui/Badge";
import { PrimaryButton } from "@/components/ui/Button";
import { inheritLine } from "@/lib/panel";
import { PlannedNeed } from "@/lib/plan";

/**
 * Start from what you have.
 *
 * One card per interface the page lands on, in the order they lit on the
 * stage. A card names the boundary, the parts inside it, how long the company
 * has built to it, and what comes free with it. Adopting it collapses the
 * card to a line: a decision taken does not need its argument repeated back.
 */

export interface InterfaceCardData {
  id: string;
  name: string;
  subsystem: string;
  spec: string;
  products: string[];
  since: number | null;
  inherits: string[];
  /** The parts of this interface that the product on the stage carries. */
  partNames: string[];
  /** The needs on this page it covers. */
  needs: string[];
}

export default function InterfaceCards({
  interfaces,
  adopted,
  busy,
  hovered,
  onAdopt,
  onHover,
  onSelect,
}: {
  interfaces: InterfaceCardData[];
  adopted: string[];
  busy: string;
  hovered: string | null;
  onAdopt: (iface: InterfaceCardData) => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  if (interfaces.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-[13px] text-text">Start from what you have</h2>

      {interfaces.map((iface) => {
        const on = adopted.includes(iface.id);
        const lifted = hovered === iface.id;

        if (on) {
          return (
            <button
              key={iface.id}
              type="button"
              onClick={() => onSelect(iface.id)}
              onPointerEnter={() => onHover(iface.id)}
              onPointerLeave={() => onHover(null)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                lifted ? "bg-panel-2" : "bg-panel hover:bg-panel-2"
              }`}
            >
              <span className="min-w-0 truncate text-[13px] text-text">{iface.name}</span>
              <Badge tone="positive">Adopted</Badge>
            </button>
          );
        }

        return (
          <article
            key={iface.id}
            onPointerEnter={() => onHover(iface.id)}
            onPointerLeave={() => onHover(null)}
            onClick={() => onSelect(iface.id)}
            className={`cursor-pointer px-3 py-[10px] transition-colors ${
              lifted ? "bg-panel-2" : "bg-panel"
            }`}
          >
            <p className="truncate text-[13px] text-text" title={iface.spec}>
              {iface.name}
            </p>

            <div className="mt-2 flex flex-wrap gap-1">
              {iface.partNames.map((name) => (
                <span
                  key={name}
                  title={name}
                  className="max-w-full truncate rounded-field border border-line bg-panel-2 px-2 py-[2px] text-[11px] text-text-2"
                >
                  {name}
                </span>
              ))}
            </div>

            <p className="mt-2 text-[12px] leading-snug text-text-2">
              On {iface.products.length}{" "}
              {iface.products.length === 1 ? "product" : "products"}
              {iface.since ? ` since ${iface.since}` : ""}.
            </p>

            <p className="mt-[2px] text-[12px] leading-snug text-text-2">
              {inheritLine(iface.inherits)}
            </p>

            <div className="mt-2">
              <PrimaryButton
                onClick={() => onAdopt(iface)}
                disabled={busy === iface.id}
                className="w-full whitespace-nowrap"
              >
                Design to this interface
              </PrimaryButton>
            </div>
          </article>
        );
      })}
    </section>
  );
}

/**
 * The needs with nothing behind them. It only appears when the page landed on
 * no interface at all: with one lit, the answer is the interface, not a list
 * of what is missing.
 */
export function NewThinkingCard({
  needs,
  proposed,
  busy,
  onPropose,
}: {
  needs: PlannedNeed[];
  proposed: string[];
  busy: string;
  onPropose: (need: PlannedNeed) => void;
}) {
  if (needs.length === 0) return null;

  return (
    <section className="bg-panel p-3">
      <p className="text-[13px] text-text">No existing interface.</p>
      <p className="mt-[2px] text-[12px] text-text-2">Starting new thinking.</p>

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
                  Propose
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
