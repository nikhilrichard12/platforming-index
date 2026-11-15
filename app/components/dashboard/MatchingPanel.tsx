"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Field from "@/components/ui/Field";
import MatchExplainer, { Pair } from "./MatchExplainer";
import { Grouping } from "@/lib/grouping";
import {
  CONFLICT_CAP,
  MatcherEval,
  SAME,
  Similarity,
  similarity,
} from "@/lib/similarity";
import { VoltaraData } from "@/lib/voltaraData";

/**
 * The answer to "how do you know two part numbers are the same part", shown
 * rather than claimed: the comparison animated on real rows, and a box that
 * runs the same animation on any two descriptions a reader types.
 */

const n2 = (v: number) => v.toFixed(2);

/** A worked pair the reader can load into the box with one click. */
const EXAMPLES: { label: string; a: string; b: string }[] = [
  {
    label: "A true match",
    a: "Axial Fan 120mm 24VDC",
    b: "fan axial 120mm 24vdc",
  },
  {
    label: "A near miss",
    a: "Axial Fan 120mm 24VDC",
    b: "Axial Fan 80mm 24VDC",
  },
  {
    label: "A different kind of thing",
    a: "Axial Fan 120mm",
    b: "Wire Fan Guard 120mm",
  },
];

const VERDICT_TONE = {
  same: "positive",
  review: "warn",
  different: "neutral",
} as const;

const VERDICT_WORD = {
  same: "Same part",
  review: "Send to a person",
  different: "Different parts",
};

