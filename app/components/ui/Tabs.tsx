"use client";

import type { ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  /** Draws a small risk dot after the label. */
  flagged?: boolean;
  /** This is where the reader's role leads: the label reads brighter. */
  lead?: boolean;
};

export default function Tabs({
  items,
  active,
  onSelect,
  actions,
  center = false,
}: {
  items: TabItem[];
  active: string;
  onSelect: (id: string) => void;
  actions?: ReactNode;
  /** Centre the tabs, with the action centred beneath them. */
  center?: boolean;
}) {
  return (
    <div
      className={
        center
          ? "mt-8 flex flex-col items-center gap-5"
          : "mt-8 flex items-end justify-between border-b border-line"
      }
    >
      <div className={center ? "flex w-full items-end justify-center gap-7 border-b border-line" : "flex items-end gap-7"}>
        {items.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`-mb-px flex items-center gap-2 border-b pb-2 text-[14px] transition-colors ${
                isActive
                  ? "border-text text-text"
                  : t.lead
                  ? "border-transparent text-text"
                  : "border-transparent text-text-2 hover:text-text"
              }`}
            >
              {t.label}
              {t.flagged ? (
                <span
                  aria-label="incomplete"
                  className="inline-block h-[6px] w-[6px] rounded-full bg-risk"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {actions ? <div className={center ? "" : "pb-2"}>{actions}</div> : null}
    </div>
  );
}
