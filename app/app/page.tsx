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

const SCALE_LABELS: Record<number, string> = {
  1: "Strongly disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly agree",
};

const FREQ_LABELS: Record<number, string> = {
  1: "Never",
  2: "Rarely",
  3: "Sometimes",
  4: "Often",
  5: "Always",
};

function ScaleSelect({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: Record<number, string>;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          title={labels[n]}
          style={{
            width: 40,
            height: 40,
            border: value === n ? "2px solid #7823DC" : "1px solid #CCCCCC",
            background: value === n ? "#7823DC" : "#FFFFFF",
            color: value === n ? "#FFFFFF" : "#1E1E1E",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 13,
        fontWeight: 600,
        color: "#495057",
        marginBottom: 8,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
      {required && <span style={{ color: "#7823DC", marginLeft: 4 }}>*</span>}
    </label>
  );
}

function SelectButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 16px",
        border: selected ? "1px solid #7823DC" : "1px solid #CCCCCC",
        background: selected ? "#7823DC" : "#FFFFFF",
        color: selected ? "#FFFFFF" : "#1E1E1E",
        fontSize: 13,
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.15s",
        marginRight: 8,
        marginBottom: 8,
        display: "inline-block",
      }}
    >
      {children}
    </button>
  );
}

function SectionHeading({ step, title, sub }: { step: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#7823DC",
          marginBottom: 6,
        }}
      >
        {step}
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: "#1E1E1E", margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 14, color: "#495057", marginTop: 6, marginBottom: 0 }}>{sub}</p>
    </div>
  );
}

