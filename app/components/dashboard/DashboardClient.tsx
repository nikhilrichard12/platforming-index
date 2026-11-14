"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UserProfile, EMPTY_PROFILE, Role } from "@/lib/types";
import { loadProfile } from "@/lib/profile";
import { buildSystemPrompt } from "@/lib/agent/buildSystemPrompt";
import { roleViewFor } from "@/lib/roleViews";
import { Part, VoltaraData, usd } from "@/lib/voltaraData";
import { SurveyFile } from "@/lib/survey";
import { Decision, Rule, liveIndex } from "@/lib/rules";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import Tile from "@/components/ui/Tile";
import Badge from "@/components/ui/Badge";
import Field from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import GapChart from "./GapChart";
import ExplodedView from "./ExplodedView";
import IndexStrip from "./IndexStrip";
import PartsTab from "./PartsTab";
import NewProductTab from "./NewProductTab";
import AlignmentTab from "./AlignmentTab";
import CheckTab from "./CheckTab";
import ConnectionsTab from "./ConnectionsTab";
import SourcePopover, { SourceHit } from "./SourcePopover";
import { useActivity } from "./ActivityTable";

type TabId =
  | "summary"
  | "parts"
  | "newproduct"
  | "alignment"
  | "check"
  | "connections";

/** The three prompts under the assistant's first message, per tab. */
const TAB_QUESTIONS: Record<TabId, string[] | null> = {
  summary: null, // the role's own suggested questions
  parts: [
    "Which part should we consolidate first?",
    "Why do names differ across products?",
    "What needs engineering review?",
  ],
  newproduct: [
    "How much of this concept already exists?",
    "Which needs force a new part number?",
    "What would a common core give the next product?",
  ],
  alignment: [
    "Where do we disagree most?",
    "Who should own part decisions?",
    "What does the data say about variants?",
  ],
  connections: [
    "Which systems feed this data?",
    "Where does the check appear?",
    "How does a decision change the score?",
  ],
  check: [
    "Which rules are in force right now?",
    "What does a new part number cost us?",
    "Why does an exception not lower the score?",
  ],
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const TAG = /\[(PO\d{6}|product_master|survey|kearney_survey)\]/g;

/** What each non-PO evidence tag reads as on screen. */
const TAG_LABEL: Record<string, string> = {
  product_master: "Product master",
  survey: "Survey",
  kearney_survey: "Kearney survey, 2026",
};

/** Renders an assistant reply: paragraphs, bullets, and clickable evidence tags. */
function Reply({
  text,
  onTag,
}: {
  text: string;
  onTag: (po: string) => void;
}) {
  const blocks = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const inline = (line: string) => {
    const out: React.ReactNode[] = [];
    let last = 0;
    for (const m of line.matchAll(TAG)) {
      const tag = m[1];
      if (m.index! > last) out.push(line.slice(last, m.index));
      out.push(
        tag.startsWith("PO") ? (
          <button
            key={`${tag}-${m.index}`}
            type="button"
            onClick={() => onTag(tag)}
            className="mx-[2px] rounded-field border border-line-2 px-[5px] py-px font-mono text-[11px] text-text-2 transition-colors hover:border-text-2 hover:text-text"
          >
            {tag}
          </button>
        ) : (
          <span
            key={`${tag}-${m.index}`}
            className="mx-[3px] whitespace-nowrap rounded-field bg-panel px-[6px] py-px text-[11px] text-text-3"
          >
            {TAG_LABEL[tag] ?? tag}
          </span>
        )
      );
      last = m.index! + m[0].length;
    }
    if (last < line.length) out.push(line.slice(last));
    return out;
  };

  return (
    <div className="space-y-3">
      {blocks.map((b, i) =>
        /^[-•]\s+/.test(b) ? (
          <p key={i} className="pl-4 -indent-4 text-[14px] leading-relaxed text-text-2">
            {inline(b.replace(/^[-•]\s+/, "- "))}
          </p>
        ) : (
          <p key={i} className="text-[14px] leading-relaxed text-text-2">
            {inline(b)}
          </p>
        )
      )}
    </div>
  );
}

export default function DashboardClient({
  data,
  survey,
}: {
  data: VoltaraData;
  survey: SurveyFile;
}) {
  const [profile, setProfile] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [tab, setTab] = useState<TabId>("summary");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<boolean | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [source, setSource] = useState<SourceHit | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  // Rules shape both the check and the assistant's instructions, so they live
  // here rather than inside the tab that happens to display them.
  const refresh = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([
        fetch("/api/rules").then((res) => res.json()),
        fetch("/api/part-decision").then((res) => res.json()),
      ]);
      setRules(r.rules ?? []);
      setDecisions(d.decisions ?? []);
    } catch {
      /* the tables simply stay empty */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // A decision recorded in the panel or the extension lands in the activity
  // log first. Re-read rules and decisions whenever it moves, so the score and
  // the tables follow a call made outside this browser tab.
  const { activity: latest } = useActivity(1, true);
  const latestId = latest[0]?.id;
  useEffect(() => {
    if (latestId) refresh();
  }, [latestId, refresh]);

  // Complexity control moves with recorded reuses, so the strip and the
  // prompt both read the computed score rather than the file's baseline.
  const index = liveIndex(data.index, decisions);
  const liveData = { ...data, index };

  const role = (profile.role || "CEO") as Role;
  const view = roleViewFor(role);
  const kpis = view.kpis(data);
  const systemPrompt = buildSystemPrompt(profile, liveData, survey, rules);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `You are viewing as ${role}. Click any number on this page to ask why, or type a question.`,
      },
    ]);
  }, [role]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, busy]);

  async function ask(question: string) {
    if (busy || !question.trim()) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m, i) => i > 0 || m.role === "user"),
          profile: { ...profile, role },
        }),
      });
      setLive(res.headers.get("X-Agent-Mode") === "live");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "The assistant could not be reached. Try again." },
      ]);
      setLive(false);
    } finally {
      setBusy(false);
    }
  }

  function askAboutPart(part: Part) {
    ask(
      `Why is the yearly price gap on the ${part.name} ${usd(part.gap)}, and what would close it?`
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-shell px-12 pb-16">
        <PageHeader
          parent="Voltara Power Systems"
          section="Platforming Index"
          title={`${role} view`}
        />

        <Tabs
          active={tab}
          onSelect={(id) => setTab(id as TabId)}
          items={[
            { id: "summary", label: "Summary" },
            { id: "parts", label: "Parts" },
            { id: "newproduct", label: "New product" },
            { id: "alignment", label: "Alignment" },
            { id: "check", label: "Decisions" },
            { id: "connections", label: "Connections" },
          ]}
        />

        {/* The score leads the page, full width above the split. */}
        {tab === "summary" && (
          <div className="pt-8">
            <IndexStrip data={liveData} />
          </div>
        )}

        <div
          className={`grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] ${
            tab === "summary" ? "pt-5" : "pt-8"
          }`}
        >
          {/* Main column */}
          <div>
            {tab === "summary" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {kpis.map((k, i) => (
                    <button
                      key={k.label}
                      type="button"
                      data-kpi={i}
                      onClick={() => ask(k.question)}
                      className="h-full text-left transition-opacity hover:opacity-80"
                    >
                      <Tile className="h-full">
                        <div className="flex h-full min-h-[104px] flex-col justify-between gap-4">
                          <p className="text-[14px] font-semibold leading-snug text-text">
                            {k.label}
                          </p>
                          <div className="text-right">
                            <p
                              className={`font-light leading-none text-text ${
                                k.value.length > 10 ? "text-[24px]" : "text-[30px]"
                              }`}
                            >
                              {k.value}
                            </p>
                            <p className="mt-2 truncate text-[12px] text-text-3">
                              {k.source}
                            </p>
                          </div>
                        </div>
                      </Tile>
                    </button>
                  ))}
                </div>

                <div className="bg-panel p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-[15px] font-semibold text-text">
                      Yearly price gap by part
                    </h2>
                    <span className="text-[12px] text-text-3">
                      Eight largest of {data.summary.sharedParts} shared parts
                    </span>
                  </div>
                  <div className="mt-4">
                    <GapChart parts={data.byGap.slice(0, 8)} onAsk={askAboutPart} />
                  </div>
                </div>

                <ExplodedView data={data} onAsk={ask} />

                <p className="text-[12px] leading-relaxed text-text-3">
                  Sample company and sample data. The score method and the peer
                  benchmark are provisional. A price gap is not booked savings.
                </p>
              </div>
            )}

            {tab === "parts" && (
              <PartsTab
                data={data}
                onAsk={ask}
                onTag={(po) => setSource(data.rowsByPo[po] ?? null)}
              />
            )}

            {tab === "newproduct" && (
              <NewProductTab onTag={(po) => setSource(data.rowsByPo[po] ?? null)} />
            )}

            {tab === "check" && (
              <CheckTab
                rules={rules}
                decisions={decisions}
                onRefresh={refresh}
                onTag={(po) => setSource(data.rowsByPo[po] ?? null)}
              />
            )}

            {tab === "connections" && <ConnectionsTab />}

            {tab === "alignment" && (
              <AlignmentTab
                data={data}
                survey={survey}
                profile={{ ...profile, role }}
                onTag={(po) => setSource(data.rowsByPo[po] ?? null)}
              />
            )}
          </div>

            {/* Assistant */}
            <aside className="lg:sticky lg:top-[60px] lg:self-start">
              <div className="flex max-h-[calc(100vh-88px)] min-h-[560px] flex-col bg-panel p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-[15px] font-semibold text-text">Assistant</h2>
                    <Badge>Answering for {role}</Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPrompt((s) => !s)}
                    className="text-[13px] text-text-3 underline-offset-4 transition-colors hover:text-text-2 hover:underline"
                  >
                    {showPrompt ? "Hide instructions" : "View instructions"}
                  </button>
                </div>

                {showPrompt && (
                  <pre className="mt-4 max-h-[260px] shrink-0 overflow-auto whitespace-pre-wrap break-words bg-surface p-4 font-mono text-[11px] leading-relaxed text-text-2">
                    {systemPrompt}
                  </pre>
                )}

                <div ref={threadRef} className="mt-4 flex-1 space-y-5 overflow-y-auto">
                  {messages.map((m, i) => (
                    <div key={i}>
                      {m.role === "user" ? (
                        <div className="flex justify-end">
                          <p className="max-w-[85%] rounded-field border border-text px-3 py-2 text-[14px] leading-relaxed text-text">
                            {m.content}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-field bg-panel-2 px-4 py-3">
                          {m.content ? (
                            <Reply
                              text={m.content}
                              onTag={(po) => setSource(data.rowsByPo[po] ?? null)}
                            />
                          ) : (
                            <p className="text-[14px] text-text-3">Thinking…</p>
                          )}
                        </div>
                      )}
                      {i === 0 && messages.length === 1 && (
                        <div className="mt-4 space-y-2">
                          {(TAB_QUESTIONS[tab] ?? view.suggested).map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => ask(q)}
                              className="block text-left text-[13px] text-text-2 underline-offset-4 transition-colors hover:text-text hover:underline"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-5 shrink-0">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Field label="Ask about any number" dense>
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && input.trim()) {
                              e.preventDefault();
                              ask(input.trim());
                            }
                          }}
                          placeholder="Where should I start?"
                          className="w-full bg-transparent py-1 text-[14px] text-text placeholder:text-text-3 focus:outline-none"
                        />
                      </Field>
                    </div>
                    <Button onClick={() => ask(input.trim())} disabled={busy || !input.trim()}>
                      Send
                    </Button>
                  </div>
                  {live !== null && (
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`block h-[6px] w-[6px] rounded-full ${
                          live ? "bg-positive" : "bg-warn"
                        }`}
                      />
                      <span className="text-[12px] text-text-3">
                        {live ? "Live" : "Offline: fixed answers"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </aside>
        </div>
      </div>

      {source && <SourcePopover hit={source} onClose={() => setSource(null)} />}
    </div>
  );
}
