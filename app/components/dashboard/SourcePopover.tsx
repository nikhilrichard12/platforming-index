"use client";

import { useEffect, useRef } from "react";
import { Part, PartRow, px } from "@/lib/voltaraData";

export interface SourceHit {
  part: Part;
  row: PartRow;
}

/** One source row, opened from a [POxxxxxx] tag in an assistant reply. */
export default function SourcePopover({
  hit,
  onClose,
}: {
  hit: SourceHit;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  const { part, row } = hit;
  const fields: [string, string][] = [
    ["Part", part.name],
    ["Part number", row.pn],
    ["Named in this product as", row.desc],
    ["Product", row.products.join(", ")],
    ["Supplier", row.supplier],
    ["Average unit price", px(row.price)],
    ["File", "voltara_spend_cube.csv"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div
        ref={ref}
        role="dialog"
        aria-label={`Source row ${row.po}`}
        className="w-full max-w-[460px] bg-panel p-6"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[15px] font-semibold text-text">Source row</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] text-text-3 transition-colors hover:text-text"
          >
            Close
          </button>
        </div>
        <p className="mt-1 font-mono text-[13px] text-text-2">{row.po}</p>

        <dl className="mt-5 border-t border-line">
          {fields.map(([label, value]) => (
            <div key={label} className="flex gap-6 border-b border-line py-3">
              <dt className="w-[180px] shrink-0 text-[13px] text-text-3">{label}</dt>
              <dd
                className={`text-[13px] text-text ${
                  label === "Part number" || label === "File" ? "font-mono" : ""
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-[12px] leading-relaxed text-text-3">
          A match is a suggestion. Engineering approves before one part replaces
          another. Sample data.
        </p>
      </div>
    </div>
  );
}
