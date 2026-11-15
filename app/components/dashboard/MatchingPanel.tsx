"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Field from "@/components/ui/Field";
import {
  CONFLICT_CAP,
  MatcherEval,
  REVIEW,
  SAME,
  Similarity,
  similarity,
  WEIGHTS,
} from "@/lib/similarity";

/**
 * The answer to "how do you know two part numbers are the same part", shown
 * rather than claimed: the formula, the three thresholds, what it measured
 * when it was graded blind, and a box to try it on any two descriptions.
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

export default function MatchingPanel({ evaluation }: { evaluation: MatcherEval | null }) {
  const [a, setA] = useState(EXAMPLES[0].a);
  const [b, setB] = useState(EXAMPLES[0].b);
  const result = useMemo(() => similarity(a, b), [a, b]);

  return (
    <div className="bg-panel">
      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-[15px] text-text">How we know two parts are the same</p>
          <Badge>Matcher evaluation</Badge>
        </div>
        <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-text-2">
          Two descriptions are compared on three things, in the order an
          engineer checks them. No answer key is involved: the matcher reads
          the parts list only.
        </p>

        <p className="mt-3 font-mono text-[12px] leading-relaxed text-text">
          score = {n2(WEIGHTS.type)} × same kind of thing + {n2(WEIGHTS.specs)} ×
          ratings agree + {n2(WEIGHTS.words)} × rest of the wording
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              tone: "positive" as const,
              head: `${n2(SAME)} and above`,
              body: "Same part. The two part numbers are merged.",
            },
            {
              tone: "warn" as const,
              head: `${n2(REVIEW)} to ${n2(SAME)}`,
              body: "A person decides. Nothing is merged on its own.",
            },
            {
              tone: "neutral" as const,
              head: `Below ${n2(REVIEW)}`,
              body: "Different parts. A different kind of thing scores 0.",
            },
          ].map((t) => (
            <div key={t.head} className="border-t border-line pt-2">
              <Badge tone={t.tone}>{t.head}</Badge>
              <p className="mt-2 text-[12px] leading-snug text-text-2">{t.body}</p>
            </div>
          ))}
        </div>

        {evaluation ? (
          <p className="mt-4 max-w-[80ch] text-[13px] leading-relaxed text-text-2">
            Graded against {evaluation.partNumbers} part numbers whose real
            identity is known, which the matcher never sees: it merged{" "}
            {evaluation.mergedPairs} pairs of part numbers and{" "}
            {evaluation.correctMerges} of them were right
            {evaluation.wrongMerges === 1
              ? ", one was wrong"
              : `, ${evaluation.wrongMerges} were wrong`}
            . It found {evaluation.correctMerges} of the {evaluation.truePairs}{" "}
            pairs it should have, and sent {evaluation.sentToReview} pairs to a
            person rather than guess. That is {evaluation.groupsFound} groups
            where the truth is {evaluation.trueParts} parts.
            <span className="text-text-3">
              {" "}
              Precision {evaluation.pairwisePrecision.toFixed(3)}, recall{" "}
              {evaluation.pairwiseRecall.toFixed(3)}.
            </span>
          </p>
        ) : (
          <p className="mt-4 text-[13px] text-text-3">
            No evaluation on file. Run engine/evaluate_matcher.ts.
          </p>
        )}

        <p className="mt-3 text-[12px] leading-relaxed text-text-3">
          Groups on this dashboard are engineer-confirmed. The matcher
          proposes, a person approves anything under {n2(SAME)}.
        </p>
      </div>

      {/* Try it */}
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-text-2">Try it</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e.label}
                type="button"
                onClick={() => {
                  setA(e.a);
                  setB(e.b);
                }}
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  a === e.a && b === e.b
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
              onChange={(e) => setA(e.target.value)}
              className="w-full bg-transparent py-1 text-[14px] text-text placeholder:text-text-3 focus:outline-none"
            />
          </Field>
          <Field label="Second description" dense>
            <input
              value={b}
              onChange={(e) => setB(e.target.value)}
              className="w-full bg-transparent py-1 text-[14px] text-text placeholder:text-text-3 focus:outline-none"
            />
          </Field>
        </div>

        <div className="mt-4">
          <SimilarityBreakdown a={a} b={b} result={result} />
        </div>
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
