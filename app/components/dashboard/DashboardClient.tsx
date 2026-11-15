"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserProfile, EMPTY_PROFILE, Role } from "@/lib/types";
import { loadProfile } from "@/lib/profile";
import { buildSystemPrompt } from "@/lib/agent/buildSystemPrompt";
import { roleViewFor } from "@/lib/roleViews";
import { FUNCTION_IDENTITY, shortRole } from "@/lib/roles";
import { FUNCTION_ICON } from "@/components/ui/FunctionIcons";
import { FunctionName, functionFor } from "@/lib/survey";
import { VoltaraData } from "@/lib/voltaraData";
import { SurveyFile } from "@/lib/survey";
import { Decision, Rule } from "@/lib/rules";
import { computeIndex } from "@/lib/index";
import {
  AlignmentDecision,
  AlignmentQuestionId,
  applyAlignment,
} from "@/lib/alignment";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import Tile from "@/components/ui/Tile";
import Badge from "@/components/ui/Badge";
import Field from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import Sparkle from "@/components/ui/Sparkle";
import PriceSpreadPanel from "./PriceSpreadPanel";
import ExplodedView from "./ExplodedView";
import IndexStrip from "./IndexStrip";
import PartsTab from "./PartsTab";
import AlignmentTab from "./AlignmentTab";
import SourcePopover, { SourceHit } from "./SourcePopover";
import { useActivity } from "./ActivityTable";

type TabId = "summary" | "inventory" | "alignment";