export default function IntakePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!profile.role) e.role = "Required";
    if (!profile.decisionLevel) e.decisionLevel = "Required";
    if (profile.products.length === 0) e.products = "Select at least one product";
    if (profile.metrics.length === 0) e.metrics = "Select at least one";
    if (!profile.customersNeedEveryVariant) e.customersNeedEveryVariant = "Required";
    if (!profile.architectureOwner) e.architectureOwner = "Required";
    if (!profile.measuredOnComplexity) e.measuredOnComplexity = "Required";
    if (!profile.checksForExistingPart) e.checksForExistingPart = "Required";
    if (!profile.biggestBlocker) e.biggestBlocker = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    saveProfile(profile);
    router.push("/build");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F5" }}>
      {/* Hero band */}
      <div
        className="hero-pattern"
        style={{
          background: "#1B1330",
          padding: "72px 48px 64px",
        }}
      >
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#c084fc",
              marginBottom: 16,
            }}
          >
            Diagnostic
          </p>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 600,
              color: "#FFFFFF",
              lineHeight: 1.1,
              maxWidth: 700,
              margin: "0 0 20px",
            }}
          >
            Platforming Index
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.65)", maxWidth: 560, margin: 0 }}>
            Diagnose where product complexity is costing you time, money, and market share — and
            show you the first step to fixing it.
          </p>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 48px 80px" }}>
        {/* Progress indicator */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginTop: -1,
            marginBottom: 48,
            borderBottom: "1px solid #CCCCCC",
          }}
        >
          {["About you", "What you believe", "Your decision"].map((label, i) => (
            <div
              key={label}
              style={{
                padding: "16px 24px",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: i === 0 ? "#7823DC" : "#495057",
                borderBottom: i === 0 ? "2px solid #7823DC" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {String(i + 1).padStart(2, "0")} {label}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ maxWidth: 720 }}>
            {/* SECTION A */}
            <SectionHeading
              step="Section A"
              title="About you"
              sub="Ten seconds. Tell us your role so your advisor speaks your language."
            />

            {/* Role */}
            <div style={{ marginBottom: 28 }}>
              <FieldLabel required>Your role</FieldLabel>
              <div>
                {ROLES.map((r) => (
                  <SelectButton
                    key={r}
                    selected={profile.role === r}
                    onClick={() => update("role", r as Role)}
                  >
                    {r}
                  </SelectButton>
                ))}
              </div>
              {errors.role && (
                <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{errors.role}</p>
              )}
            </div>

            {/* Decision level */}
            <div style={{ marginBottom: 28 }}>
              <FieldLabel required>Decision level</FieldLabel>
              <div>
                {(["I decide", "I influence", "I execute"] as DecisionLevel[]).map((d) => (
                  <SelectButton
                    key={d}
                    selected={profile.decisionLevel === d}
                    onClick={() => update("decisionLevel", d)}
                  >
                    {d}
                  </SelectButton>
                ))}
              </div>
              {errors.decisionLevel && (
                <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                  {errors.decisionLevel}
                </p>
              )}
            </div>

            {/* Products */}
            <div style={{ marginBottom: 28 }}>
              <FieldLabel required>Products you cover</FieldLabel>
              <p style={{ fontSize: 13, color: "#495057", marginBottom: 10, marginTop: 0 }}>
                Sample data: Voltara&apos;s six products (fictional)
              </p>
              <div>
                {PRODUCTS.map((p) => (
                  <SelectButton
                    key={p}
                    selected={profile.products.includes(p)}
                    onClick={() => update("products", toggleArray(profile.products, p) as Product[])}
                  >
                    {p}
                  </SelectButton>
                ))}
              </div>
              {errors.products && (
                <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{errors.products}</p>
              )}
            </div>

            {/* Metrics */}
            <div style={{ marginBottom: 48 }}>
              <FieldLabel required>What you are measured on</FieldLabel>
              <div>
                {METRICS.map((m) => (
                  <SelectButton
                    key={m}
                    selected={profile.metrics.includes(m)}
                    onClick={() => update("metrics", toggleArray(profile.metrics, m) as Metric[])}
                  >
                    {m}
                  </SelectButton>
                ))}
              </div>
              {errors.metrics && (
                <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{errors.metrics}</p>
              )}
            </div>

            {/* SECTION B */}
            <div style={{ borderTop: "1px solid #CCCCCC", paddingTop: 48, marginBottom: 28 }}>
              <SectionHeading
                step="Section B"
                title="What you believe"
                sub="Five questions about how your organisation works. Honest answers make a better advisor."
              />
            </div>

            {/* B1 */}
            <div style={{ marginBottom: 32 }}>
              <FieldLabel required>
                1. Customers need every variant we offer
              </FieldLabel>
              <ScaleSelect
                value={profile.customersNeedEveryVariant}
                onChange={(v) => update("customersNeedEveryVariant", v)}
                labels={SCALE_LABELS}
              />
              {profile.customersNeedEveryVariant > 0 && (
                <p style={{ fontSize: 12, color: "#495057", marginTop: 6 }}>
                  {SCALE_LABELS[profile.customersNeedEveryVariant]}
                </p>
              )}
              {errors.customersNeedEveryVariant && (
                <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                  {errors.customersNeedEveryVariant}
                </p>
              )}
            </div>

            {/* B2 */}
            <div style={{ marginBottom: 32 }}>
              <FieldLabel required>2. Who owns product architecture decisions today?</FieldLabel>
              <div>
                {(["Nobody", "Engineering", "Product", "Cross-functional group", "Not sure"] as ArchitectureOwner[]).map(
                  (o) => (
                    <SelectButton
                      key={o}
                      selected={profile.architectureOwner === o}
                      onClick={() => update("architectureOwner", o)}
                    >
                      {o}
                    </SelectButton>
                  )
                )}
              </div>
              {errors.architectureOwner && (
                <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                  {errors.architectureOwner}
                </p>
              )}
            </div>

            {/* B3 */}
            <div style={{ marginBottom: 32 }}>
              <FieldLabel required>3. Are you measured on product complexity?</FieldLabel>
              <div>
                {(["Yes", "Partly", "No"] as const).map((v) => (
                  <SelectButton
                    key={v}
                    selected={profile.measuredOnComplexity === v}
                    onClick={() => update("measuredOnComplexity", v)}
                  >
                    {v}
                  </SelectButton>
                ))}
              </div>
              {errors.measuredOnComplexity && (
                <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                  {errors.measuredOnComplexity}
                </p>
              )}
            </div>

            {/* B4 */}
            <div style={{ marginBottom: 32 }}>
              <FieldLabel required>
                4. When a new product needs a part, how often does the team check for an existing one first?
              </FieldLabel>
              <ScaleSelect
                value={profile.checksForExistingPart}
                onChange={(v) => update("checksForExistingPart", v)}
                labels={FREQ_LABELS}
              />
              {profile.checksForExistingPart > 0 && (
                <p style={{ fontSize: 12, color: "#495057", marginTop: 6 }}>
                  {FREQ_LABELS[profile.checksForExistingPart]}
                </p>
              )}
              {errors.checksForExistingPart && (
                <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                  {errors.checksForExistingPart}
                </p>
              )}
            </div>

            {/* B5 */}
            <div style={{ marginBottom: 48 }}>
              <FieldLabel required>5. Biggest blocker to platforming here</FieldLabel>
              <div>
                {(["Engineering effort", "Ownership", "Incentives", "Customer demands", "Lack of data"] as PlatformingBlocker[]).map(
                  (b) => (
                    <SelectButton
                      key={b}
                      selected={profile.biggestBlocker === b}
                      onClick={() => update("biggestBlocker", b)}
                    >
                      {b}
                    </SelectButton>
                  )
                )}
              </div>
              {errors.biggestBlocker && (
                <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                  {errors.biggestBlocker}
                </p>
              )}
            </div>

            {/* SECTION C */}
            <div style={{ borderTop: "1px solid #CCCCCC", paddingTop: 48, marginBottom: 28 }}>
              <SectionHeading
                step="Section C · Optional"
                title="The decision in front of you"
                sub="If there is a specific decision your team is facing right now, describe it in one line. Your advisor will keep it in view."
              />
            </div>

            <div style={{ marginBottom: 48 }}>
              <input
                type="text"
                value={profile.currentDecision}
                onChange={(e) => update("currentDecision", e.target.value)}
                placeholder="e.g. Whether to spec a new enclosure design for the next UPS line"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #CCCCCC",
                  background: "#FFFFFF",
                  fontSize: 14,
                  color: "#1E1E1E",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* CTA */}
            <button
              type="submit"
              style={{
                padding: "14px 40px",
                background: "#7823DC",
                color: "#FFFFFF",
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Build my advisor →
            </button>

            {Object.keys(errors).length > 0 && (
              <p style={{ color: "#dc2626", fontSize: 13, marginTop: 16 }}>
                Please complete all required fields above.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
