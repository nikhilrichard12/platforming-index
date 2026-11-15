"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import { Button, PrimaryButton } from "@/components/ui/Button";
import { UserProfile } from "@/lib/types";
import {
  ALIGNMENT,
  ALIGNMENT_IDS,
  AlignmentDecision,
  AlignmentQuestionId,
  WEAK_ANSWER,
  applyAlignment,
  costSentence,
  decisionFor,
} from "@/lib/alignment";
import { computeIndex } from "@/lib/index";
import {
  FunctionName,
  SurveyFile,
  SurveyQuestion,
  applyOwnAnswers,
  isSplit,
} from "@/lib/survey";
import { VoltaraData, findPart, usd } from "@/lib/voltaraData";

interface Group {
  answer: string;
  functions: FunctionName[];
}

/** The answers grouped by what was said, largest group first. */
function groupAnswers(q: SurveyQuestion, functions: FunctionName[]): Group[] {
  const by = new Map<string, FunctionName[]>();
  functions.forEach((f) => {
    const a = q.answers[f] ?? "Not answered";
    by.set(a, [...(by.get(a) ?? []), f]);
  });
  return [...by.entries()]
    .map(([answer, fns]) => ({ answer, functions: fns }))
    .sort((a, b) => b.functions.length - a.functions.length);
}

