"use client";

import type { ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  /** Draws a small risk dot after the label. */
  flagged?: boolean;
};

export default function Tabs({
  items,
  active,
  onSelect,
  actions,
}: {
  items: TabItem[];
  active: string;
  onSelect: (id: string) => void;
  actions?: ReactNode;
}) {
  return (
    <div className="mt-8 flex items-end justify-between border-b border-line">
      <div className="flex items-end gap-7">
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
      {actions ? <div className="pb-2">{actions}</div> : null}
    </div>
  );
}
