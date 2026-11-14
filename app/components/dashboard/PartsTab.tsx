"use client";

import { useMemo, useState } from "react";
import Field from "@/components/ui/Field";
import Badge from "@/components/ui/Badge";
import PartMergeAnimation from "./PartMergeAnimation";
import {
  Part,
  VoltaraData,
  heatColor,
  isReviewRow,
  px,
  usd,
} from "@/lib/voltaraData";

type FilterId = "all" | "shared" | "core" | "review";

const NUM = "text-right tabular-nums";

export default function PartsTab({
  data,
  onAsk,
  onTag,
}: {
  data: VoltaraData;
  onAsk: (question: string) => void;
  onTag: (po: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [open, setOpen] = useState<string | null>(null);

  const s = data.summary;
  const filters: { id: FilterId; label: string }[] = [
    { id: "all", label: `All ${s.realParts}` },
    { id: "shared", label: `Shared ${s.sharedParts}` },
    { id: "core", label: `Core candidates ${s.coreCandidates}` },
    { id: "review", label: `Needs review ${data.reviewRows.length}` },
  ];

  const maxGap = data.byGap[0]?.gap ?? 1;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.byGap.filter((p) => {
      if (filter === "shared" && p.products < 2) return false;
      if (filter === "core" && p.products < 5) return false;
      if (filter === "review" && !p.rows.some(isReviewRow)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.cat.toLowerCase().includes(q) ||
        p.rows.some(
          (r) =>
            r.pn.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
        )
      );
    });
  }, [data.byGap, filter, query]);

  /** The merge panel hands a part back: clear any filter hiding it, open it, scroll. */
  function openPart(partId: string) {
    setQuery("");
    setFilter("all");
    setOpen(partId);
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-part="${partId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-text-2">
        {s.partNumbers} part numbers, {s.realParts} real parts
      </p>

      <PartMergeAnimation data={data} onOpenPart={openPart} />

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[260px] flex-1">
          <Field label="Search part, part number, or description" dense>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Axial fan"
              className="w-full bg-transparent py-1 text-[14px] text-text placeholder:text-text-3 focus:outline-none"
            />
          </Field>
        </div>
        <div className="flex">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setOpen(null);
              }}
              className={`-ml-px border px-4 py-[9px] text-[13px] transition-colors first:ml-0 ${
                filter === f.id
                  ? "z-10 border-text bg-transparent text-text"
                  : "border-line bg-panel-2 text-text-2 hover:text-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto bg-panel">
        <table className="w-full border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr className="border-b border-line bg-panel-2 text-left text-text-2">
              <th className="w-full max-w-0 py-2 pl-4 pr-2 font-normal">Part</th>
              <th className="px-2 py-2 font-normal">Category</th>
              <th className={`px-2 py-2 font-normal ${NUM}`}>Part numbers</th>
              <th className={`px-2 py-2 font-normal ${NUM}`}>Products</th>
              <th className="px-2 py-2 font-normal">Unit price paid</th>
              <th className={`px-2 py-2 font-normal ${NUM}`}>Yearly gap</th>
              <th className="py-2 pl-2 pr-4 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-5 text-text-3">
                  No parts match that search.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <PartRows
                key={p.id}
                part={p}
                maxGap={maxGap}
                open={open === p.id}
                onToggle={() => setOpen(open === p.id ? null : p.id)}
                onAsk={onAsk}
                onTag={onTag}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-text-3">
        Sorted by yearly gap. Sample company and sample data. A price gap is not
        booked savings.
      </p>
    </div>
  );
}

function PartRows({
  part,
  maxGap,
  open,
  onToggle,
  onAsk,
  onTag,
}: {
  part: Part;
  maxGap: number;
  open: boolean;
  onToggle: () => void;
  onAsk: (q: string) => void;
  onTag: (po: string) => void;
}) {
  const tint = part.gap > 0 ? heatColor(part.gap / maxGap) : undefined;

  return (
    <>
      <tr
        data-part={part.id}
        onClick={onToggle}
        aria-expanded={open}
        className="cursor-pointer border-b border-line transition-colors hover:bg-panel-2"
      >
        {/* max-w-0 lets this column absorb the slack and ellipsize, so the
            gap column is never pushed off the panel. */}
        <td
          className="w-full max-w-0 truncate py-2 pl-4 pr-2 text-text"
          title={part.name}
        >
          <span className="mr-2 inline-block w-3 text-text-3">
            {open ? "▾" : "▸"}
          </span>
          {part.name}
        </td>
        <td className="px-2 py-2 text-text-2">{part.cat}</td>
        <td className={`px-2 py-2 text-text-2 ${NUM}`}>{part.rows.length}</td>
        <td className={`px-2 py-2 text-text-2 ${NUM}`}>{part.products}</td>
        <td className="px-2 py-2 text-text-2">
          {part.min === part.max ? px(part.min) : `${px(part.min)} to ${px(part.max)}`}
        </td>
        <td
          className={`px-2 py-2 ${NUM} ${tint ? "text-text" : "text-text-3"}`}
          style={tint ? { backgroundColor: tint } : undefined}
        >
          {part.gap > 0 ? usd(part.gap) : "none"}
        </td>
        <td className="py-2 pl-2 pr-4 text-right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAsk(
                `Why is there a ${usd(part.gap)} yearly price gap on ${part.name}?`
              );
            }}
            className="whitespace-nowrap text-[13px] text-text-3 underline-offset-4 transition-colors hover:text-text hover:underline"
          >
            Ask why
          </button>
        </td>
      </tr>

      {open && (
        <tr className="border-b border-line">
          <td colSpan={7} className="bg-surface px-4 py-4 whitespace-normal">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-text-3">
                  <th className="py-2 pr-3 font-normal">Part number</th>
                  <th className="px-2 py-2 font-normal">Named in this product as</th>
                  <th className="px-2 py-2 font-normal">Product</th>
                  <th className="px-2 py-2 font-normal">Supplier</th>
                  <th className={`px-2 py-2 font-normal ${NUM}`}>Avg unit price</th>
                  <th className="py-2 pl-3 font-normal">Source</th>
                </tr>
              </thead>
              <tbody>
                {part.rows.map((r) => (
                  <tr key={r.pn} className="border-b border-line last:border-b-0">
                    <td className="py-2 pr-3 font-mono text-text">{r.pn}</td>
                    <td className="px-2 py-2 text-text-2">
                      {r.desc}
                      {isReviewRow(r) && (
                        <span className="ml-2 inline-block align-middle">
                          <Badge tone="warn">Needs review</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-text-2">{r.products.join(", ")}</td>
                    <td className="px-2 py-2 text-text-2">{r.supplier}</td>
                    <td className={`px-2 py-2 text-text-2 ${NUM}`}>{px(r.price)}</td>
                    <td className="py-2 pl-3">
                      <button
                        type="button"
                        onClick={() => onTag(r.po)}
                        className="rounded-field border border-line-2 px-[6px] py-px font-mono text-[11px] text-text-2 transition-colors hover:border-text-2 hover:text-text"
                      >
                        {r.po}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[12px] text-text-3">
              A match is a suggestion. Engineering approves before one part
              replaces another.
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