export default function AlignmentTab({
  data,
  survey,
  profile,
  alignment,
  onDecide,
  onUndo,
  onAsk,
  onJump,
  onTag,
  onReset,
}: {
  data: VoltaraData;
  survey: SurveyFile;
  profile: UserProfile;
  alignment: AlignmentDecision[];
  onDecide: (question: AlignmentQuestionId, choice: string) => void;
  onUndo: (question: AlignmentQuestionId) => void;
  onAsk: (question: string) => void;
  onJump: (filter: "review" | "shared" | "core") => void;
  onTag: (po: string) => void;
  onReset: () => void;
}) {
  const [picking, setPicking] = useState<AlignmentQuestionId | null>(null);
  const [choice, setChoice] = useState("");

  // The reader's own column first, then what leadership has decided: a
  // settled question is no longer a disagreement, whoever is looking.
  const { questions, you } = useMemo(() => {
    const own = applyOwnAnswers(survey, profile);
    const aligned = applyAlignment({ ...survey, questions: own.questions }, alignment);
    return { questions: aligned.questions, you: own.you };
  }, [survey, profile, alignment]);

  const s = data.summary;
  const fan = findPart(data, "axial fan");
  const fanPos = fan.rows.slice(0, 2).map((r) => r.po);

  /* The score as it stands, and the score if these questions were settled. */
  const now = computeIndex(data, applyAlignment(survey, alignment), []);
  const settled = computeIndex(
    data,
    applyAlignment(survey, [
      ...alignment,
      {
        id: "what-if-owner",
        at: "",
        question: "ownership",
        choice: "Engineering",
        source: "dashboard",
      },
      {
        id: "what-if-target",
        at: "",
        question: "measured",
        choice: ALIGNMENT.measured.options[0],
        source: "dashboard",
      },
    ]),
    []
  );

  const splits = questions.filter((q) => isSplit(q, survey.functions)).length;
  const ownership = now.dimensions[1];
  const incentives = now.dimensions[2];

  const evidence: Record<string, React.ReactNode> = {
    variants: `${s.uniqueParts} of ${s.realParts} parts are unique to one product. The other ${s.sharedParts} are shared parts customers never see.`,
    ownership: (
      <>
        {`Six products use six part numbering schemes. One fan carries ${fan.rows.length} part numbers. `}
        {fanPos.map((po) => (
          <button
            key={po}
            type="button"
            onClick={() => onTag(po)}
            className="mr-1 rounded-field border border-line-2 px-[6px] py-px font-mono text-[11px] text-text-2 transition-colors hover:border-text-2 hover:text-text"
          >
            {po}
          </button>
        ))}
      </>
    ),
    measured: (
      <>
        {"Nobody reports a target. "}
        {survey.benchmark.text}{" "}
        <span className="whitespace-nowrap rounded-field bg-panel-2 px-[6px] py-px text-[11px] text-text-3">
          Kearney survey, 2026
        </span>
      </>
    ),
  };

  function save(id: AlignmentQuestionId) {
    if (!choice) return;
    onDecide(id, choice);
    setPicking(null);
    setChoice("");
  }

  return (
    <div className="space-y-5">
      {/* What a leader should see first */}
      <div className="bg-panel p-6">
        <p className="text-[26px] font-light leading-tight text-text">
          Leadership disagrees on {splits} of {questions.length} questions.
        </p>
        <p className="mt-2 text-[15px] text-text-2">
          Platforming stalls here before it reaches a single part.
        </p>
        <p className="mt-4 text-[13px] text-text-2">
          Two of the four index scores come from these answers:{" "}
          {ownership.name} {ownership.score}, {incentives.name} {incentives.score}.
        </p>

        {settled.score > now.score ? (
          <>
            <p className="mt-4 text-[13px] text-text-2">
              If all five leaders agreed on an owner and a complexity target, the
              index would read {settled.score} instead of {now.score}, without
              changing a single part.
            </p>
            <div className="mt-3 flex items-baseline gap-4">
              <span className="text-[34px] font-light leading-none tabular-nums text-text">
                {now.score}
              </span>
              <svg
                viewBox="0 0 40 16"
                className="h-4 w-10 shrink-0 text-text-2"
                aria-hidden
              >
                <path
                  d="M0 8h34M28 2l6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <span className="text-[34px] font-light leading-none tabular-nums text-positive">
                {settled.score}
              </span>
            </div>
          </>
        ) : (
          <p className="mt-4 text-[13px] text-text-2">
            Both answers are settled. The index reads{" "}
            <span className="text-positive">{now.score}</span>, and no part
            changed to get there.
          </p>
        )}
      </div>

      {/* One card per question */}
      {ALIGNMENT_IDS.map((id) => {
        const q = questions.find((x) => x.id === id);
        if (!q) return null;
        const cfg = ALIGNMENT[id];
        const groups = groupAnswers(q, survey.functions);
        const split = isSplit(q, survey.functions);
        const decided = decisionFor(alignment, id);

        if (decided) {
          return (
            <div key={id} className="bg-panel p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-[15px] text-text">{q.text}</p>
                <Badge tone="positive">Decided</Badge>
              </div>
              <p className="mt-2 text-[13px] text-text-2">
                {decided.choice}
                <span className="ml-2 text-text-3">
                  {decided.at.slice(0, 10)}
                </span>
                <button
                  type="button"
                  onClick={() => onUndo(id)}
                  className="ml-3 text-[13px] text-text-3 underline-offset-4 transition-colors hover:text-text hover:underline"
                >
                  Undo
                </button>
              </p>
            </div>
          );
        }

        return (
          <div key={id} className="bg-panel p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-text">{q.text}</h2>
              <div className="flex items-baseline gap-3">
                <Badge tone={split ? "risk" : "warn"}>
                  {split ? "Split" : "Agreed gap"}
                </Badge>
                <span className="text-[12px] text-text-3">
                  {split
                    ? `${groups.length} different answers from ${survey.functions.length} leaders`
                    : `All ${survey.functions.length} leaders say the same thing`}
                </span>
              </div>
            </div>

            {/* Grouped by what was said, not by who said it */}
            <div className="mt-4 space-y-2">
              {groups.map((g) => (
                <div
                  key={g.answer}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-2 py-1 ${
                    WEAK_ANSWER.test(g.answer) ? "border-l-2 border-risk pl-3" : "pl-[14px]"
                  }`}
                >
                  <span className="text-[14px] text-text">{g.answer}</span>
                  {g.functions.map((f) => (
                    <span
                      key={f}
                      className="rounded-field border border-line bg-panel-2 px-2 py-[3px] text-[11px] text-text-2"
                    >
                      {f}
                      {f === you && <span className="ml-1 text-text">You</span>}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[13px] leading-relaxed text-text-2">
                <span className="text-text-3">What the data shows. </span>
                {evidence[id]}
              </p>
              <p className="text-[13px] leading-relaxed text-text-2">
                <span className="text-text-3">What it costs. </span>
                {costSentence(id, s, usd)}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <PrimaryButton
                onClick={() => {
                  setPicking(picking === id ? null : id);
                  setChoice("");
                }}
              >
                {cfg.action}
              </PrimaryButton>
              <Button onClick={() => onAsk(cfg.brief)}>
                Draft the brief for leadership
              </Button>
              <Button onClick={() => onJump(cfg.filter)}>
                See the parts behind this
              </Button>
            </div>

            {picking === id && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-[13px] text-text-2">{cfg.prompt}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cfg.options.map((o) => (
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
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button onClick={() => save(id)} disabled={!choice}>
                    Record the decision
                  </Button>
                  <span className="text-[12px] text-text-3">
                    This changes what the index reads. No part changes.
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[12px] text-text-3">
        Survey answers on this screen are sample responses, except the column
        marked You.{" "}
        <button
          type="button"
          onClick={onReset}
          className="underline-offset-4 transition-colors hover:text-text-2 hover:underline"
        >
          Reset demo data
        </button>
      </p>
    </div>
  );
}
