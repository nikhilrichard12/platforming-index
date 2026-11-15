"use client";

import { ReactNode } from "react";

/**
 * The shell every animated panel shares: title, an optional control row, the
 * stage, and a replay control that is always reachable, including when motion
 * is turned off (there it redraws the end state).
 */
export default function AnimationPanel({
  title,
  note,
  controls,
  onReplay,
  replayLabel = "Replay",
  children,
  footnote,
}: {
  title: string;
  note?: string;
  controls?: ReactNode;
  /** Omitted when the panel sits inside another that already replays it. */
  onReplay?: () => void;
  replayLabel?: string;
  children: ReactNode;
  footnote?: string;
}) {
  return (
    <div className="bg-panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-text">{title}</h2>
          {note && <p className="mt-1 text-[12px] text-text-3">{note}</p>}
        </div>
        <div className="flex items-center gap-4">
          {controls}
          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              className="h-[26px] shrink-0 rounded-full border border-line-2 bg-panel-2 px-3 text-[12px] text-text transition-colors hover:border-text-2"
            >
              {replayLabel}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">{children}</div>

      {footnote && <p className="mt-3 text-[12px] text-text-3">{footnote}</p>}
    </div>
  );
}
