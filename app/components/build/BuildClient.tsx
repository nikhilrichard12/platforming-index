"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadProfile } from "@/lib/profile";
import { buildPromptSections, PromptSection } from "@/lib/agent/buildSystemPrompt";
import { UserProfile, EMPTY_PROFILE } from "@/lib/types";
import { VoltaraData } from "@/lib/voltaraData";
import { SurveyFile } from "@/lib/survey";
import PageHeader from "@/components/ui/PageHeader";
import { Button, PrimaryButton } from "@/components/ui/Button";

type Stage = {
  name: string;
  detail: string;
  /** Prompt section ids revealed when this stage completes. */
  reveals: string[];
  delay: number;
};

const STAGES: Stage[] = [
  {
    name: "Reading your profile",
    detail: "Role, decision level, products, and what you are measured on.",
    reveals: ["role_profile"],
    delay: 600,
  },
  {
    name: "Reading your beliefs",
    detail: "Five answers about how product decisions get made here.",
    reveals: ["beliefs"],
    delay: 800,
  },
  {
    name: "Loading Voltara parts and spend data",
    detail: "Parts lists and purchase records, counted and cited.",
    reveals: ["company_data"],
    delay: 900,
  },
  {
    name: "Choosing the metrics for your role",
    detail: "The numbers your function is judged on, in order.",
    reveals: ["role_metrics"],
    delay: 700,
  },
  {
    name: "Adding rules and assumptions",
    detail: "Every figure cites a source row or a listed assumption.",
    reveals: ["rules", "assumptions"],
    delay: 1000,
  },
  {
    name: "Writing your assistant's instructions",
    detail: "One model, a prompt written for you.",
    reveals: [],
    delay: 700,
  },
];

