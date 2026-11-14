"use client";

import Field from "./Field";
import { Button } from "./Button";
import { REASON_KINDS, ReasonKind } from "@/lib/rules";

/**
 * Declining a suggestion states a rule, so the reason is required and it is
 * written in the engineer's own words. The same picker serves the dashboard
 * and the side panel, because the rule it writes is the same rule.
 */
export default function ReasonPicker({
  kind,
  text,
  onKind,
  onText,
  onSend,
  narrow = false,
  placeholder = "The cabinet needs US-origin cooling parts for a federal contract.",
}: {
  kind: ReasonKind | "";
  text: string;
  onKind: (k: ReasonKind | "") => void;
  onText: (t: string) => void;
  onSend: () => void;
  /** One column, for the 400px panel. */
  narrow?: boolean;
  placeholder?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 ${
        narrow ? "" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
      }`}
    >
      <Field label="Reason" dense>
        <select
          value={kind}
          onChange={(e) => onKind(e.target.value as ReasonKind | "")}
          className="w-full bg-transparent py-1 text-[14px] text-text focus:outline-none"
        >
          <option value="" className="bg-panel">
            Choose a reason
          </option>
          {REASON_KINDS.map((k) => (
            <option key={k.id} value={k.id} className="bg-panel">
              {k.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Why does this product need its own part?" dense>
        <input
          type="text"
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-1 text-[14px] text-text placeholder:text-text-3 focus:outline-none"
        />
      </Field>
      <div
        className={`flex flex-wrap items-center gap-3 ${narrow ? "" : "lg:col-span-2"}`}
      >
        <Button onClick={onSend} disabled={!kind}>
          Send for approval
        </Button>
        {!kind && (
          <span className="text-[12px] text-text-3">
            A reason is required. It becomes the rule others read.
          </span>
        )}
      </div>
    </div>
  );
}
