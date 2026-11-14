"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadProfile } from "@/lib/profile";
import { buildPromptSections, PromptSection } from "@/lib/agent/buildSystemPrompt";
import { UserProfile, EMPTY_PROFILE } from "@/lib/types";

const STEPS = [
  "Reading your profile",
  "Loading Voltara data",
  "Loading role metrics",
  "Loading assumptions and citation rules",
  "Composing the system prompt",
  "Advisor ready",
];

const STEP_DELAYS = [600, 800, 700, 900, 1200, 400];

export default function BuildPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [sections, setSections] = useState<PromptSection[]>([]);
  const [visibleSections, setVisibleSections] = useState<number>(0);
  const [typedChars, setTypedChars] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const monoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    const built = buildPromptSections(p);
    setSections(built);
    setTypedChars(new Array(built.length).fill(0));
  }, []);

  // Drive the stepper
  useEffect(() => {
    if (sections.length === 0 || skipped) return;
    function runStep(idx: number) {
      if (idx >= STEPS.length) return;
      setCurrentStep(idx);
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, idx]);
        // Reveal a prompt section roughly aligned to steps 1-5
        if (idx < sections.length) {
          setVisibleSections((prev) => prev + 1);
        }
        if (idx === STEPS.length - 1) {
          setDone(true);
        } else {
          runStep(idx + 1);
        }
      }, STEP_DELAYS[idx]);
    }

    runStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length]);

  // Typewriter for each visible section
  useEffect(() => {
    if (skipped) return;
    if (visibleSections === 0) return;
    const idx = visibleSections - 1;
    if (idx >= sections.length) return;
    const text = `## ${sections[idx].heading}\n${sections[idx].body}`;
    let char = 0;
    const interval = setInterval(() => {
      char += 4; // type 4 chars per tick for speed
      setTypedChars((prev) => {
        const next = [...prev];
        next[idx] = Math.min(char, text.length);
        return next;
      });
      if (char >= text.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [visibleSections, sections, skipped]);

  // Auto-scroll mono panel
  useEffect(() => {
    if (monoRef.current) {
      monoRef.current.scrollTop = monoRef.current.scrollHeight;
    }
  }, [typedChars, visibleSections]);

  function handleSkip() {
    setSkipped(true);
    setCurrentStep(STEPS.length - 1);
    setCompletedSteps(STEPS.map((_, i) => i));
    setVisibleSections(sections.length);
    setTypedChars(
      sections.map((s) => `## ${s.heading}\n${s.body}`.length)
    );
    setDone(true);
  }

  function getDisplayedText(idx: number): string {
    if (idx >= sections.length) return "";
    const full = `## ${sections[idx].heading}\n${sections[idx].body}`;
    if (skipped) return full;
    return full.slice(0, typedChars[idx] ?? 0);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F5" }}>
      {/* Hero */}
      <div
        className="hero-pattern"
        style={{ background: "#1B1330", padding: "48px 48px 40px" }}
      >
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#c084fc",
              marginBottom: 12,
            }}
          >
            Step 2 of 3
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 600, color: "#FFFFFF", margin: 0 }}>
            Building your advisor
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", marginTop: 8, fontSize: 15 }}>
            Loading Voltara sample data and composing a system prompt tailored to your profile.
          </p>
        </div>
      </div>

      {/* Main split */}
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "48px 48px 80px",
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 40,
          alignItems: "start",
        }}
      >
        {/* Left: Stepper */}
        <div>
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #CCCCCC",
              padding: "28px 24px",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#495057",
                margin: "0 0 20px",
              }}
            >
              Assembly steps
            </p>
            {STEPS.map((step, i) => {
              const isComplete = completedSteps.includes(i);
              const isActive = currentStep === i && !isComplete;
              return (
                <div
                  key={step}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {/* Circle */}
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      border: isComplete
                        ? "2px solid #7823DC"
                        : isActive
                        ? "2px solid #7823DC"
                        : "2px solid #CCCCCC",
                      background: isComplete ? "#7823DC" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {isComplete ? (
                      <span style={{ color: "#FFFFFF", fontSize: 12, fontWeight: 700 }}>✓</span>
                    ) : isActive ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          background: "#7823DC",
                          display: "block",
                          animation: "pulse 1s infinite",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          background: "#CCCCCC",
                          display: "block",
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      color: isComplete ? "#1E1E1E" : isActive ? "#7823DC" : "#495057",
                      fontWeight: isActive || isComplete ? 600 : 400,
                    }}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Skip / open dashboard */}
          <div style={{ marginTop: 20 }}>
            {done ? (
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "#7823DC",
                  color: "#FFFFFF",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Open dashboard →
              </button>
            ) : (
              <button
                onClick={handleSkip}
                style={{
                  width: "100%",
                  padding: "10px 20px",
                  background: "transparent",
                  color: "#7823DC",
                  border: "1px solid #7823DC",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                Skip animation
              </button>
            )}
          </div>
        </div>

        {/* Right: Monospace prompt panel */}
        <div
          style={{
            background: "#0D0D0D",
            border: "1px solid #333",
            minHeight: 480,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid #333",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "#666",
                fontFamily: "monospace",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              system_prompt.txt
            </span>
            {profile.role && (
              <span
                style={{
                  fontSize: 10,
                  background: "rgba(120,35,220,0.3)",
                  border: "1px solid #7823DC",
                  color: "#c084fc",
                  padding: "2px 8px",
                  letterSpacing: "0.06em",
                }}
              >
                {profile.role}
              </span>
            )}
          </div>

          <div
            ref={monoRef}
            className="mono-panel"
            style={{
              flex: 1,
              padding: 24,
              overflowY: "auto",
              maxHeight: 520,
              color: "#d4d4d4",
            }}
          >
            {sections.slice(0, visibleSections).map((section, idx) => {
              const displayed = getDisplayedText(idx);
              const isTyping =
                !skipped &&
                idx === visibleSections - 1 &&
                (typedChars[idx] ?? 0) < `## ${section.heading}\n${section.body}`.length;

              return (
                <div key={section.id} style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: "#888", fontSize: 10, letterSpacing: "0.06em" }}>
                      ▸ SOURCE: {section.source}
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: idx === 0 ? "#c084fc" : idx === 2 ? "#86efac" : "#d4d4d4",
                    }}
                  >
                    {displayed}
                    {isTyping && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 14,
                          background: "#7823DC",
                          marginLeft: 2,
                          verticalAlign: "text-bottom",
                          animation: "blink 1s step-end infinite",
                        }}
                      />
                    )}
                  </pre>
                </div>
              );
            })}
            {sections.length === 0 && (
              <span style={{ color: "#555" }}>Initialising…</span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
