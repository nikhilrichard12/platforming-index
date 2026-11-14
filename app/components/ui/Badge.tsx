import type { ReactNode } from "react";

/** Small solid rectangle, 11px text. */
export default function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive";
}) {
  return (
    <span
      className={`rounded-field px-2 py-[3px] text-[11px] leading-none ${
        tone === "positive" ? "bg-positive text-[#1E1E1E]" : "bg-panel-2 text-text-2"
      }`}
    >
      {children}
    </span>
  );
}
