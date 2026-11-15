"use client";

import { useState, useEffect } from "react";
import {
  UserProfile,
  EMPTY_PROFILE,
  ROLES,
  METRICS,
  Role,
  DecisionLevel,
  Metric,
  ArchitectureOwner,
  PlatformingBlocker,
} from "@/lib/types";
import {
  ACQUISITION_BANDS,
  ALIGNMENT_ANSWERS,
  AcquisitionBand,
  AlignmentAnswer,
  BallparkAnswers,
  EMPTY_BALLPARK,
  OWNER_ANSWERS,
  OwnerAnswer,
  PART_NUMBER_BANDS,
  PLATFORMING_ANSWERS,
  PlatformingAnswer,
  REVENUE_BANDS,
  RevenueBand,
  TARGET_ANSWERS,
  TargetAnswer,
  isComplete,
} from "@/lib/ballpark";
import { saveProfile, loadProfile, saveBallpark, loadBallpark } from "@/lib/profile";
import { shortRole } from "@/lib/roles";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import Field from "@/components/ui/Field";
import ChoiceGroup, { Choice } from "@/components/ui/ChoiceGroup";
import { Button, PrimaryButton } from "@/components/ui/Button";
import StepStrip, {
  IconBeliefs,
  IconIndex,
  IconCheck,
} from "@/components/ui/StepStrip";
import BallparkResult from "@/components/survey/BallparkResult";

const STEPS = [
  {
    title: "Ballpark",
    body: "8 questions, see if it matters.",
    icon: <IconBeliefs />,
  },
  {
    title: "Measured",
    body: "Your parts list, see where.",
    icon: <IconIndex />,
  },
  {
    title: "Sustained",
    body: "A check where parts get chosen.",
    icon: <IconCheck />,
  },
];

const SCALE_LABELS = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
];

const FREQ_LABELS = ["Never", "Rarely", "Sometimes", "Often", "Always"];

const DECISION_LEVELS: DecisionLevel[] = ["I decide", "I influence", "I execute"];

const ARCHITECTURE_OWNERS: ArchitectureOwner[] = [
  "Nobody",
  "Engineering",
  "Product",
  "Cross-functional group",
  "Not sure",
];

const MEASURED_ON_COMPLEXITY = ["Yes", "Partly", "No"] as const;

const BLOCKERS: PlatformingBlocker[] = [
  "Engineering effort",
  "Ownership",
  "Incentives",
  "Customer demands",
  "Lack of data",
];

const opts = (values: readonly string[]): Choice[] =>
  values.map((v) => ({ value: v, label: v }));

const scaleOpts = (labels: string[]): Choice[] =>
  labels.map((label, i) => ({ value: String(i + 1), label }));

type TabId = "overview" | "ballpark" | "result" | "view";

/** One question: text on the left, answer on the right. */
function QuestionRow({
  question,
  hint,
  error,
  children,
}: {
  question: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 border-b border-line py-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-10">
      <div>
        <p className="text-[15px] leading-snug text-text">{question}</p>
        {hint ? <p className="mt-1 text-[12px] text-text-3">{hint}</p> : null}
      </div>
      <div>
        {children}
        {error ? <p className="mt-2 text-[12px] text-risk">{error}</p> : null}
      </div>
    </div>
  );
}

