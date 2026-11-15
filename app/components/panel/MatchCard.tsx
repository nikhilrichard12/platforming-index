"use client";

import Badge from "@/components/ui/Badge";
import { Button, PrimaryButton } from "@/components/ui/Button";
import ReasonPicker from "@/components/ui/ReasonPicker";
import { originLine } from "@/lib/origin";
import { PLAN_FLOOR, PlannedNeed } from "@/lib/plan";
import { ReasonKind } from "@/lib/rules";
import { px } from "@/lib/voltaraData";

const STATUS_TONE: Record<string, "positive" | "neutral" | "warn" | "risk"> = {
  "in core": "positive",
  shared: "neutral",
  "exists, unique": "neutral",
  "blocked by rule": "risk",
  "new part needed": "warn",
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path
        d={dir === "left" ? "M7.5 2 L3.5 6 L7.5 10" : "M4.5 2 L8.5 6 L4.5 10"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Arrow({ dir, label, onClick, disabled }: { dir: "left" | "right"; label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-line-2 bg-panel-2 text-text transition-colors hover:border-text-2 disabled:cursor-default disabled:border-line disabled:text-text-3"
    >
      <Chevron dir={dir} />
    </button>
  );
}

/**
 * One match at a time: the part, where it comes from, and what to do about it.
 * Every figure keeps its citation: the price its purchase order, the product
 * count its part group in voltara_parts.json.
 */
export default function MatchCard({
  need,
  index,
  total,
  partGroupId,
  note,
  declining,
  reasonKind,
  reasonText,
  onPrev,
  onNext,
  onReuse,
  onToggleDecline,
  onReasonKind,
  onReasonText,
  onSendException,
}: {
  need: PlannedNeed;
  index: number;
  total: number;
  /** The part group id in voltara_parts.json, e.g. C013. */
  partGroupId?: string;
  note: string;
  declining: boolean;
  reasonKind: ReasonKind | "";
  reasonText: string;
  onPrev: () => void;
  onNext: () => void;
  onReuse: () => void;
  onToggleDecline: () => void;
  onReasonKind: (k: ReasonKind | "") => void;
  onReasonText: (t: string) => void;
  onSendException: () => void;
}) {
  const blocked = need.status === "blocked by rule";

  // Arrows, no counter: the position in a list is not the point, the part is.
  const arrows =
    total > 1 ? (
      <div className="ml-auto flex items-center gap-2">
        <Arrow dir="left" label="Previous match" onClick={onPrev} disabled={index === 0} />
        <Arrow dir="right" label="Next match" onClick={onNext} disabled={index === total - 1} />
      </div>
    ) : null;

  return (
    <div className="bg-panel p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-[13px] text-text" title={need.part ?? need.need}>
          {need.part ?? need.need}
        </p>
        <Badge tone={STATUS_TONE[need.status] ?? "neutral"}>{need.status}</Badge>
      </div>

      {need.part ? (
        <>
          <p className="mt-1 flex items-baseline justify-between gap-2 text-[12px] text-text-2">
            <span className="min-w-0 truncate">
              {px(need.price ?? 0)} from {need.supplier}, {need.origin}
              {need.confidence < PLAN_FLOOR && (
                <span className="ml-1 text-text-3">check fit</span>
              )}
            </span>
            {need.po && <span className="shrink-0 font-mono text-[11px] text-text-3">[{need.po}]</span>}
          </p>
          <p className="mt-[2px] truncate text-[11px] text-text-3">
            <span className="font-mono">{need.partNumber}</span>
            {need.products !== undefined && (
              <>
                {" "}
                · Used in {need.products} {need.products === 1 ? "product" : "products"}
                {partGroupId && <span className="font-mono"> [{partGroupId}]</span>}
              </>
            )}
          </p>

          {blocked && need.rule && (
            <p className="mt-2 line-clamp-2 text-[12px] text-text-2">
              Rule {need.rule.id}: &ldquo;{need.rule.text}&rdquo;
              {need.complianceSource && <> {originLine(need.complianceSource)}</>}
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 text-[12px] text-text-3">
          No match in the parts data. A new part number is reasonable here.
        </p>
      )}

      {note && <p className="mt-1 text-[12px] text-text-2">{note}</p>}

      {declining && need.part ? (
        <div className="mt-2">
          <ReasonPicker
            narrow
            kind={reasonKind}
            text={reasonText}
            onKind={onReasonKind}
            onText={onReasonText}
            onSend={onSendException}
          />
          <div className="mt-2 flex items-center">
            <button
              type="button"
              onClick={onToggleDecline}
              className="text-[12px] text-text-2 underline-offset-4 transition-colors hover:text-text hover:underline"
            >
              Cancel
            </button>
            {arrows}
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          {need.part && !blocked && (
            <>
              <PrimaryButton onClick={onReuse}>Reuse</PrimaryButton>
              <Button onClick={onToggleDecline}>Decline</Button>
            </>
          )}
          {arrows}
        </div>
      )}
    </div>
  );
}