export default function MatchingPanel({
  data,
  evaluation,
  grouping,
  onOpenPart,
}: {
  data: VoltaraData;
  evaluation: MatcherEval | null;
  grouping: Grouping;
  onOpenPart?: (partId: string) => void;
}) {
  const [a, setA] = useState(EXAMPLES[0].a);
  const [b, setB] = useState(EXAMPLES[0].b);
  /** Null until the reader changes something: the examples play until then. */
  const [typed, setTyped] = useState<Pair | null>(null);
  const result = useMemo(() => similarity(a, b), [a, b]);

  // The stage reruns on the reader's own words, a moment after they stop
  // typing, so every keystroke does not restart the animation.
  useEffect(() => {
    if (typed === null) return;
    const t = setTimeout(
      () =>
        setTyped({
          id: "typed",
          label: "Your two descriptions",
          a: { desc: a, product: "Typed here" },
          b: { desc: b, product: "Typed here" },
        }),
      450
    );
    return () => clearTimeout(t);
    // typed is the switch, not an input: including it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b]);

  return (
    <div className="space-y-5">
      <MatchExplainer
        data={data}
        evaluation={evaluation}
        grouping={grouping}
        pair={typed}
        onOpenPart={onOpenPart}
      />

      <div className="bg-panel px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <p className="text-[13px] text-text-2">Try it</p>
            {typed && (
              <button
                type="button"
                onClick={() => setTyped(null)}
                className="text-[12px] text-text-3 underline-offset-4 transition-colors hover:text-text hover:underline"
              >
                Back to the examples
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e.label}
                type="button"
                onClick={() => {
                  setA(e.a);
                  setB(e.b);
                  setTyped({
                    id: "typed",
                    label: "Your two descriptions",
                    a: { desc: e.a, product: "Typed here" },
                    b: { desc: e.b, product: "Typed here" },
                  });
                }}
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  typed && a === e.a && b === e.b
                    ? "border-text text-text"
                    : "border-line-2 text-text-2 hover:border-text-2 hover:text-text"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="First description" dense>
            <input
              value={a}
              onChange={(e) => {
                setA(e.target.value);
                setTyped((t) => t ?? { id: "typed", label: "Your two descriptions", a: { desc: e.target.value }, b: { desc: b } });
              }}
              className="w-full bg-transparent py-1 text-[14px] text-text placeholder:text-text-3 focus:outline-none"
            />
          </Field>
          <Field label="Second description" dense>
            <input
              value={b}
              onChange={(e) => {
                setB(e.target.value);
                setTyped((t) => t ?? { id: "typed", label: "Your two descriptions", a: { desc: a }, b: { desc: e.target.value } });
              }}
              className="w-full bg-transparent py-1 text-[14px] text-text placeholder:text-text-3 focus:outline-none"
            />
          </Field>
        </div>

        <div className="mt-4">
          <SimilarityBreakdown a={a} b={b} result={result} />
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-text-3">
          Groups on this dashboard are engineer-confirmed. The matcher
          proposes, a person approves anything under {n2(SAME)}.{" "}
          <span className="whitespace-nowrap">
            <Badge>Matcher evaluation</Badge>
          </span>
        </p>
      </div>
    </div>
  );
}

/**
 * Two descriptions lined up: what each one is, which ratings agree, and the
 * three weighted lines that add to the score.
 */
export function SimilarityBreakdown({
  a,
  b,
  result,
}: {
  a: string;
  b: string;
  result: Similarity;
}) {
  const { parsedA, parsedB, checks, terms } = result;
  const sum = terms.reduce((n, t) => n + t.contribution, 0);

  return (
    <div className="bg-surface">
      <table className="w-full border-collapse text-[13px]">
        <tbody>
          <tr className="border-b border-line">
            <td className="w-[110px] py-2 pl-3 pr-3 align-top text-[12px] text-text-3">
              Description
            </td>
            <td className="w-1/2 py-2 pr-3 align-top text-text">{a || "—"}</td>
            <td className="w-1/2 py-2 pr-3 align-top text-text">{b || "—"}</td>
            <td className="w-[40px] py-2 pr-3" />
          </tr>
          <tr className="border-b border-line">
            <td className="py-2 pl-3 pr-3 align-top text-[12px] text-text-3">
              Kind of thing
            </td>
            <td className="py-2 pr-3 align-top text-text-2">
              {parsedA.type || "not stated"}
            </td>
            <td className="py-2 pr-3 align-top text-text-2">
              {parsedB.type || "not stated"}
            </td>
            <td className="py-2 pr-3 align-top text-right">
              <Mark ok={result.type === 1} />
            </td>
          </tr>
          {checks.length === 0 && (
            <tr className="border-b border-line">
              <td className="py-2 pl-3 pr-3 align-top text-[12px] text-text-3">
                Ratings
              </td>
              <td colSpan={3} className="py-2 pr-3 text-text-3">
                Neither description carries a rating.
              </td>
            </tr>
          )}
          {checks.map((c) => (
            <tr key={c.unit} className="border-b border-line">
              <td className="py-2 pl-3 pr-3 align-top font-mono text-[12px] text-text-3">
                {c.unit}
              </td>
              <td className="py-2 pr-3 align-top tabular-nums text-text-2">
                {c.a ?? "not stated"}
              </td>
              <td className="py-2 pr-3 align-top tabular-nums text-text-2">
                {c.b ?? "not stated"}
              </td>
              <td className="py-2 pr-3 align-top text-right">
                {c.a === null || c.b === null ? (
                  <span className="text-[12px] text-text-3">—</span>
                ) : (
                  <Mark ok={c.agrees} />
                )}
              </td>
            </tr>
          ))}
          <tr className="border-b border-line">
            <td className="py-2 pl-3 pr-3 align-top text-[12px] text-text-3">
              Rest of the wording
            </td>
            <td className="py-2 pr-3 align-top text-text-2">
              {parsedA.words.join(", ") || "nothing left"}
            </td>
            <td className="py-2 pr-3 align-top text-text-2">
              {parsedB.words.join(", ") || "nothing left"}
            </td>
            <td className="py-2 pr-3 align-top text-right tabular-nums text-text-3">
              {n2(result.words)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-line px-3 py-3">
        {terms.map((t) => (
          <div
            key={t.label}
            className="flex items-baseline justify-between gap-4 py-[3px]"
          >
            <span className="font-mono text-[12px] text-text-2">
              {n2(t.weight)} × {n2(t.value)}
            </span>
            <span className="flex-1 text-[12px] text-text-3">{t.label}</span>
            <span className="tabular-nums text-[12px] text-text-2">
              {n2(t.contribution)}
            </span>
          </div>
        ))}
        {result.override && (
          <p className="mt-1 text-[12px] text-text-3">
            {sum !== result.score ? `${n2(sum)}, then ` : ""}
            {result.override}.
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-4 border-t border-line pt-2">
          <span className="text-[13px] text-text">Score</span>
          <span className="flex items-center gap-3">
            <span className="text-[17px] font-light tabular-nums text-text">
              {n2(result.score)}
            </span>
            <Badge tone={VERDICT_TONE[result.verdict]}>
              {VERDICT_WORD[result.verdict]}
            </Badge>
          </span>
        </div>
        {result.verdict === "review" && result.score < SAME && (
          <p className="mt-2 text-[12px] text-text-3">
            Under {n2(SAME)}, so nothing merges until a person says so.
          </p>
        )}
        {result.score === CONFLICT_CAP && (
          <p className="mt-2 text-[12px] text-text-3">
            One rating that disagrees holds the whole comparison back.
          </p>
        )}
      </div>
    </div>
  );
}

function Mark({ ok }: { ok: boolean }) {
  return (
    <span
      className={`text-[13px] ${ok ? "text-positive" : "text-text-3"}`}
      aria-label={ok ? "agrees" : "does not agree"}
    >
      {ok ? "✓" : "✕"}
    </span>
  );
}
