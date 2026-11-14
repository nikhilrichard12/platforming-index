"use client";

import { useMemo } from "react";
import Badge from "@/components/ui/Badge";
import { UserProfile } from "@/lib/types";
import {
  SurveyFile,
  applyOwnAnswers,
  isSplit,
  minorityFunctions,
} from "@/lib/survey";
import { VoltaraData, findPart, heatColor } from "@/lib/voltaraData";

/** Tint for an answer that differs from the majority, as in the tariff table. */
const MINORITY = heatColor(0);

export default function AlignmentTab({
  data,
  survey,
  profile,
  onTag,
}: {
  data: VoltaraData;
  survey: SurveyFile;
  profile: UserProfile;
  onTag: (po: string) => void;
}) {
  const { questions, you } = useMemo(
    () => applyOwnAnswers(survey, profile),
    [survey, profile]
  );

  const s = data.summary;
  const fan = findPart(data, "axial fan");
  const fanPos = fan.rows.slice(0, 2).map((r) => r.po);

  const evidence: Record<string, React.ReactNode> = {
    variants: `${s.uniqueParts} of ${s.realParts} parts are unique to one product. The other ${s.sharedParts} are shared parts customers never see.`,
    ownership: (
      <>
        {`Six products use six part-numbering schemes. One fan carries ${fan.rows.length} part numbers. `}
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
        <span className="font-mono text-[11px] text-text-3">
          [{survey.benchmark.source}]
        </span>
      </>
    ),
  };

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-text-2">Where the functions disagree</p>

      <div className="bg-panel">
        <div className="flex items-baseline justify-between gap-4 px-4 pb-3 pt-4">
          <h2 className="text-[15px] font-semibold text-text">
            Survey answers by function
          </h2>
          <span className="text-[12px] text-text-3">Three questions</span>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-line bg-panel-2 text-left text-text-2">
              <th className="py-[10px] pl-4 pr-3 font-normal">Question</th>
              {survey.functions.map((f) => (
                <th key={f} className="whitespace-nowrap px-3 py-[10px] font-normal">
                  {f}
                  {f === you && <span className="ml-2 text-text-3">You</span>}
                </th>
              ))}
              <th className="py-[10px] pl-3 pr-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const split = isSplit(q, survey.functions);
              const minority = minorityFunctions(q, survey.functions);
              return (
                <tr key={q.id} className="border-b border-line last:border-b-0">
                  <td className="py-[10px] pl-4 pr-3 text-text">{q.text}</td>
                  {survey.functions.map((f) => (
                    <td
                      key={f}
                      className={`whitespace-nowrap px-3 py-[10px] ${
                        minority.has(f) ? "text-text" : "text-text-2"
                      }`}
                      style={
                        minority.has(f) ? { backgroundColor: MINORITY } : undefined
                      }
                    >
                      {q.answers[f]}
                    </td>
                  ))}
                  <td className="py-[10px] pl-3 pr-4">
                    <Badge tone={split ? "warn" : "positive"}>
                      {split ? "Split" : "Agreed gap"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-panel">
        <div className="px-4 pb-3 pt-4">
          <h2 className="text-[15px] font-semibold text-text">
            Evidence and decisions
          </h2>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-line bg-panel-2 text-left text-text-2">
              <th className="w-[26%] py-[10px] pl-4 pr-3 font-normal">Question</th>
              <th className="px-3 py-[10px] font-normal">What the data shows</th>
              <th className="w-[26%] py-[10px] pl-3 pr-4 font-normal">
                Decision to make
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className="border-b border-line last:border-b-0">
                <td className="py-[10px] pl-4 pr-3 align-top text-text-2">
                  {q.text}
                </td>
                <td className="px-3 py-[10px] align-top leading-relaxed text-text-2">
                  {evidence[q.id]}
                </td>
                <td className="py-[10px] pl-3 pr-4 align-top text-text">
                  {q.decision}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-text-3">
        Survey answers on this screen are sample responses, except the column
        marked You.
      </p>
    </div>
  );
}