/** "ROLE AND PROFILE" reads as an eyebrow label. Show it as a sentence. */
function displayHeading(heading: string): string {
  const lower = heading.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function StatusMark({ state }: { state: "waiting" | "running" | "done" }) {
  if (state === "done") {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4 text-positive" aria-hidden="true">
        <path
          d="M2 8.5 6 12.5 14 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (state === "running") {
    return (
      <span className="block h-4 w-4 rounded-full border-2 border-accent animate-pulse-ring" />
    );
  }
  return <span className="block h-4 w-4 rounded-full border border-line-2" />;
}

export default function BuildClient({
  data,
  survey,
}: {
  data: VoltaraData;
  survey: SurveyFile;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [sections, setSections] = useState<PromptSection[]>([]);
  const [currentStage, setCurrentStage] = useState(-1);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [arrivedId, setArrivedId] = useState<string | null>(null);
  const [typedChars, setTypedChars] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setSections(buildPromptSections(p, data, survey));
  }, [data, survey]);

  // Drive the stages on a timer.
  useEffect(() => {
    if (sections.length === 0 || skipped) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function runStage(idx: number) {
      if (cancelled || idx >= STAGES.length) return;
      setCurrentStage(idx);
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setCompletedStages((prev) => [...prev, idx]);
          const reveals = STAGES[idx].reveals;
          if (reveals.length > 0) {
            setVisibleIds((prev) => [...prev, ...reveals]);
            setArrivedId(reveals[reveals.length - 1]);
          }
          if (idx === STAGES.length - 1) setDone(true);
          else runStage(idx + 1);
        }, STAGES[idx].delay)
      );
    }

    runStage(0);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length]);

  // The arrival rule shows for one second.
  useEffect(() => {
    if (!arrivedId) return;
    const t = setTimeout(() => setArrivedId(null), 1000);
    return () => clearTimeout(t);
  }, [arrivedId]);

  // Type out the body of the newest section. A stage that reveals more than one
  // section shows the earlier ones in full.
  useEffect(() => {
    if (skipped || visibleIds.length === 0) return;
    setTypedChars((prev) => {
      const next = { ...prev };
      for (const id of visibleIds.slice(0, -1)) {
        const s = sections.find((x) => x.id === id);
        if (s) next[id] = s.body.length;
      }
      return next;
    });
    const id = visibleIds[visibleIds.length - 1];
    const section = sections.find((s) => s.id === id);
    if (!section) return;
    let char = 0;
    const interval = setInterval(() => {
      char += 6;
      setTypedChars((prev) => ({
        ...prev,
        [id]: Math.min(char, section.body.length),
      }));
      if (char >= section.body.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [visibleIds, sections, skipped]);

  // Follow the text while it assembles, then return to the top so the finished
  // prompt reads from its first line.
  useEffect(() => {
    if (!panelRef.current) return;
    panelRef.current.scrollTop = done ? 0 : panelRef.current.scrollHeight;
  }, [typedChars, visibleIds, done]);

  function handleSkip() {
    setSkipped(true);
    setCurrentStage(STAGES.length - 1);
    setCompletedStages(STAGES.map((_, i) => i));
    setVisibleIds(sections.map((s) => s.id));
    setArrivedId(null);
    setTypedChars(
      Object.fromEntries(sections.map((s) => [s.id, s.body.length]))
    );
    setDone(true);
  }

  function bodyFor(section: PromptSection): string {
    if (skipped) return section.body;
    return section.body.slice(0, typedChars[section.id] ?? 0);
  }

  const who = [
    profile.role,
    profile.decisionLevel,
    profile.products.length > 0
      ? `${profile.products.length} ${profile.products.length === 1 ? "product" : "products"}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const visible = sections.filter((s) => visibleIds.includes(s.id));

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-shell px-12 pb-24">
        <PageHeader
          parent="Voltara Power Systems"
          section="Platforming Index"
          title="Building your view"
          actions={
            done ? (
              <PrimaryButton onClick={() => router.push("/dashboard")}>
                Open my dashboard
              </PrimaryButton>
            ) : (
              <Button variant="muted" disabled>
                Open my dashboard
              </Button>
            )
          }
        />

        <p className="mt-4 text-[15px] text-text-2">
          {who || "No profile saved yet. Showing the default build."}
        </p>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {/* Stages */}
          <div>
            <div className="border-t border-line">
              {STAGES.map((stage, i) => {
                const isDone = completedStages.includes(i);
                const isRunning = currentStage === i && !isDone;
                return (
                  <div
                    key={stage.name}
                    className="flex gap-4 border-b border-line py-5"
                  >
                    <div className="pt-[3px]">
                      <StatusMark
                        state={isDone ? "done" : isRunning ? "running" : "waiting"}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-[15px] leading-snug ${
                          isDone || isRunning ? "text-text" : "text-text-2"
                        }`}
                      >
                        {stage.name}
                      </p>
                      <p className="mt-1 text-[13px] leading-snug text-text-3">
                        {stage.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {!done && (
              <button
                type="button"
                onClick={handleSkip}
                className="mt-5 text-[13px] text-text-3 underline-offset-4 transition-colors hover:text-text-2 hover:underline"
              >
                Skip
              </button>
            )}
          </div>

          {/* Assistant instructions */}
          <div className="bg-panel p-6">
            <h2 className="text-[15px] font-semibold text-text">
              Assistant instructions
            </h2>
            <p className="mt-1 text-[13px] text-text-3">
              Assembled from your survey and Voltara data
            </p>

            {/* The negative margin keeps the arrival rule inside the scroll box,
                which clips anything sitting left of its padding edge. */}
            <div
              ref={panelRef}
              className="-ml-5 mt-6 max-h-[520px] min-h-[420px] overflow-y-auto pl-5"
            >
              {visible.length === 0 ? (
                <p className="text-[13px] text-text-3">Waiting for the first stage.</p>
              ) : (
                visible.map((section) => (
                  <div
                    key={section.id}
                    className={`-ml-4 mb-7 border-l pl-4 ${
                      arrivedId === section.id
                        ? "border-accent"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-6">
                      <h3 className="text-[14px] font-semibold text-text">
                        {displayHeading(section.heading)}
                      </h3>
                      <span className="max-w-[45%] break-words text-right text-[12px] leading-snug text-text-3">
                        {section.source}
                      </span>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-text-2">
                      {bodyFor(section)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
