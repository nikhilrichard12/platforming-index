"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserProfile,
  EMPTY_PROFILE,
  ROLES,
  PRODUCTS,
  METRICS,
  Role,
  DecisionLevel,
  Metric,
  Product,
  ArchitectureOwner,
  PlatformingBlocker,
} from "@/lib/types";
import { saveProfile, loadProfile } from "@/lib/profile";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import Field from "@/components/ui/Field";
import ChoiceGroup, { Choice } from "@/components/ui/ChoiceGroup";
import { PrimaryButton } from "@/components/ui/Button";
import StepStrip, {
  IconProfile,
  IconBeliefs,
  IconIndex,
  IconView,
  IconCheck,
} from "@/components/ui/StepStrip";

const STEPS = [
  {
    title: "Profile",
    body: "Tell us your role and what you are measured on.",
    icon: <IconProfile />,
  },
  {
    title: "Beliefs",
    body: "Answer five questions about how product decisions get made.",
    icon: <IconBeliefs />,
  },
  {
    title: "Index",
    body: "See one score for how well the product line shares parts and architecture.",
    icon: <IconIndex />,
  },
  {
    title: "Your view",
    body: "See what complexity costs your function, with an assistant that explains every number.",
    icon: <IconView />,
  },
  {
    title: "Check",
    body: "See the same score at the moment someone requests a new part.",
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

const PROFILE_KEYS = ["role", "decisionLevel", "products", "metrics"] as const;
const BELIEF_KEYS = [
  "customersNeedEveryVariant",
  "architectureOwner",
  "measuredOnComplexity",
  "checksForExistingPart",
  "biggestBlocker",
] as const;

type TabId = "overview" | "profile" | "beliefs";

/** One belief question: text on the left, options on the right. */
function QuestionRow({
  question,
  error,
  children,
}: {
  question: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 border-b border-line py-7 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-10">
      <p className="text-[15px] leading-snug text-text">{question}</p>
      <div>
        {children}
        {error ? <p className="mt-2 text-[12px] text-risk">{error}</p> : null}
      </div>
    </div>
  );
}

export default function IntakePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((p) => {
      const next = { ...p, [key]: value };
      saveProfile(next);
      return next;
    });
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function toggleArray<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  function findErrors(p: UserProfile): Record<string, string> {
    const e: Record<string, string> = {};
    if (!p.role) e.role = "Required";
    if (!p.decisionLevel) e.decisionLevel = "Required";
    if (p.products.length === 0) e.products = "Select at least one product";
    if (p.metrics.length === 0) e.metrics = "Select at least one";
    if (!p.customersNeedEveryVariant) e.customersNeedEveryVariant = "Required";
    if (!p.architectureOwner) e.architectureOwner = "Required";
    if (!p.measuredOnComplexity) e.measuredOnComplexity = "Required";
    if (!p.checksForExistingPart) e.checksForExistingPart = "Required";
    if (!p.biggestBlocker) e.biggestBlocker = "Required";
    return e;
  }

  const allErrors = findErrors(profile);
  const profileIncomplete = PROFILE_KEYS.some((k) => allErrors[k]);
  const beliefsIncomplete = BELIEF_KEYS.some((k) => allErrors[k]);

  function advance() {
    if (tab === "overview") {
      setTab("profile");
      return;
    }
    if (tab === "profile") {
      const shown = Object.fromEntries(
        PROFILE_KEYS.filter((k) => allErrors[k]).map((k) => [k, allErrors[k]])
      );
      setErrors(shown);
      if (Object.keys(shown).length > 0) return;
      setTab("beliefs");
      return;
    }
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      if (profileIncomplete) setTab("profile");
      return;
    }
    saveProfile(profile);
    router.push("/build");
  }

  const actionLabel = tab === "beliefs" ? "Build my view" : "Continue";

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-shell px-12 pb-24">
        <PageHeader
          parent="Voltara Power Systems"
          section="Platforming Index"
          title="Complexity survey"
        />

        <Tabs
          active={tab}
          onSelect={(id) => setTab(id as TabId)}
          items={[
            { id: "overview", label: "Overview" },
            {
              id: "profile",
              label: "Profile",
              flagged: profileIncomplete && PROFILE_KEYS.some((k) => errors[k]),
            },
            {
              id: "beliefs",
              label: "Beliefs",
              flagged: beliefsIncomplete && BELIEF_KEYS.some((k) => errors[k]),
            },
          ]}
          actions={
            <PrimaryButton onClick={advance}>{actionLabel}</PrimaryButton>
          }
        />

        {tab === "overview" && (
          <section className="pt-14">
            <StepStrip steps={STEPS} />
            <p className="mt-16 text-[15px] text-text-2">
              Takes three minutes. You get a score and a view built for your role.
            </p>
            <p className="mt-3 text-[13px] text-text-3">
              Sample company. Sample data.
            </p>
          </section>
        )}

        {tab === "profile" && (
          <section className="grid grid-cols-1 gap-8 pt-12 lg:grid-cols-2">
            <Field label="Your role" error={errors.role}>
              <ChoiceGroup
                options={opts(ROLES)}
                selected={profile.role ? [profile.role] : []}
                onSelect={(v) => update("role", v as Role)}
              />
            </Field>

            <Field label="Decision level" error={errors.decisionLevel}>
              <ChoiceGroup
                options={opts(DECISION_LEVELS)}
                selected={profile.decisionLevel ? [profile.decisionLevel] : []}
                onSelect={(v) => update("decisionLevel", v as DecisionLevel)}
              />
            </Field>

            <Field
              label="Products you cover"
              hint="Voltara's six products. Sample data."
              error={errors.products}
            >
              <ChoiceGroup
                multi
                options={opts(PRODUCTS)}
                selected={profile.products}
                onSelect={(v) =>
                  update("products", toggleArray(profile.products, v as Product))
                }
              />
            </Field>

            <Field label="What you are measured on" error={errors.metrics}>
              <ChoiceGroup
                multi
                options={opts(METRICS)}
                selected={profile.metrics}
                onSelect={(v) =>
                  update("metrics", toggleArray(profile.metrics, v as Metric))
                }
              />
            </Field>
          </section>
        )}

        {tab === "beliefs" && (
          <section className="pt-6">
            <QuestionRow
              question="Customers need every variant we offer."
              error={errors.customersNeedEveryVariant}
            >
              <ChoiceGroup
                size="sm"
                options={scaleOpts(SCALE_LABELS)}
                selected={
                  profile.customersNeedEveryVariant
                    ? [String(profile.customersNeedEveryVariant)]
                    : []
                }
                onSelect={(v) => update("customersNeedEveryVariant", Number(v))}
              />
            </QuestionRow>

            <QuestionRow
              question="Who owns product architecture decisions today?"
              error={errors.architectureOwner}
            >
              <ChoiceGroup
                size="sm"
                options={opts(ARCHITECTURE_OWNERS)}
                selected={profile.architectureOwner ? [profile.architectureOwner] : []}
                onSelect={(v) => update("architectureOwner", v as ArchitectureOwner)}
              />
            </QuestionRow>

            <QuestionRow
              question="Are you measured on product complexity?"
              error={errors.measuredOnComplexity}
            >
              <ChoiceGroup
                size="sm"
                options={opts(MEASURED_ON_COMPLEXITY)}
                selected={
                  profile.measuredOnComplexity ? [profile.measuredOnComplexity] : []
                }
                onSelect={(v) =>
                  update(
                    "measuredOnComplexity",
                    v as UserProfile["measuredOnComplexity"]
                  )
                }
              />
            </QuestionRow>

            <QuestionRow
              question="When a new product needs a part, how often does the team check for an existing one first?"
              error={errors.checksForExistingPart}
            >
              <ChoiceGroup
                size="sm"
                options={scaleOpts(FREQ_LABELS)}
                selected={
                  profile.checksForExistingPart
                    ? [String(profile.checksForExistingPart)]
                    : []
                }
                onSelect={(v) => update("checksForExistingPart", Number(v))}
              />
            </QuestionRow>

            <QuestionRow
              question="Biggest blocker to platforming here."
              error={errors.biggestBlocker}
            >
              <ChoiceGroup
                size="sm"
                options={opts(BLOCKERS)}
                selected={profile.biggestBlocker ? [profile.biggestBlocker] : []}
                onSelect={(v) => update("biggestBlocker", v as PlatformingBlocker)}
              />
            </QuestionRow>

            <div className="grid grid-cols-1 gap-4 py-7 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-10">
              <p className="text-[15px] leading-snug text-text">
                A decision your team is facing right now.
                <span className="ml-2 text-text-3">Optional</span>
              </p>
              <Field label="In one line" dense>
                <input
                  type="text"
                  value={profile.currentDecision}
                  onChange={(e) => update("currentDecision", e.target.value)}
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
