"use client";

import { useEffect, useRef, useState } from "react";
import Field from "@/components/ui/Field";
import Badge from "@/components/ui/Badge";
import Tile from "@/components/ui/Tile";
import { Button, PrimaryButton } from "@/components/ui/Button";
import ReasonPicker from "@/components/ui/ReasonPicker";
import { px, usd } from "@/lib/voltaraData";
import { OriginSource, originLine } from "@/lib/origin";
import { ACTIVITY_LABEL, Decision, ReasonKind, Rule, reasonLabel } from "@/lib/rules";
import { useActivity } from "./ActivityTable";

interface Match {
  name: string;
  partNumberCount: number;
  bestRow: {
    pn: string;
    products: string[];
    supplier: string;
    origin: string;
    price: number;
    po: string;
  };
  minPrice: number;
  maxPrice: number;
  yearlySavingVsHighest: number;
  confidence: number;
}

interface Alternative {
  name: string;
  partNumber: string;
  price: number;
  supplier: string;
  origin: string;
  products: number;
}

interface CheckResult {
  match: Match | null;
  level: "match" | "possible" | "none";
  confidence: number;
  candidates: Match[];
  blockedBy: Rule[] | null;
  complianceSource: OriginSource | null;
  alternatives: Alternative[];
}

const PRODUCTS = [
  { id: "VBS-50", name: "VBS-50 StorLine Battery Cabinet" },
  { id: "VMX-20", name: "VMX-20 ModuLine Modular UPS" },
  { id: "VSI-10", name: "VSI-10 SunLine Solar Inverter" },
];


const when = (iso: string) => iso.slice(0, 10) + " " + iso.slice(11, 16);

const SOURCE_LABEL: Record<string, string> = {
  dashboard: "Dashboard",
  extension: "Extension",
  mcp: "Integration",
};

/**
 * The same check the side panel runs, inside the app, plus the rules and
 * decisions it has produced. The panel is where the work happens; this tab is
 * the reference view and the demo's safety net.
 */
