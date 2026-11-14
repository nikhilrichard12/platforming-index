"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Field from "@/components/ui/Field";
import Badge from "@/components/ui/Badge";
import Tile from "@/components/ui/Tile";
import { Button, PrimaryButton } from "@/components/ui/Button";
import { px, usd } from "@/lib/voltaraData";

interface Match {
  name: string;
  partNumberCount: number;
  products: number;
  bestRow: { pn: string; products: string[]; supplier: string; price: number; po: string };
  minPrice: number;
  maxPrice: number;
  yearlySavingVsHighest: number;
  confidence: number;
}

interface Decision {
  id: string;
  description: string;
  product: string;
  decision: "reuse" | "exception";
  partNumber?: string;
  reason?: string;
  at: string;
}

const PRODUCTS = [
  { id: "VBS-50", name: "VBS-50 StorLine Battery Cabinet" },
  { id: "VMX-20", name: "VMX-20 ModuLine Modular UPS" },
  { id: "VSI-10", name: "VSI-10 SunLine Solar Inverter" },
];

const MIN_CONFIDENCE = 0.6;

/**
 * The same check the extension performs, inside the app. The extension is the
 * real delivery; this tab is the demo's safety net and the place to show the
 * decisions the check has recorded.
 */
export default function CheckTab({ onTag }: { onTag: (po: string) => void }) {
  const [description, setDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [product, setProduct] = useState(PRODUCTS[0].id);
  const [units, setUnits] = useState(1800);
  const [match, setMatch] = useState<Match | null>(null);
  const [done, setDone] = useState("");
  const [showException, setShowException] = useState(false);
  const [reason, setReason] = useState("");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDecisions = useCallback(async () => {
    try {
      const res = await fetch("/api/part-decision");
      setDecisions((await res.json()).decisions ?? []);
    } catch {
      /* the panel simply stays empty */
    }
  }, []);

  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  // Same 500ms debounce the content script uses.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!description.trim()) {
      setMatch(null);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/check-part", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, product, unitsPerYear: units }),
        });
        const data = await res.json();
        setMatch(data.match && data.match.confidence >= MIN_CONFIDENCE ? data.match : null);
      } catch {
        setMatch(null);
      }
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [description, product, units]);

  async function record(decision: "reuse" | "exception", extra: Partial<Decision> = {}) {
    await fetch("/api/part-decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, product, decision, ...extra }),
    });
    loadDecisions();
  }

  async function reuse() {
    if (!match) return;
    setPartNumber(match.bestRow.pn);
    await record("reuse", { partNumber: match.bestRow.pn });
    setShowException(false);
    setDone(`Reusing ${match.bestRow.pn}. Part number filled in and the decision recorded.`);
  }

  async function sendException() {
    await record("exception", { reason });
    setShowException(false);
    setReason("");
    setDone("Exception sent for approval. The decision is recorded.");
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[15px] text-text-2">New part check</p>
        <p className="mt-1 text-[13px] text-text-3">
          This check runs inside the procurement system through a browser
          extension. Shown here for reference.
        </p>
      </div>

      <div className="space-y-5">
        {/* The requisition, as the procurement system asks for it */}
        <div className="space-y-4 bg-panel p-4">
          <h2 className="text-[15px] font-semibold text-text">
            New part requisition REQ-2026-1184
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-3">
              <Field label="Description" dense>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDone("");
              }}
                  placeholder="Fan, axial, 120 mm, 24 VDC"
                  className="w-full bg-transparent py-1 text-[14px] text-text placeholder:text-text-3 focus:outline-none"
                />
              </Field>
            </div>
            <Field label="Part number" dense>
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
                placeholder="Assigned on submit"
                className="w-full bg-transparent py-1 font-mono text-[14px] text-text placeholder:font-sans placeholder:text-text-3 focus:outline-none"
              />
            </Field>
            <Field label="Product" dense>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full bg-transparent py-1 text-[14px] text-text focus:outline-none"
              >
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-panel">
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Units per year" dense>
              <input
                type="number"
                min={1}
                value={units}
                onChange={(e) => setUnits(Number(e.target.value) || 0)}
                className="w-full bg-transparent py-1 text-[14px] tabular-nums text-text focus:outline-none"
              />
            </Field>
          </div>
        </div>

        {/* The card, same shape the extension draws */}
        <div className="bg-panel p-4">
          {!match ? (
            <p className="text-[13px] text-text-3">
              Type a description. If Voltara already buys the part, the check
              appears here.
            </p>
          ) : (
            <div>
              <Badge tone="positive">Voltara already buys this part</Badge>
              <p className="mt-3 text-[17px] font-light text-text">{match.name}</p>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Tile>
                  <div className="flex min-h-[74px] flex-col justify-between">
                    <p className="text-[12px] font-semibold leading-snug text-text">
                      Existing part numbers
                    </p>
                    <div className="text-right">
                      <p className="text-[26px] font-light leading-none text-text">
                        {match.partNumberCount}
                      </p>
                      <p className="mt-1 text-[11px] text-text-3">voltara_boms.csv</p>
                    </div>
                  </div>
                </Tile>
                <Tile>
                  <div className="flex min-h-[74px] flex-col justify-between">
                    <p className="text-[12px] font-semibold leading-snug text-text">
                      Best price paid
                    </p>
                    <div className="text-right">
                      <p className="text-[26px] font-light leading-none text-text">
                        {px(match.minPrice)}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-text-3">
                        {match.bestRow.supplier}
                      </p>
                    </div>
                  </div>
                </Tile>
                <Tile>
                  <div className="flex min-h-[74px] flex-col justify-between">
                    <p className="text-[12px] font-semibold leading-snug text-text">
                      Yearly saving versus the highest price paid
                    </p>
                    <div className="text-right">
                      <p className="text-[26px] font-light leading-none text-text">
                        {usd(match.yearlySavingVsHighest)}
                      </p>
                      <p className="mt-1 text-[11px] text-text-3">
                        {units.toLocaleString("en-US")} units a year at{" "}
                        {px(match.minPrice)} instead of {px(match.maxPrice)}
                      </p>
                    </div>
                  </div>
                </Tile>
              </div>

              <p className="mt-4 text-[13px] text-text-2">
                Reuse <span className="text-text">{match.bestRow.pn}</span> from{" "}
                {match.bestRow.products.join(", ")}.{" "}
                <button
                  type="button"
                  onClick={() => onTag(match.bestRow.po)}
                  className="rounded-field border border-line-2 px-[6px] py-px font-mono text-[11px] text-text-2 transition-colors hover:border-text-2 hover:text-text"
                >
                  {match.bestRow.po}
                </button>
              </p>
              <p className="mt-2 text-[13px] text-text-2">
                A new number makes {match.partNumberCount + 1} part numbers for
                one part and lowers the Complexity control score. Engineering
                confirms fit before any swap.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <PrimaryButton onClick={reuse}>Reuse existing part</PrimaryButton>
                <Button onClick={() => setShowException((s) => !s)}>
                  Request an exception
                </Button>
              </div>

              {done && <p className="mt-3 text-[13px] text-positive">{done}</p>}

              {showException && (
                <div className="mt-4">
                  <Field label="Why does this product need its own part?" dense>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="The cabinet needs a sealed bearing for the salt-fog test."
                      className="w-full resize-y bg-transparent py-1 text-[14px] text-text placeholder:text-text-3 focus:outline-none"
                    />
                  </Field>
                  <div className="mt-3">
                    <Button onClick={sendException}>Send for approval</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-panel">
        <div className="flex items-baseline justify-between gap-4 px-4 pb-3 pt-4">
          <h2 className="text-[15px] font-semibold text-text">Recent decisions</h2>
          <span className="text-[12px] text-text-3">
            {decisions.length} recorded this session
          </span>
        </div>
        <table className="w-full border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr className="border-y border-line bg-panel-2 text-left text-text-2">
              <th className="py-2 pl-4 pr-2 font-normal">Decision</th>
              <th className="w-full max-w-0 px-2 py-2 font-normal">Description</th>
              <th className="px-2 py-2 font-normal">Product</th>
              <th className="px-2 py-2 font-normal">Part number</th>
              <th className="py-2 pl-2 pr-4 font-normal">Reason</th>
            </tr>
          </thead>
          <tbody>
            {decisions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-text-3">
                  Nothing recorded yet.
                </td>
              </tr>
            )}
            {decisions.map((d) => (
              <tr key={d.id} className="border-b border-line last:border-b-0">
                <td className="py-2 pl-4 pr-2">
                  <Badge tone={d.decision === "reuse" ? "positive" : "warn"}>
                    {d.decision === "reuse" ? "Reuse" : "Exception"}
                  </Badge>
                </td>
                <td className="w-full max-w-0 truncate px-2 py-2 text-text" title={d.description}>
                  {d.description || "(no description)"}
                </td>
                <td className="px-2 py-2 text-text-2">{d.product || "—"}</td>
                <td className="px-2 py-2 font-mono text-text-2">{d.partNumber ?? ""}</td>
                <td
                  className="max-w-[220px] truncate py-2 pl-2 pr-4 text-text-2"
                  title={d.reason}
                >
                  {d.reason ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-text-3">
        Decisions are held in memory for this session only. Sample company and
        sample data.
      </p>
    </div>
  );
}