export default function IntakePage() {
  const [profile, setProfile] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [answers, setAnswers] = useState<BallparkAnswers>({ ...EMPTY_BALLPARK });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    setProfile(loadProfile());
    setAnswers(loadBallpark());
  }, []);

  function updateProfile<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((p) => {
      const next = { ...p, [key]: value };
      saveProfile(next);
      return next;
    });
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function update<K extends keyof BallparkAnswers>(key: K, value: BallparkAnswers[K]) {
    setAnswers((a) => {
      const next = { ...a, [key]: value };
      saveBallpark(next);
      return next;
    });
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function toggleArray<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  function findErrors(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!profile.role) e.role = "Required";
    if (!answers.partNumbers) e.partNumbers = "Required";
    if (!answers.revenue) e.revenue = "Required";
    if (!answers.productLines) e.productLines = "Required";
    if (!answers.acquisitions) e.acquisitions = "Required";
    if (!answers.alignment) e.alignment = "Required";
    if (!answers.platforming) e.platforming = "Required";
    if (!answers.complexityTarget) e.complexityTarget = "Required";
    if (!answers.partNumberOwner) e.partNumberOwner = "Required";
    return e;
  }

  const allErrors = findErrors();
  const ready = profile.role !== "" && isComplete(answers);

  function advance() {
    if (tab === "overview") {
      setTab("ballpark");
      return;
    }
    if (tab === "ballpark") {
      setErrors(allErrors);
      if (Object.keys(allErrors).length > 0) return;
      saveProfile(profile);
      saveBallpark(answers);
      setTab("result");
      return;
    }
    if (tab === "result") {
      setTab("view");
      return;
    }
    saveProfile(profile);
    setTab("result");
  }

  const actionLabel =
    tab === "ballpark"
      ? "See my ballpark"
      : tab === "result"
      ? "Add your view"
      : tab === "view"
      ? "Back to my ballpark"
      : "Start";

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-shell px-12 pb-24">
        <PageHeader
          parent="Platforming Index"
          section="Ballpark"
          title="How much complexity are you carrying?"
        />

        <Tabs
          active={tab}
          onSelect={(id) => setTab(id as TabId)}
          items={[
            { id: "overview", label: "Overview" },
            {
              id: "ballpark",
              label: "Ballpark index",
              flagged: Object.keys(errors).length > 0,
            },
            { id: "result", label: "Result" },
            { id: "view", label: "Add your view" },
          ]}
          actions={
            // The result screen carries its own accent action, so the header
            // steps back to an outline button there.
            tab === "overview" || tab === "ballpark" ? (
              <PrimaryButton onClick={advance}>{actionLabel}</PrimaryButton>
            ) : (
              <Button onClick={advance}>{actionLabel}</Button>
            )
          }
        />

        {tab === "overview" && (
          <section className="pt-14">
            <StepStrip steps={STEPS} />
            <p className="mt-16 text-[15px] text-text-2">
              Start with 8 questions and no upload. Two minutes, and you find
              out whether this is worth an afternoon.
            </p>
            <p className="mt-3 text-[13px] text-text-3">
              The measured index needs a parts list. The example on this build
              uses sample data for a fictional company.
            </p>
          </section>
        )}

        {tab === "ballpark" && (
          <section className="pt-6">
            <QuestionRow question="Your role" error={errors.role}>
              <ChoiceGroup
                size="sm"
                options={ROLES.map((r) => ({ value: r, label: shortRole(r) }))}
                selected={profile.role ? [profile.role] : []}
                onSelect={(v) => updateProfile("role", v as Role)}
              />
            </QuestionRow>

            <QuestionRow
              question="Roughly how many part numbers do you carry?"
              hint="A rough figure is enough. The bands fill it in for you."
              error={errors.partNumbers}
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-[180px]">
                  <Field label="Part numbers" dense>
                    <input
                      type="number"
                      min={1}
                      value={answers.partNumbers ?? ""}
                      onChange={(e) =>
                        update("partNumbers", Number(e.target.value) || null)
                      }
                      placeholder="12000"
                      className="w-full bg-transparent py-1 text-[14px] tabular-nums text-text placeholder:text-text-3 focus:outline-none"
                    />
                  </Field>
                </div>
                <ChoiceGroup
                  size="sm"
                  options={PART_NUMBER_BANDS.map((b) => ({
                    value: String(b.value),
                    label: b.label,
                  }))}
                  selected={
                    PART_NUMBER_BANDS.some((b) => b.value === answers.partNumbers)
                      ? [String(answers.partNumbers)]
                      : []
                  }
                  onSelect={(v) => update("partNumbers", Number(v))}
                />
              </div>
            </QuestionRow>

            <QuestionRow question="Annual revenue" error={errors.revenue}>
              <ChoiceGroup
                size="sm"
                options={opts(REVENUE_BANDS)}
                selected={answers.revenue ? [answers.revenue] : []}
                onSelect={(v) => update("revenue", v as RevenueBand)}
              />
            </QuestionRow>

            <QuestionRow
              question="How many product lines do you sell?"
              error={errors.productLines}
            >
              <div className="w-[180px]">
                <Field label="Product lines" dense>
                  <input
                    type="number"
                    min={1}
                    value={answers.productLines ?? ""}
                    onChange={(e) =>
                      update("productLines", Number(e.target.value) || null)
                    }
                    placeholder="6"
                    className="w-full bg-transparent py-1 text-[14px] tabular-nums text-text placeholder:text-text-3 focus:outline-none"
                  />
                </Field>
              </div>
            </QuestionRow>

            <QuestionRow
              question="How many acquisitions in the last 10 years?"
              error={errors.acquisitions}
            >
              <ChoiceGroup
                size="sm"
                options={opts(ACQUISITION_BANDS)}
                selected={answers.acquisitions ? [answers.acquisitions] : []}
                onSelect={(v) => update("acquisitions", v as AcquisitionBand)}
              />
            </QuestionRow>

            <QuestionRow
              question="After those acquisitions, did you align parts and suppliers?"
              error={errors.alignment}
            >
              <ChoiceGroup
                size="sm"
                options={opts(ALIGNMENT_ANSWERS)}
                selected={answers.alignment ? [answers.alignment] : []}
                onSelect={(v) => update("alignment", v as AlignmentAnswer)}
              />
            </QuestionRow>

            <QuestionRow question="Have you tried platforming?" error={errors.platforming}>
              <ChoiceGroup
                size="sm"
                options={opts(PLATFORMING_ANSWERS)}
                selected={answers.platforming ? [answers.platforming] : []}
                onSelect={(v) => update("platforming", v as PlatformingAnswer)}
              />
            </QuestionRow>

            <QuestionRow
              question="Do you set a target for product complexity?"
              error={errors.complexityTarget}
            >
              <ChoiceGroup
                size="sm"
                options={opts(TARGET_ANSWERS)}
                selected={answers.complexityTarget ? [answers.complexityTarget] : []}
                onSelect={(v) => update("complexityTarget", v as TargetAnswer)}
              />
            </QuestionRow>

            <QuestionRow
              question="Who decides when a new part number gets created?"
              error={errors.partNumberOwner}
            >
              <ChoiceGroup
                size="sm"
                options={opts(OWNER_ANSWERS)}
                selected={answers.partNumberOwner ? [answers.partNumberOwner] : []}
                onSelect={(v) => update("partNumberOwner", v as OwnerAnswer)}
              />
            </QuestionRow>

            <p className="pt-6 text-[13px] text-text-3">
              Eight answers. No upload. The result is an estimate with its
              arithmetic shown.
            </p>
          </section>
        )}

        {tab === "result" &&
          (ready ? (
            <BallparkResult
              answers={answers}
              profile={profile}
              onCost={(value) => update("costPerPartNumber", value)}
            />
          ) : (
            <section className="pt-14">
              <p className="text-[15px] text-text-2">
                Answer the eight questions and the ballpark appears here.
              </p>
              <button
                type="button"
                onClick={() => setTab("ballpark")}
                className="mt-3 text-[13px] text-text-2 underline-offset-4 transition-colors hover:text-text hover:underline"
              >
                Go to the questions
              </button>
            </section>
          ))}

        {tab === "view" && (
          <section className="pt-6">
            <div className="border-b border-line pb-5">
              <p className="text-[15px] text-text">Add your view (1 minute)</p>
              <p className="mt-1 text-[13px] text-text-3">
                Optional. These answers sharpen the Incentives score and feed the
                Alignment view, where functions see where they disagree.
              </p>
            </div>

            <QuestionRow question="Customers need every variant we offer.">
              <ChoiceGroup
                size="sm"
                options={scaleOpts(SCALE_LABELS)}
                selected={
                  profile.customersNeedEveryVariant
                    ? [String(profile.customersNeedEveryVariant)]
                    : []
                }
                onSelect={(v) => updateProfile("customersNeedEveryVariant", Number(v))}
              />
            </QuestionRow>

            <QuestionRow question="Who owns product architecture decisions today?">
              <ChoiceGroup
                size="sm"
                options={opts(ARCHITECTURE_OWNERS)}
                selected={profile.architectureOwner ? [profile.architectureOwner] : []}
                onSelect={(v) =>
                  updateProfile("architectureOwner", v as ArchitectureOwner)
                }
              />
            </QuestionRow>

            <QuestionRow question="Are you measured on product complexity?">
              <ChoiceGroup
                size="sm"
                options={opts(MEASURED_ON_COMPLEXITY)}
                selected={
                  profile.measuredOnComplexity ? [profile.measuredOnComplexity] : []
                }
                onSelect={(v) =>
                  updateProfile(
                    "measuredOnComplexity",
                    v as UserProfile["measuredOnComplexity"]
                  )
                }
              />
            </QuestionRow>

            <QuestionRow question="When a new product needs a part, how often does the team check for an existing one first?">
              <ChoiceGroup
                size="sm"
                options={scaleOpts(FREQ_LABELS)}
                selected={
                  profile.checksForExistingPart
                    ? [String(profile.checksForExistingPart)]
                    : []
                }
                onSelect={(v) => updateProfile("checksForExistingPart", Number(v))}
              />
            </QuestionRow>

            <QuestionRow question="Biggest blocker to platforming here.">
              <ChoiceGroup
                size="sm"
                options={opts(BLOCKERS)}
                selected={profile.biggestBlocker ? [profile.biggestBlocker] : []}
                onSelect={(v) =>
                  updateProfile("biggestBlocker", v as PlatformingBlocker)
                }
              />
            </QuestionRow>

            <QuestionRow question="How much of this is yours to decide?">
              <ChoiceGroup
                size="sm"
                options={opts(DECISION_LEVELS)}
                selected={profile.decisionLevel ? [profile.decisionLevel] : []}
                onSelect={(v) => updateProfile("decisionLevel", v as DecisionLevel)}
              />
            </QuestionRow>

            <QuestionRow question="What are you measured on?">
              <ChoiceGroup
                size="sm"
                multi
                options={opts(METRICS)}
                selected={profile.metrics}
                onSelect={(v) =>
                  updateProfile("metrics", toggleArray(profile.metrics, v as Metric))
                }
              />
            </QuestionRow>

            <div className="grid grid-cols-1 gap-4 py-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-10">
              <p className="text-[15px] leading-snug text-text">
                A decision your team is facing right now.
                <span className="ml-2 text-text-3">Optional</span>
              </p>
              <Field label="In one line" dense>
                <input
                  type="text"
                  value={profile.currentDecision}
                  onChange={(e) => updateProfile("currentDecision", e.target.value)}
                  placeholder="Whether to spec a new enclosure for the next UPS line"
                  className="w-full bg-transparent py-1 text-[15px] text-text placeholder:text-text-3 focus:outline-none"
                />
              </Field>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