/** The three prompts under the assistant's first message, per tab. */
const TAB_QUESTIONS: Record<TabId, string[] | null> = {
  summary: null, // the role's own suggested questions
  inventory: [
    "Which part should we consolidate first?",
    "Why do names differ across products?",
    "What needs engineering review?",
  ],
  alignment: [
    "Where do we disagree most?",
    "Who should own part decisions?",
    "What does the data say about variants?",
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
  basis,
}: {
  data: VoltaraData;
  survey: SurveyFile;
  basis?: string;
}) {
  const [profile, setProfile] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [tab, setTab] = useState<TabId>("summary");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<boolean | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  /** Clicking a function on the index block reads the same score as them. */
  const [roleOverride, setRoleOverride] = useState<Role | "">("");
  const [source, setSource] = useState<SourceHit | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [alignment, setAlignment] = useState<AlignmentDecision[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  // Rules shape both the check and the assistant's instructions, so they live
  // here rather than inside the tab that happens to display them.
  const refresh = useCallback(async () => {
    try {
      const [r, d, a] = await Promise.all([
        fetch("/api/rules").then((res) => res.json()),
        fetch("/api/part-decision").then((res) => res.json()),
        fetch("/api/alignment").then((res) => res.json()),
      ]);
      setRules(r.rules ?? []);
      setDecisions(d.decisions ?? []);
      setAlignment(a.alignment ?? []);
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

  // The score is computed from the parts list, the survey and the decisions
  // recorded so far, so the strip and the prompt read the same arithmetic.
  const index = computeIndex(data, applyAlignment(survey, alignment), decisions);
  const liveData = { ...data, index };

  const role = (roleOverride || profile.role || "CEO") as Role;
  // Stable between renders, so the orbit does not restart on every poll.
  const viewProfile = useMemo(() => ({ ...profile, role }), [profile, role]);
  const fn = functionFor(role) ?? "CEO";
  const identity = FUNCTION_IDENTITY[fn];
  const FnIcon = FUNCTION_ICON[fn];
  const view = roleViewFor(role);
  const kpis = view.kpis(data);
  const systemPrompt = buildSystemPrompt(profile, liveData, survey, rules);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `You are viewing as ${shortRole(role)}. Click any number on this page to ask why, or type a question.`,
      },
    ]);
  }, [role]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, busy]);

  /** A brief is written to be pasted somewhere else, so it can be copied. */
  async function copyReply(index: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard can be blocked; the text is selectable either way */
    }
  }

  async function decide(question: AlignmentQuestionId, choice: string) {
    await fetch("/api/alignment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, choice, source: "dashboard" }),
    });
    await refresh();
  }

  async function undo(question: AlignmentQuestionId) {
    await fetch(`/api/alignment?question=${question}`, { method: "DELETE" });
    await refresh();
  }

  async function resetDemo() {
    await fetch("/api/rules", { method: "DELETE" });
    await refresh();
  }

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

  return (
    <div className="h-[calc(100vh-44px)] bg-surface">
      <div className="mx-auto flex h-full max-w-shell flex-col px-12">
        <PageHeader
          parent="Voltara Power Systems"
          section="Platforming Index"
          title={`${shortRole(role)} view`}
          titleIcon={<FnIcon size={24} />}
        />

        <Tabs
          active={tab}
          onSelect={(id) => setTab(id as TabId)}
          items={[
            { id: "summary", label: "Summary" },
            { id: "inventory", label: "Inventory" },
            { id: "alignment", label: "Alignment" },
          ]}
        />

        {/* Two columns: the page scrolls on the left, the assistant holds the
            right from the tab row to the bottom of the window. */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* Main column */}
          <div className="min-h-0 overflow-y-auto pb-10 pr-1">
            {tab === "summary" && (
              <div className="space-y-5">
                <IndexStrip
                  data={liveData}
                  basis={basis}
                  meaning={identity.meaning(data, index.score)}
                  fn={fn}
                  onFunction={(f: FunctionName) =>
                    setRoleOverride(FUNCTION_IDENTITY[f].role)
                  }
                />
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {[
                    {
                      label: `Your unit: ${identity.unit}`,
                      value: identity.figure(data, index.score).value,
                      source: identity.figure(data, index.score).source,
                      question: `What does ${identity.figure(data, index.score).value} ${identity.unit} mean for ${shortRole(role)}?`,
                      answer: () => "",
                      icon: true,
                    },
                    ...kpis.slice(0, 3),
                  ].map((k, i) => (
                    <button
                      key={k.label}
                      type="button"
                      data-kpi={i}
                      onClick={() => ask(k.question)}
                      className="h-full text-left transition-opacity hover:opacity-80"
                    >
                      <Tile className="h-full">
                        <div className="flex h-full min-h-[104px] flex-col justify-between gap-4">
                          <p className="flex items-start gap-2 text-[14px] font-semibold leading-snug text-text">
                            {"icon" in k && <FnIcon size={16} />}
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

                <PriceSpreadPanel data={data} onAsk={ask} />

                <ExplodedView data={data} onAsk={ask} />

                <p className="text-[12px] leading-relaxed text-text-3">
                  Sample company and sample data. The score is computed from
                  the parts list and the survey; there is no peer benchmark
                  yet. A price gap is not booked savings.
                </p>
              </div>
            )}

            {tab === "inventory" && (
              <PartsTab
                data={data}
                onAsk={ask}
                onTag={(po) => setSource(data.rowsByPo[po] ?? null)}
              />
            )}

            {tab === "alignment" && (
              <AlignmentTab
                data={data}
                survey={survey}
                profile={viewProfile}
                alignment={alignment}
                onDecide={decide}
                onUndo={undo}
                onAsk={ask}
                onReset={resetDemo}
              />
            )}
          </div>

            {/* Assistant: the whole right column, floor to ceiling */}
            <aside className="min-h-0 pb-6">
              <div className="flex h-full min-h-[460px] flex-col bg-panel p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-3">
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text">
                      <Sparkle />
                      Assistant
                    </h2>
                    <Badge>
                      <span className="flex items-center gap-[6px]">
                        <FnIcon size={12} />
                        Answering for {shortRole(role)}
                      </span>
                    </Badge>
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
                        <div className="flex gap-3 rounded-field bg-panel-2 px-4 py-3">
                          <span className="mt-[3px] shrink-0 text-text-2">
                            <Sparkle />
                          </span>
                          <div className="min-w-0 flex-1">
                            {m.content ? (
                              <>
                                <Reply
                                  text={m.content}
                                  onTag={(po) => setSource(data.rowsByPo[po] ?? null)}
                                />
                                {i > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => copyReply(i, m.content)}
                                    className="mt-3 text-[12px] text-text-3 underline-offset-4 transition-colors hover:text-text-2 hover:underline"
                                  >
                                    {copied === i ? "Copied" : "Copy"}
                                  </button>
                                )}
                              </>
                            ) : (
                              <p className="text-[14px] text-text-3">Thinking…</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-5 shrink-0">
                  {messages.length === 1 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(TAB_QUESTIONS[tab] ?? view.suggested).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => ask(q)}
                          className="rounded-field border border-line-2 bg-transparent px-3 py-[6px] text-left text-[12px] leading-snug text-text-2 transition-colors hover:border-text-2 hover:text-text"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
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
