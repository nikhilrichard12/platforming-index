"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Field from "@/components/ui/Field";
import Tile from "@/components/ui/Tile";
import { Button, PrimaryButton } from "@/components/ui/Button";
import { getRoleConfig, shortRole } from "@/lib/roles";
import { UserProfile } from "@/lib/types";
import { rate, usd } from "@/lib/voltaraData";
import {
  ASSUMPTIONS,
  BallparkAnswers,
  POINTS,
  Range,
  STEP_LABELS,
  ballpark,
} from "@/lib/ballpark";

const num = (n: number) => n.toLocaleString("en-US");
const range = (r: Range) => `${num(r.low)} to ${num(r.high)}`;
const money = (r: Range) => `${usd(r.low)} to ${usd(r.high)}`;

/** Every constant the figures rest on, printed where the figures are. */
function Assumptions({ costEach }: { costEach: number }) {
  const rows: [string, string, string][] = [
    [
      "Starting duplicate share",
      `${Math.round(ASSUMPTIONS.baseDuplicateShare.value * 100)} percent`,
      ASSUMPTIONS.baseDuplicateShare.source,
    ],
    [
      "Each acquisition band, aligned partly",
      `plus ${Math.round(ASSUMPTIONS.acquisitionPenaltyPartly.value * 100)} percent`,
      ASSUMPTIONS.acquisitionPenaltyPartly.source,
    ],
    [
      "Each acquisition band, not aligned",
      `plus ${Math.round(ASSUMPTIONS.acquisitionPenaltyNo.value * 100)} percent`,
      ASSUMPTIONS.acquisitionPenaltyNo.source,
    ],
    [
      "Platforming underway or running",
      `minus ${Math.round(ASSUMPTIONS.platformingCredit.value * 100)} percent`,
      ASSUMPTIONS.platformingCredit.source,
    ],
    [
      "Floor and cap on the share",
      `${Math.round(ASSUMPTIONS.shareFloor.value * 100)} to ${Math.round(
        ASSUMPTIONS.shareCap.value * 100
      )} percent`,
      ASSUMPTIONS.shareFloor.source,
    ],
    [
      "Cost of carrying one part number for a year",
      rate(costEach),
      ASSUMPTIONS.costPerPartNumberPerYear.source,
    ],
    [
      "Range on every figure",
      `plus and minus ${Math.round(ASSUMPTIONS.rangeSpread.value * 100)} percent`,
      ASSUMPTIONS.rangeSpread.source,
    ],
  ];

  return (
    <table className="mt-4 w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-y border-line bg-panel-2 text-left text-text-2">
          <th className="py-2 pl-4 pr-2 font-normal">Assumption</th>
          <th className="px-2 py-2 font-normal">Value</th>
          <th className="w-full max-w-0 py-2 pl-2 pr-4 font-normal">Where it comes from</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, value, source]) => (
          <tr key={name} className="border-b border-line last:border-b-0">
            <td className="whitespace-nowrap py-2 pl-4 pr-2 text-text">{name}</td>
            <td className="whitespace-nowrap px-2 py-2 tabular-nums text-text-2">
              {value}
            </td>
            <td className="w-full max-w-0 py-2 pl-2 pr-4 text-text-3">{source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function BallparkResult({
  answers,
  profile,
  onCost,
}: {
  answers: BallparkAnswers;
  profile: UserProfile;
  /** The reader edits the cost in place and the figures follow. */
  onCost: (value: number) => void;
}) {
  const router = useRouter();
  // Demo only. The file is never read, sent or kept: only its name is shown.
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [open, setOpen] = useState(false);
  const b = ballpark(answers, profile);
  const role = profile.role || "CEO";
  const why = getRoleConfig(role).ballparkWhy;
  const step = STEP_LABELS[b.step - 1];

  return (
    <section className="space-y-5 pt-8">
      {/* The score */}
      <div className="bg-panel p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[56px] font-light leading-none tabular-nums text-text">
              {b.score}
            </span>
            <span className="text-[13px] text-text-3">of 100</span>
          </div>
          <Badge tone="warn">Ballpark</Badge>
        </div>
        <p className="mt-3 text-[13px] text-text-2">
          Likely between {b.scoreRange.low} and {b.scoreRange.high}.
        </p>
        <p className="mt-1 text-[13px] text-text-3">
          From 8 answers. Not measured yet.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 xl:grid-cols-4">
          {b.dimensions.map((d) => (
            <div key={d.name} title={d.basis}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12px] text-text-2">{d.name}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-text-3">
                  {d.score}
                </span>
              </div>
              <div className="mt-1 h-[3px] w-full bg-line">
                <div className="h-full bg-text-2" style={{ width: `${d.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The three figures */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          {
            label: "Duplicate part numbers",
            value: num(b.duplicatePartNumbers),
            band: `Likely ${range(b.duplicateRange)}`,
            sub: `About ${Math.round(b.share.share * 100)} percent of ${num(
              answers.partNumbers ?? 0
            )}`,
          },
          {
            label: "Yearly cost of carrying them",
            value: usd(b.yearlyCarryingCost),
            band: `Likely ${money(b.costRange)}`,
            sub: `At ${rate(b.costEach)} per part number per year`,
          },
          {
            label: "Where this puts you",
            value: `Step ${b.step}`,
            band: step,
            sub: "On the three step path",
          },
        ].map((t) => (
          <Tile key={t.label}>
            <div className="flex h-full min-h-[118px] flex-col justify-between gap-4">
              <p className="text-[14px] font-semibold leading-snug text-text">
                {t.label}
              </p>
              <div className="text-right">
                <p
                  className={`font-light leading-none text-text ${
                    t.value.length > 14 ? "text-[22px]" : "text-[30px]"
                  }`}
                >
                  {t.value}
                </p>
                <p className="mt-2 text-[12px] text-text-3">{t.band}</p>
                <p className="text-[12px] text-text-3">{t.sub}</p>
              </div>
            </div>
          </Tile>
        ))}
      </div>

      {/* Why it matters to this reader */}
      <p className="text-[15px] leading-relaxed text-text-2">
        <span className="text-text">{shortRole(role)}.</span> {why}
      </p>

      {/* How we got this */}
      <div className="bg-panel">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-baseline justify-between gap-4 px-5 py-4 text-left"
        >
          <span className="text-[15px] font-semibold text-text">How we got this</span>
          <span className="text-[13px] text-text-3">{open ? "Hide" : "Show"}</span>
        </button>

        {open && (
          <div className="border-t border-line px-5 pb-5 pt-4">
            <pre className="whitespace-pre-wrap bg-surface p-4 font-mono text-[12px] leading-relaxed text-text-2">
{`duplicate share
  ${b.share.base}  starting share
  ${b.share.bands > 0 && b.share.penaltyEach > 0 ? `+ ${b.share.bands} x ${b.share.penaltyEach}  ${answers.acquisitions} acquisitions, aligned ${answers.alignment}` : `+ 0  ${answers.acquisitions || "no"} acquisitions, aligned ${answers.alignment || "not answered"}`}
  ${b.share.credit > 0 ? `- ${b.share.credit}  platforming ${answers.platforming}` : `- 0  platforming ${answers.platforming || "not answered"}`}
  = ${b.share.share.toFixed(2)}${b.share.clamped ? "  (held inside the floor and cap)" : ""}

duplicate part numbers
  ${num(answers.partNumbers ?? 0)} part numbers x ${b.share.share.toFixed(2)} = ${num(b.duplicatePartNumbers)}

yearly cost of carrying them
  ${num(b.duplicatePartNumbers)} x ${rate(b.costEach)} = ${usd(b.yearlyCarryingCost)}

range
  every figure above, minus and plus ${Math.round(ASSUMPTIONS.rangeSpread.value * 100)} percent

score
  ${b.dimensions.map((d) => `${d.score}  ${d.name}`).join("\n  ")}
  average = ${b.score}, shown as ${b.scoreRange.low} to ${b.scoreRange.high}`}
            </pre>

            <div className="mt-4 max-w-[380px]">
              <Field label="Cost of carrying one part number per year" dense>
                <input
                  type="number"
                  min={1}
                  value={b.costEach}
                  onChange={(e) => onCost(Number(e.target.value) || 0)}
                  className="w-full bg-transparent py-1 text-[14px] tabular-nums text-text focus:outline-none"
                />
              </Field>
              <p className="mt-2 text-[12px] text-text-3">
                Edit this and the figures above follow. The measured index uses
                your own purchase history instead.
              </p>
            </div>

            <Assumptions costEach={b.costEach} />

            <p className="mt-4 text-[12px] leading-relaxed text-text-3">
              Point tables: platforming {JSON.stringify(POINTS.platforming)}, alignment{" "}
              {JSON.stringify(POINTS.alignment)}, part number owner{" "}
              {JSON.stringify(POINTS.partNumberOwner)}, complexity target{" "}
              {JSON.stringify(POINTS.complexityTarget)}.
            </p>
          </div>
        )}
      </div>

      {/* What to do next */}
      <div className="flex flex-wrap items-center gap-6 pt-2">
        <div>
          <PrimaryButton onClick={() => router.push("/build")}>
            Get the measured index
          </PrimaryButton>
          <p className="mt-2 text-[12px] text-text-3">
            Upload a parts list and purchase history. About 10 minutes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.pdf"
            hidden
            onChange={(e) => {
              setFileName(e.target.files?.[0]?.name ?? "");
              // Clear it, so choosing the same file again still counts as a choice.
              e.target.value = "";
            }}
          />
          <Button onClick={() => fileInput.current?.click()}>
            {fileName ? "Choose a different file" : "Upload a CSV or PDF"}
          </Button>
          {fileName && (
            <span className="max-w-[220px] truncate text-[13px] text-text-2" title={fileName}>
              {fileName}
            </span>
          )}
          <Button onClick={() => router.push("/dashboard")}>Continue to measured index</Button>
          <p className="text-[12px] text-text-3">
            Demo upload. Your file won&apos;t be analyzed; the dashboard uses sample data.
          </p>
        </div>
      </div>
    </section>
  );
}
