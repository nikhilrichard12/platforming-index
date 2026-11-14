"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Field from "@/components/ui/Field";
import { PrimaryButton } from "@/components/ui/Button";
import {
  NeedStatus,
  PlanResult,
  SAMPLE_CONCEPT,
  headline,
} from "@/lib/plan";
import { px } from "@/lib/voltaraData";

const TONE: Record<NeedStatus, "positive" | "neutral" | "warn"> = {
  "in core": "positive",
  shared: "neutral",
  "exists, unique": "neutral",
  "blocked by rule": "warn",
  "new part needed": "warn",
};

export default function NewProductTab({
  onTag,
}: {
  onTag: (po: string) => void;
}) {
  const [name, setName] = useState("");
  const [concept, setConcept] = useState("");
  const [sample, setSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanResult | null>(null);

  async function check() {
    if (!concept.trim()) {
      setError("Paste a concept or a list of needs first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/plan-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: name.trim() || "Unnamed concept",
          description: concept,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.hint ?? body.error ?? "That could not be checked.");
        setPlan(null);
      } else {
        setPlan(body as PlanResult);
      }
    } catch {
      setError("The check could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function loadSample() {
    setName(SAMPLE_CONCEPT.name);
    setConcept(SAMPLE_CONCEPT.description);
    setSample(true);
    setPlan(null);
    setError("");
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[15px] text-text-2">New product</p>
        <p className="mt-1 text-[13px] text-text-3">
          Before a part number exists, most of what a concept needs is already
          on a shelf. This checks a concept against the parts Voltara buys and
          the rules in force.
        </p>
      </div>

      <div className="bg-panel p-5">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Field label="Product name" dense>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSample(false);
              }}
              placeholder="VBS-30 Outdoor Battery Cabinet"
              className="w-full bg-transparent py-1 text-[14px] text-text placeholder:text-text-3 focus:outline-none"
            />
          </Field>

          <Field label="Paste a product concept or a list of what it needs">
            <textarea
              value={concept}
              onChange={(e) => {
                setConcept(e.target.value);
                setSample(false);
              }}
              rows={8}
              placeholder={"Cooling fan, axial, 120 mm\nDC link capacitor\nEnclosure latch"}
              className="w-full resize-y bg-transparent text-[14px] leading-relaxed text-text placeholder:text-text-3 focus:outline-none"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={loadSample}
            className="text-[13px] text-text-2 underline-offset-4 transition-colors hover:text-text hover:underline"
          >
            Load sample concept
          </button>
          <PrimaryButton onClick={check} disabled={busy}>
            {busy ? "Checking" : "Check against the core"}
          </PrimaryButton>
        </div>

        {sample && (
          <p className="mt-3 text-[12px] text-text-3">
            Sample concept for a product Voltara does not build. Fictional, like
            the rest of this data.
          </p>
        )}
        {error && <p className="mt-3 text-[12px] text-risk">{error}</p>}
      </div>

      {plan && (
        <>
          <div className="bg-panel p-5">
            <p className="text-[17px] font-light leading-snug text-text">
              {headline(plan.summary)}
            </p>
            <p className="mt-2 text-[13px] text-text-2">
              {plan.summary.coveredPercent} percent of {plan.product.name} is
              already in the parts data.{" "}
              {plan.summary.projectedNewPartNumbers > 0
                ? `${plan.summary.projectedNewPartNumbers} new part number${
                    plan.summary.projectedNewPartNumbers === 1 ? "" : "s"
                  } projected.`
                : "No new part numbers projected."}
            </p>
            <p className="mt-2 text-[12px] text-text-3">{plan.note}</p>
          </div>

          <div className="bg-panel">
            <table className="w-full border-collapse whitespace-nowrap text-[13px]">
              <thead>
                <tr className="border-b border-line bg-panel-2 text-left text-text-2">
                  <th className="w-full max-w-0 truncate py-2 pl-4 pr-2 font-normal">
                    Need
                  </th>
                  <th className="px-2 py-2 font-normal">Status</th>
                  <th className="px-2 py-2 font-normal">Matched part</th>
                  <th className="px-2 py-2 text-right font-normal">Best price</th>
                  <th className="py-2 pl-2 pr-4 font-normal">Source</th>
                </tr>
              </thead>
              <tbody>
                {plan.needs.map((n, i) => (
                  <tr
                    key={`${n.need}-${i}`}
                    className="border-b border-line last:border-b-0"
                  >
                    <td
                      className="w-full max-w-0 truncate py-2 pl-4 pr-2 text-text"
                      title={n.need}
                    >
                      {n.need}
                    </td>
                    <td className="px-2 py-2">
                      <Badge tone={TONE[n.status]}>{n.status}</Badge>
                    </td>
                    <td className="px-2 py-2 text-text-2" title={n.rule?.text}>
                      {n.part ?? "—"}
                      {n.rule && (
                        <span className="ml-2 font-mono text-[11px] text-text-3">
                          {n.rule.id}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-text-2">
                      {n.price !== undefined ? px(n.price) : "—"}
                    </td>
                    <td className="py-2 pl-2 pr-4">
                      {n.po ? (
                        <button
                          type="button"
                          onClick={() => onTag(n.po!)}
                          className="font-mono text-[11px] text-text-3 underline-offset-4 transition-colors hover:text-text-2 hover:underline"
                        >
                          [{n.po}]
                        </button>
                      ) : (
                        <span className="text-[12px] text-text-3">no match</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[12px] leading-relaxed text-text-3">
            A match is a suggestion until engineering confirms fit. Blocked and
            new both end in a new part number for this product, which is why
            they carry the same mark. Sample company and sample data.
          </p>
        </>
      )}
    </div>
  );
}
