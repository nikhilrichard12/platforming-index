"use client";

import { useEffect, useState, useRef } from "react";
import { loadProfile } from "@/lib/profile";
import { UserProfile, EMPTY_PROFILE, ROLES, Role } from "@/lib/types";
import { VOLTARA_STATS, PRODUCTS_DATA } from "@/lib/voltaraStats";
import { getRoleConfig } from "@/lib/roles";
import { buildSystemPrompt } from "@/lib/agent/buildSystemPrompt";
import SourcePopover from "@/components/dashboard/SourcePopover";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: { type: "row" | "assumption"; ref: string }[];
}

function PendingBadge() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "#d97706",
        border: "1px solid #d97706",
        padding: "2px 8px",
        marginLeft: 8,
      }}
    >
      Pending engine output
    </span>
  );
}

function KPICard({
  title,
  value,
  unit,
  qualitative,
  source,
  assumption,
  sourceLabel,
}: {
  title: string;
  value?: string;
  unit?: string;
  qualitative?: string;
  source: string;
  assumption?: boolean;
  sourceLabel: string;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #CCCCCC",
        padding: "24px 28px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#495057",
          margin: "0 0 12px",
        }}
      >
        {title}
      </p>
      {value !== undefined ? (
        <p style={{ fontSize: 32, fontWeight: 600, color: "#1E1E1E", margin: 0 }}>
          {value}
          {unit && (
            <span style={{ fontSize: 16, fontWeight: 400, color: "#495057", marginLeft: 4 }}>
              {unit}
            </span>
          )}
        </p>
      ) : (
        <p style={{ fontSize: 15, color: "#495057", margin: 0, lineHeight: 1.5 }}>
          {qualitative}
        </p>
      )}
      <div style={{ marginTop: 10 }}>
        <SourcePopover label={sourceLabel} source={source} assumption={assumption} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [viewingAs, setViewingAs] = useState<Role | "">("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setViewingAs(p.role || "CEO");
  }, []);

  useEffect(() => {
    if (!viewingAs) return;
    const cfg = getRoleConfig(viewingAs as Role);
    const greeting = cfg.agentGreeting();
    setMessages([
      {
        role: "assistant",
        content: greeting,
        citations: [
          { type: "row", ref: "voltara_boms.csv · 262 rows" },
          { type: "row", ref: "voltara_spend_cube.csv · 1,109 rows" },
        ],
      },
    ]);
  }, [viewingAs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const effectiveProfile: UserProfile = {
    ...profile,
    role: (viewingAs as Role) || profile.role,
  };

  const roleCfg = viewingAs ? getRoleConfig(viewingAs as Role) : null;
  const systemPrompt = buildSystemPrompt(effectiveProfile);

  async function sendMessage(text: string) {
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          profile: effectiveProfile,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, citations: data.citations },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F5", display: "flex", flexDirection: "column" }}>
      {/* Sub-header */}
      <div
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #CCCCCC",
          padding: "14px 48px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#495057" }}>Viewing as:</span>
        <div style={{ display: "flex", gap: 0 }}>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setViewingAs(r)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: viewingAs === r ? 600 : 400,
                color: viewingAs === r ? "#FFFFFF" : "#495057",
                background: viewingAs === r ? "#7823DC" : "transparent",
                border: "1px solid",
                borderColor: viewingAs === r ? "#7823DC" : "#CCCCCC",
                marginRight: -1,
                cursor: "pointer",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Split layout */}
      <div style={{ flex: 1, display: "flex", maxWidth: 1440, width: "100%", margin: "0 auto", padding: "0 48px" }}>
        {/* Left: Dashboard ~60% */}
        <div
          style={{
            flex: "0 0 60%",
            paddingTop: 40,
            paddingRight: 40,
            paddingBottom: 60,
            overflowY: "auto",
            maxHeight: "calc(100vh - 112px)",
          }}
        >
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 600, color: "#1E1E1E", margin: "0 0 4px" }}>
              {viewingAs || "Dashboard"}
            </h2>
            {roleCfg && (
              <p style={{ fontSize: 14, color: "#495057", margin: 0 }}>{roleCfg.emphasis}</p>
            )}
          </div>

          {/* KPI Cards */}
          <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
            <KPICard
              title="Time to market"
              qualitative="Lead times range 3–14 weeks across product families. No launch-to-ship data available in sample files."
              source="A2: No launch-to-ship data in voltara_product_master.csv · lead_time_weeks column only"
              assumption
              sourceLabel="A2"
            />
            <KPICard
              title="Cost"
              value={`$${(VOLTARA_STATS.totalYearlySpendUsd / 1_000_000).toFixed(1)}M`}
              unit="/ yr"
              source={`${VOLTARA_STATS.sources.spend.file} · ${VOLTARA_STATS.sources.spend.rows} rows · extended_usd sum`}
              sourceLabel="SRC"
            />
            <KPICard
              title="Complexity"
              value={String(VOLTARA_STATS.distinctPartNumbers)}
              unit="part numbers"
              source={`${VOLTARA_STATS.sources.bom.file} · ${VOLTARA_STATS.sources.bom.rows} BOM lines · part_number column`}
              sourceLabel="SRC"
            />
          </div>

          {/* BOM breakdown */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #CCCCCC",
              padding: "24px 28px",
              marginBottom: 24,
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#1E1E1E",
                margin: "0 0 20px",
                letterSpacing: "0.02em",
              }}
            >
              BOM overview
              <SourcePopover
                label="SRC"
                source="voltara_boms.csv · 262 rows · voltara_product_master.csv · 6 rows"
              />
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #CCCCCC" }}>
                  {["Product", "ID", "BOM Lines", "Lead time (weeks)", "Family"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "6px 12px 10px 0",
                        fontWeight: 600,
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#495057",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRODUCTS_DATA.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: i < PRODUCTS_DATA.length - 1 ? "1px solid #F0F0F0" : "none" }}
                  >
                    <td style={{ padding: "10px 12px 10px 0", fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: "10px 12px 10px 0", color: "#495057", fontFamily: "monospace", fontSize: 11 }}>
                      {p.id}
                    </td>
                    <td style={{ padding: "10px 12px 10px 0" }}>{p.bomLines}</td>
                    <td style={{ padding: "10px 12px 10px 0" }}>{p.leadTimeWeeks}</td>
                    <td style={{ padding: "10px 12px 10px 0", color: "#495057" }}>{p.family}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Platforming index — pending engine */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #CCCCCC",
              padding: "24px 28px",
              marginBottom: 24,
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#1E1E1E",
                margin: "0 0 16px",
              }}
            >
              Platforming index score
              <PendingBadge />
            </h3>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                { label: "Reuse rate", key: "reusePct" },
                { label: "Decision ownership", key: "decisionOwnershipScore" },
                { label: "Incentives", key: "incentivesScore" },
                { label: "New complexity / yr", key: "newComplexityScore" },
                { label: "Overall index (0–100)", key: "indexScore" },
              ].map(({ label }) => (
                <div
                  key={label}
                  style={{
                    flex: "1 1 140px",
                    border: "1px solid #CCCCCC",
                    padding: "14px 16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#495057",
                      margin: "0 0 8px",
                    }}
                  >
                    {label}
                  </p>
                  <p style={{ fontSize: 20, fontWeight: 600, color: "#CCCCCC", margin: 0 }}>—</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#d97706", marginTop: 14, marginBottom: 0 }}>
              Engine has not run yet. Scores will appear here once{" "}
              <code style={{ fontFamily: "monospace" }}>data/derived/placeholder.json</code> is
              populated.
            </p>
          </div>

          {/* Role-specific suggested questions */}
          {roleCfg && (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #CCCCCC",
                padding: "24px 28px",
              }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1E1E1E",
                  margin: "0 0 16px",
                }}
              >
                Questions for {viewingAs}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {roleCfg.suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    style={{
                      textAlign: "left",
                      padding: "10px 16px",
                      border: "1px solid #CCCCCC",
                      background: "#F5F5F5",
                      fontSize: 13,
                      color: "#1E1E1E",
                      cursor: "pointer",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Agent panel ~40% */}
        <div
          style={{
            flex: "0 0 40%",
            borderLeft: "1px solid #CCCCCC",
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 112px)",
            position: "sticky",
            top: 112,
          }}
        >
          {/* Agent header */}
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #CCCCCC",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1E1E1E" }}>
                Advisor · {viewingAs || "—"}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  border: "1px solid #CCCCCC",
                  color: "#495057",
                  padding: "2px 8px",
                }}
              >
                Stub mode
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPrompt((s) => !s)}
              style={{
                fontSize: 11,
                color: "#7823DC",
                border: "1px solid #7823DC",
                background: "transparent",
                padding: "4px 10px",
                cursor: "pointer",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              {showPrompt ? "Hide" : "View"} system prompt
            </button>
          </div>

          {/* System prompt drawer */}
          {showPrompt && (
            <div
              style={{
                background: "#0D0D0D",
                borderBottom: "1px solid #333",
                padding: 16,
                maxHeight: 220,
                overflowY: "auto",
                flexShrink: 0,
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#d4d4d4",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {systemPrompt}
              </pre>
            </div>
          )}

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: msg.role === "user" ? "#7823DC" : "#495057",
                  }}
                >
                  {msg.role === "user" ? "You" : "Advisor"}
                </div>
                <div
                  style={{
                    background: msg.role === "user" ? "#F5F5F5" : "#FFFFFF",
                    border: "1px solid #CCCCCC",
                    padding: "12px 16px",
                    fontSize: 13,
                    color: "#1E1E1E",
                    lineHeight: 1.6,
                  }}
                >
                  {msg.content}
                </div>
                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {msg.citations.map((c, ci) => (
                      <span
                        key={ci}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          color: c.type === "assumption" ? "#d97706" : "#7823DC",
                          border: `1px solid ${c.type === "assumption" ? "#d97706" : "#7823DC"}`,
                          padding: "2px 8px",
                        }}
                      >
                        {c.ref}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#495057",
                  }}
                >
                  Advisor
                </div>
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #CCCCCC",
                    padding: "12px 16px",
                    fontSize: 13,
                    color: "#495057",
                  }}
                >
                  Thinking…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #CCCCCC",
              background: "#FFFFFF",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                    e.preventDefault();
                    sendMessage(input.trim());
                  }
                }}
                placeholder="Ask about cost, parts, or platforming…"
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: "1px solid #CCCCCC",
                  fontSize: 13,
                  color: "#1E1E1E",
                  background: "#F5F5F5",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                type="button"
                disabled={!input.trim() || loading}
                onClick={() => input.trim() && sendMessage(input.trim())}
                style={{
                  padding: "10px 18px",
                  background: input.trim() && !loading ? "#7823DC" : "#CCCCCC",
                  color: "#FFFFFF",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: input.trim() && !loading ? "pointer" : "default",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
