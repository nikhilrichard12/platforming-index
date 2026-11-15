"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import { Button, PrimaryButton } from "@/components/ui/Button";
import { FUNCTION_ICON } from "@/components/ui/FunctionIcons";
import OrbitView from "./OrbitView";
import { UserProfile } from "@/lib/types";
import {
  ALIGNMENT,
  ALIGNMENT_IDS,
  AlignmentDecision,
  AlignmentQuestionId,
  WEAK_ANSWER,
  applyAlignment,
  computeRings,
  decisionFor,
  nextDecisionFor,
} from "@/lib/alignment";
import { computeIndex } from "@/lib/index";
import { FUNCTION_IDENTITY, FUNCTIONS } from "@/lib/roles";
import { FunctionName, SurveyFile, SurveyQuestion, applyOwnAnswers } from "@/lib/survey";
import { VoltaraData } from "@/lib/voltaraData";

/** The answer most of the group gave, for the side by side in the detail card. */
function groupAnswer(q: SurveyQuestion, functions: FunctionName[]): string {
  const counts = new Map<string, number>();
  functions.forEach((f) => {
    const a = q.answers[f] ?? "";
    counts.set(a, (counts.get(a) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

/** How many functions gave each answer, largest first. */
function split(q: SurveyQuestion, functions: FunctionName[]) {
  const counts = new Map<string, number>();
  functions.forEach((f) => {
    const a = q.answers[f] ?? "";
    counts.set(a, (counts.get(a) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([answer, count]) => ({ answer, count }))
    .sort((a, b) => b.count - a.count);
}

export default function AlignmentTab({
  data,
  survey,
  profile,
  alignment,
  onDecide,
  onUndo,
  onAsk,
  onReset,
}: {
  data: VoltaraData;
  survey: SurveyFile;
  profile: UserProfile;
  alignment: AlignmentDecision[];
  onDecide: (question: AlignmentQuestionId, choice: string) => void;
  onUndo: (question: AlignmentQuestionId) => void;
  onAsk: (question: string) => void;
  onReset: () => void;
}) {
  const [selected, setSelected] = useState<FunctionName | null>(null);
  const [picking, setPicking] = useState<AlignmentQuestionId | null>(null);
  const [choice, setChoice] = useState("");
  const [row, setRow] = useState<AlignmentQuestionId | null>(null);

  const decided: AlignmentQuestionId[] = alignment.map((d) => d.question);
  const decidedKey = decided.join(",");

  const { questions, you } = useMemo(() => {
    const own = applyOwnAnswers(survey, profile);
    const aligned = applyAlignment({ ...survey, questions: own.questions }, alignment);
    return { questions: aligned.questions, you: own.you };
  }, [survey, profile, alignment]);

  const rings = useMemo(
    () => computeRings(questions, FUNCTIONS, decidedKey ? decidedKey.split(",") : []),
    [questions, decidedKey]
  );

  /** The picker currently open, if any. */
  const open: AlignmentQuestionId | null = picking;

  const base = computeIndex(data, survey, []);
  const now = computeIndex(data, applyAlignment(survey, alignment), []);
  const apartCount = FUNCTIONS.filter((f) => (rings[f]?.ring ?? 0) > 0).length;
  const openQuestions = questions.filter(
    (q) => !decided.includes(q.id as AlignmentQuestionId)
  );
  const splitCount = openQuestions.filter(
    (q) => split(q, FUNCTIONS).length > 1 || WEAK_ANSWER.test(groupAnswer(q, FUNCTIONS))
  ).length;

  /** Which planets to pick out when a row on the table is chosen. */
  const highlight = row
    ? FUNCTIONS.filter((f) => rings[f]?.apart.includes(row))
    : null;

  const detail = selected ? FUNCTION_IDENTITY[selected] : null;
  const detailRing = selected ? rings[selected] : null;
  const next = detailRing ? nextDecisionFor(detailRing.apart, decided) : null;
  const Icon = selected ? FUNCTION_ICON[selected] : null;

  function save(id: AlignmentQuestionId) {
    if (!choice) return;
    onDecide(id, choice);
    setPicking(null);
    setChoice("");
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[26px] font-light leading-tight text-text">
          Leadership disagrees on {splitCount} of {questions.length} questions.
        </p>
        <p className="mt-2 text-[15px] text-text-2">
          The further a function sits from the center, the further it is from
          the group.
        </p>
      </div>

      {/* The orbit, and whoever is selected beside it */}
      <div
        className={`grid grid-cols-1 gap-5 ${
          selected ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""
        }`}
      >
        <div className="bg-panel p-4">
          <OrbitView
            score={now.score}
            rings={rings}
            you={you}
            selected={selected}
            highlight={highlight}
            onSelect={(f) => {
              setSelected(selected === f ? null : f);
              setPicking(null);
            }}
          />
          <p className="mt-1 text-[12px] text-text-3">
            {now.score > base.score
              ? `Index ${base.score} to ${now.score}. No part changed.`
              : `${apartCount} of ${FUNCTIONS.length} functions sit off the center ring.`}{" "}
            <button
              type="button"
              onClick={onReset}
              className="underline-offset-4 transition-colors hover:text-text-2 hover:underline"
            >
              Reset demo data
            </button>
          </p>
        </div>

        {detail && detailRing && Icon && (
          <div className="bg-panel p-5">
            <div className="flex items-center gap-2 text-text-2">
              <Icon size={18} />
              <h2 className="text-[15px] font-semibold text-text">{selected}</h2>
            </div>
            <p className="mt-2 text-[13px] text-text-2">
              {detailRing.ring === 0
                ? `${selected} sits with the group on all ${questions.length} questions.`
                : `${selected} disagrees with the group on ${detailRing.ring} of ${questions.length} questions.`}
            </p>

            <div className="mt-4">
              <p className="text-[12px] text-text-3">What this costs {selected}</p>
              <p className="mt-1 text-[26px] font-light leading-none text-text">
                {detail.figure(data, now.score).value}
              </p>
              <p className="mt-1 text-[12px] text-text-3">
                {detail.unit} · {detail.figure(data, now.score).source}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {questions.map((q) => {
                const theirs = q.answers[selected as FunctionName] ?? "";
                const group = groupAnswer(q, FUNCTIONS);
                const apart = detailRing.apart.includes(q.id);
                return (
                  <div
                    key={q.id}
                    className={apart ? "border-l-2 border-risk pl-3" : "pl-[14px]"}
                  >
                    <p className="text-[12px] text-text-3">{q.text}</p>
                    <p className="text-[13px] text-text">
                      {theirs}
                      <span className="text-text-3"> · group says {group}</span>
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-[13px] text-text-2">
              <span className="text-text-3">What would bring {selected} in. </span>
              {next
                ? ALIGNMENT[next].action
                : "Nothing is open. They are already with the group."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {next && (
                <PrimaryButton
                  onClick={() => {
                    setPicking(picking === next ? null : next);
                    setChoice("");
                  }}
                >
                  {ALIGNMENT[next].action}
                </PrimaryButton>
              )}
              <Button
                onClick={() =>
                  onAsk(
                    `Draft a five sentence brief for ${selected} on ${
                      next ? ALIGNMENT[next].action.toLowerCase() : "staying aligned"
                    } at Voltara. Write it in ${detail.unit}.`
                  )
                }
              >
                Draft the brief for {selected}
              </Button>
            </div>

            {open && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-[13px] text-text-2">{ALIGNMENT[open].prompt}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ALIGNMENT[open].options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={choice === o}
                      onClick={() => setChoice(o)}
                      className={`rounded-field border px-3 py-[7px] text-[13px] transition-colors ${
                        choice === o
                          ? "border-text bg-transparent text-text"
                          : "border-line bg-panel-2 text-text-2 hover:border-line-2 hover:text-text"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <Button onClick={() => save(open)} disabled={!choice}>
                    Record the decision
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* The three questions, compact */}
      <div className="bg-panel">
        <div className="flex items-baseline justify-between gap-4 px-4 pb-3 pt-4">
          <h2 className="text-[15px] font-semibold text-text">The three questions</h2>
          <span className="text-[12px] text-text-3">
            Click a row to pick out who disagrees
          </span>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-line bg-panel-2 text-left text-text-2">
              <th className="w-[34%] py-2 pl-4 pr-3 font-normal">Question</th>
              <th className="px-3 py-2 font-normal">Who said what</th>
              <th className="w-[130px] py-2 pl-3 pr-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {ALIGNMENT_IDS.map((id) => {
              const q = questions.find((x) => x.id === id);
              if (!q) return null;
              const groups = split(q, FUNCTIONS);
              const done = decisionFor(alignment, id);
              return (
                <tr
                  key={id}
                  onClick={() => setRow(row === id ? null : id)}
                  className={`cursor-pointer border-b border-line transition-colors last:border-b-0 hover:bg-panel-2 ${
                    row === id ? "bg-panel-2" : ""
                  }`}
                >
                  <td className="py-3 pl-4 pr-3 align-top text-text">{q.text}</td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex h-[10px] w-full">
                      {groups.map((g, i) => (
                        <span
                          key={g.answer}
                          title={`${g.answer}: ${g.count}`}
                          className={
                            WEAK_ANSWER.test(g.answer)
                              ? "bg-risk"
                              : i === 0
                              ? "bg-text-2"
                              : "bg-line-2"
                          }
                          style={{
                            width: `${(g.count / FUNCTIONS.length) * 100}%`,
                            marginRight: i < groups.length - 1 ? 2 : 0,
                          }}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-[12px] text-text-3">
                      {groups.map((g) => `${g.answer} ${g.count}`).join(" · ")}
                    </p>
                  </td>
                  <td className="py-3 pl-3 pr-4 align-top">
                    {done ? (
                      <div className="space-y-1">
                        <Badge tone="positive">Decided</Badge>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUndo(id);
                          }}
                          className="block text-[12px] text-text-3 underline-offset-4 transition-colors hover:text-text hover:underline"
                        >
                          Undo
                        </button>
                      </div>
                    ) : (
                      <Badge tone="risk">Split</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-text-3">
        Survey answers on this screen are sample responses, except the function
        marked You.
      </p>
    </div>
  );
}