export default function CheckTab({
  rules,
  decisions,
  onRefresh,
  onTag,
}: {
  rules: Rule[];
  decisions: Decision[];
  onRefresh: () => void;
  onTag: (po: string) => void;
}) {
  const [description, setDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [product, setProduct] = useState(PRODUCTS[0].id);
  const [units, setUnits] = useState(1800);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [done, setDone] = useState("");
  const [showException, setShowException] = useState(false);
  const [reasonKind, setReasonKind] = useState<ReasonKind | "">("");
  const [reasonText, setReasonText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { activity } = useActivity(3, true);

  // Same 500ms debounce the panel and the extension use. Re-runs when a rule
  // changes, so the card reflects a rule the moment it is created.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!description.trim()) {
      setResult(null);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/check-part", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, product, unitsPerYear: units }),
        });
        const data: CheckResult = await res.json();
        setResult(data.level === "none" ? null : data);
      } catch {
        setResult(null);
      }
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [description, product, units, rules]);

  const match = result?.match ?? null;
  const blocked = result?.blockedBy?.[0] ?? null;
  const possible = result?.level === "possible" ? result.candidates : [];

  async function record(decision: "reuse" | "exception", extra: Record<string, unknown> = {}) {
    await fetch("/api/part-decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        product,
        decision,
        matchedPart: match?.name,
        suggestedPn: match?.bestRow.pn,
        source: "dashboard",
        ...extra,
      }),
    });
    onRefresh();
  }

  async function reuse() {
    if (!match) return;
    setPartNumber(match.bestRow.pn);
    await record("reuse");
    setShowException(false);
    setDone(`Reusing ${match.bestRow.pn}. Part number filled in and the decision recorded.`);
  }

  async function sendException() {
    if (!reasonKind) return;
    await record("exception", { reasonKind, reasonText });
    setShowException(false);
    setDone(
      `Exception recorded as ${reasonLabel(reasonKind)}. A rule now covers this part for ${product}. The index score does not drop.`
    );
    setReasonKind("");
    setReasonText("");
  }

  async function resetDemo() {
    await fetch("/api/rules", { method: "DELETE" });
    setDone("");
    onRefresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[15px] text-text-2">Decisions</p>
        <p className="mt-1 text-[13px] text-text-3">
          This check runs in the side panel, beside whatever page the engineer
          is reading. Shown here for reference.
        </p>
      </div>

      {/* The requisition, in one compact row */}
      <div className="bg-panel p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)]">
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
          <Field label="Part number" dense>
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="On submit"
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

        {possible.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-[13px] text-text-2">Possible match</p>
            <ul className="mt-2 space-y-1">
              {possible.map((c) => (
                <li key={c.name} className="text-[13px] text-text">
                  {c.name}{" "}
                  <span className="text-text-3">
                    {c.partNumberCount} part numbers, best price {px(c.minPrice)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-text-3">
              Keep typing to narrow it down.
            </p>
          </div>
        )}

        {match && (
          <div className="mt-4 border-t border-line pt-4">
            {blocked ? (
              <>
                <Badge tone="warn">Blocked by a rule for this product</Badge>
                <p className="mt-3 text-[17px] font-light text-text">{match.name}</p>
                <p className="mt-2 text-[13px] text-text-2">
                  &ldquo;{blocked.text}&rdquo;{" "}
                  <span className="text-text-3">
                    {reasonLabel(blocked.kind)}, set {blocked.at.slice(0, 10)}
                  </span>
                </p>
                {result!.complianceSource && (
                  <p className="mt-3 text-[13px] text-text">
                    {originLine(result!.complianceSource)}{" "}
                    <span className="font-mono text-[12px] text-text-2">
                      {result!.complianceSource.partNumber}
                    </span>{" "}
                    <button
                      type="button"
                      onClick={() => onTag(result!.complianceSource!.po)}
                      className="rounded-field border border-line-2 px-[6px] py-px font-mono text-[11px] text-text-2 transition-colors hover:border-text-2 hover:text-text"
                    >
                      {result!.complianceSource.po}
                    </button>{" "}
                    <span className="text-text-3">
                      No new part number needed, only a different source.
                    </span>
                  </p>
                )}

                {result!.alternatives.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[13px] text-text-2">
                      Parts in the same category that no rule blocks:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {result!.alternatives.map((a) => (
                        <li key={a.partNumber} className="text-[13px] text-text">
                          {a.name}{" "}
                          <span className="font-mono text-[12px] text-text-2">
                            {a.partNumber}
                          </span>{" "}
                          <span className="text-text-3">
                            at {px(a.price)} from {a.supplier} ({a.origin}),
                            already in {a.products} products
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-3 text-[13px] text-text-3">
                    No approved alternative yet. Request a new part and note the
                    rule.
                  </p>
                )}
              </>
            ) : (
              <>
                <Badge tone="positive">Voltara already buys this part</Badge>
                <p className="mt-3 text-[17px] font-light text-text">{match.name}</p>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    {
                      label: "Existing part numbers",
                      value: String(match.partNumberCount),
                      sub: "voltara_boms.csv",
                    },
                    {
                      label: "Best price paid",
                      value: px(match.minPrice),
                      sub: `${match.bestRow.supplier}, ${match.bestRow.origin}`,
                    },
                    {
                      label: "Yearly saving versus the highest price paid",
                      value: usd(match.yearlySavingVsHighest),
                      sub: `${units.toLocaleString("en-US")} units at ${px(match.minPrice)} not ${px(match.maxPrice)}`,
                    },
                  ].map((t) => (
                    <Tile key={t.label}>
                      <div className="flex min-h-[70px] flex-col justify-between">
                        <p className="text-[12px] font-semibold leading-snug text-text">
                          {t.label}
                        </p>
                        <div className="text-right">
                          <p className="text-[24px] font-light leading-none text-text">
                            {t.value}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-text-3">{t.sub}</p>
                        </div>
                      </div>
                    </Tile>
                  ))}
                </div>

                <p className="mt-3 text-[13px] text-text-2">
                  Reuse <span className="text-text">{match.bestRow.pn}</span> from{" "}
                  {match.bestRow.products.join(", ")}.{" "}
                  <button
                    type="button"
                    onClick={() => onTag(match.bestRow.po)}
                    className="rounded-field border border-line-2 px-[6px] py-px font-mono text-[11px] text-text-2 transition-colors hover:border-text-2 hover:text-text"
                  >
                    {match.bestRow.po}
                  </button>{" "}
                  A new number makes {match.partNumberCount + 1} part numbers
                  for one part. Engineering confirms fit before any swap.
                </p>
              </>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!blocked && <PrimaryButton onClick={reuse}>Reuse existing part</PrimaryButton>}
              <Button onClick={() => setShowException((s) => !s)}>
                Request an exception
              </Button>
            </div>

            {done && <p className="mt-3 text-[13px] text-positive">{done}</p>}

            {showException && (
              <div className="mt-4">
                <ReasonPicker
                  kind={reasonKind}
                  text={reasonText}
                  onKind={setReasonKind}
                  onText={setReasonText}
                  onSend={sendException}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rules in force */}
      <div className="bg-panel">
        <div className="flex items-baseline justify-between gap-4 px-4 pb-3 pt-4">
          <h2 className="text-[15px] font-semibold text-text">Rules in force</h2>
          <span className="text-[12px] text-text-3">
            {rules.length} rule{rules.length === 1 ? "" : "s"}
          </span>
        </div>
        <table className="w-full border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr className="border-y border-line bg-panel-2 text-left text-text-2">
              <th className="py-2 pl-4 pr-2 font-normal">Product</th>
              <th className="px-2 py-2 font-normal">Kind</th>
              <th className="w-full max-w-0 px-2 py-2 font-normal">Rule</th>
              <th className="px-2 py-2 font-normal">Part it applies to</th>
              <th className="py-2 pl-2 pr-4 font-normal">Created</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-text-3">
                  No rules yet. A rule appears when someone declines a
                  suggestion and says why.
                </td>
              </tr>
            ) : (
              rules.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-b-0">
                  <td className="py-2 pl-4 pr-2 text-text">{r.scope.product}</td>
                  <td className="px-2 py-2 text-text-2">{reasonLabel(r.kind)}</td>
                  <td
                    className="w-full max-w-0 truncate px-2 py-2 text-text-2"
                    title={r.text}
                  >
                    {r.text}
                  </td>
                  <td className="px-2 py-2 text-text-2">{r.appliesToPart}</td>
                  <td className="py-2 pl-2 pr-4 text-text-3">{r.at.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Recent decisions */}
      <div className="bg-panel">
        <div className="flex items-baseline justify-between gap-4 px-4 pb-3 pt-4">
          <h2 className="text-[15px] font-semibold text-text">Recent decisions</h2>
          <span className="text-[12px] text-text-3">{decisions.length} recorded</span>
        </div>
        <table className="w-full border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr className="border-y border-line bg-panel-2 text-left text-text-2">
              <th className="py-2 pl-4 pr-2 font-normal">When</th>
              <th className="px-2 py-2 font-normal">Product</th>
              <th className="w-full max-w-0 px-2 py-2 font-normal">Requested</th>
              <th className="px-2 py-2 font-normal">Decision</th>
              <th className="px-2 py-2 font-normal">Reason</th>
              <th className="py-2 pl-2 pr-4 font-normal">Source</th>
            </tr>
          </thead>
          <tbody>
            {decisions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-text-3">
                  Nothing recorded yet.
                </td>
              </tr>
            ) : (
              decisions.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-b-0">
                  <td className="py-2 pl-4 pr-2 tabular-nums text-text-3">{when(d.at)}</td>
                  <td className="px-2 py-2 text-text-2">{d.product || "—"}</td>
                  <td
                    className="w-full max-w-0 truncate px-2 py-2 text-text"
                    title={d.description}
                  >
                    {d.description || "(no description)"}
                  </td>
                  <td className="px-2 py-2">
                    <Badge tone={d.decision === "reuse" ? "positive" : "warn"}>
                      {d.decision === "reuse" ? "Reused" : "Exception"}
                    </Badge>
                  </td>
                  <td
                    className="max-w-[200px] truncate px-2 py-2 text-text-2"
                    title={d.reasonText}
                  >
                    {d.decision === "exception" ? reasonLabel(d.reasonKind) : ""}
                  </td>
                  <td className="py-2 pl-2 pr-4 text-text-2">
                    {SOURCE_LABEL[d.source] ?? d.source}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Live activity, the newest three */}
      <div className="bg-panel px-4 py-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[13px] font-semibold text-text">Live activity</h2>
          <span className="text-[12px] text-text-3">Newest three</span>
        </div>
        {activity.length === 0 ? (
          <p className="mt-2 text-[12px] text-text-3">Nothing yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {activity.map((a) => (
              <li key={a.id} className="flex items-baseline gap-3 text-[12px]">
                <span className="w-[62px] shrink-0 tabular-nums text-text-3">
                  {a.at.slice(11, 19)}
                </span>
                <span className="w-[96px] shrink-0 truncate text-text-2">
                  {ACTIVITY_LABEL[a.source]}
                </span>
                <span className="truncate text-text">{a.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={resetDemo}
          className="text-[13px] text-text-3 underline-offset-4 transition-colors hover:text-text-2 hover:underline"
        >
          Reset demo data
        </button>
        <span className="text-[12px] text-text-3">
          An exception never lowers the index score. Sample company and sample
          data.
        </span>
      </div>
    </div>
  );
}
