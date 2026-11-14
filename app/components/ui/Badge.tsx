import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-panel-2 text-text-2",
  positive: "bg-positive text-[#1E1E1E]",
  warn: "bg-warn text-[#1E1E1E]",
  risk: "bg-risk text-[#1E1E1E]",
};

/** Small solid rectangle, 11px text. */
export default function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-field px-2 py-[3px] text-[11px] leading-none ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
