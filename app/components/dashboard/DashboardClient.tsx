"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserProfile, EMPTY_PROFILE, Role } from "@/lib/types";
import { loadProfile } from "@/lib/profile";
import { buildSystemPrompt } from "@/lib/agent/buildSystemPrompt";
import { FUNCTION_IDENTITY, shortRole } from "@/lib/roles";
import { FUNCTION_ICON } from "@/components/ui/FunctionIcons";
import { functionFor } from "@/lib/survey";
import { VoltaraData, deriveVoltaraData } from "@/lib/voltaraData";
import { emphasisFor, groupOf, roleFromParam, tilesFor } from "@/lib/roleHighlights";
import { SurveyFile } from "@/lib/survey";
import { Decision, Rule } from "@/lib/rules";
import { computeIndexFor } from "@/lib/index";
import { Grouping, GroupingId, reviewedGrouping, regroup } from "@/lib/grouping";
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
import CountUpFigure from "@/components/ui/CountUpFigure";
import PriceSpreadPanel from "./PriceSpreadPanel";
import ExplodedView from "./ExplodedView";
import IndexStrip from "./IndexStrip";
import PartsTab from "./PartsTab";
import AlignmentTab from "./AlignmentTab";
import SourcePopover, { SourceHit } from "./SourcePopover";
import { useActivity } from "./ActivityTable";

type TabId = "summary" | "inventory" | "alignment";

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

/** Three dots that pulse in turn while the assistant is working on an answer. */
function ThinkingDots() {
  return (
    <span role="status" aria-label="The assistant is answering" className="flex h-[21px] items-center gap-[6px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-[7px] w-[7px] animate-pulse rounded-full bg-text-3 motion-reduce:animate-none"
          style={{ animationDelay: `${i * 180}ms`, animationDuration: "1s" }}
        />
      ))}
    </span>
  );
}

/** The dots always show for at least this long, so an instant answer is still preceded by them. */
const MIN_DOTS_MS = 450;

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
  grouping,
  reuse,
}: {
  data: VoltaraData;
  survey: SurveyFile;
  /** The matcher's own groups. */
  grouping: Grouping;
  /** Still sent by the page; the Inventory tab no longer shows what it feeds. */
  evaluation?: unknown;
  reviewQueue?: unknown;
  /** How much of the sample concept starts from an interface that exists. */
  reuse?: {
    concept: string;
    needs: number;
    startFromSomethingBuilt: number;
    onInterface: number;
    newThinking: number;
  };
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
  /** ?role=cfo|engineering|sales|ceo, for demos. It overrides the survey role. */
  const [urlRole, setUrlRole] = useState<Role | "">("");
  const [source, setSource] = useState<SourceHit | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [alignment, setAlignment] = useState<AlignmentDecision[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfile(loadProfile());
    setUrlRole(roleFromParam(new URLSearchParams(window.location.search).get("role")));
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

  // Which grouping of the 252 part numbers the page is reading: the reviewed
  // one, the groups an engineer confirmed. The Matcher only / After review
  // switch is gone, so this stays put, and every figure that depends on
  // grouping reads from it.
  const [groupingView] = useState<GroupingId>("reviewed");
  const reviewed = useMemo(() => reviewedGrouping(data), [data]);
  const shownGrouping = groupingView === "matcher" ? grouping : reviewed;
  const shownData = useMemo(
    () =>
      groupingView === "matcher"
        ? deriveVoltaraData(regroup(data, grouping))
        : data,
    [groupingView, data, grouping]
  );

  // The score is computed from the parts list, the survey and the decisions
  // recorded so far, so the strip and the prompt read the same arithmetic.
  const index = computeIndexFor(
    data,
    shownGrouping,
    applyAlignment(survey, alignment),
    decisions
  );
  const liveData = { ...shownData, index };

  const role = (urlRole || profile.role || "CEO") as Role;
  // Stable between renders, so the orbit does not restart on every poll.
  const viewProfile = useMemo(() => ({ ...profile, role }), [profile, role]);
  const fn = functionFor(role) ?? "CEO";
  const identity = FUNCTION_IDENTITY[fn];
  const FnIcon = FUNCTION_ICON[fn];
  // Same data and layout for every role; the role decides which existing metrics lead.
  const group = groupOf(role);
  const kpis = tilesFor(group, shownData);
  const emphasis = emphasisFor(group);
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
    const askedAt = Date.now();

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
      // Demo answers arrive at once. Hold them back so the dots are seen first;
      // a live answer keeps streaming into the buffer meanwhile.
      const wait = MIN_DOTS_MS - (Date.now() - askedAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
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
          section="PlatInform"
          title={`${shortRole(role)} view`}
          titleIcon={<FnIcon size={24} />}
        />

        <Tabs
          active={tab}
          onSelect={(id) => setTab(id as TabId)}
          items={[
            { id: "summary", label: "Summary" },
            { id: "inventory", label: "Inventory" },
            { id: "alignment", label: "Alignment", lead: emphasis.has("alignment") },
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
                  fn={fn}
                  roleLabel={shortRole(role)}
                  emphasis={emphasis}
                  reuse={reuse}
                  onNextSteps={() =>
                    ask(`What should I do next as ${shortRole(role)}? Recommend next steps from this analysis.`)
                  }
                />
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {[
                    {
                      label: `Your unit: ${identity.unit}`,
                      value: identity.figure(shownData, index.score).value,
                      source: identity.figure(shownData, index.score).source,
                      question: `What does ${identity.figure(shownData, index.score).value} ${identity.unit} mean for ${shortRole(role)}?`,
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
                              <CountUpFigure value={k.value} />
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

                <PriceSpreadPanel
                  key={groupingView}
                  data={shownData}
                  onAsk={ask}
                />

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
                emphasis={emphasis}
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
                              <ThinkingDots />
                            )}
                          </div>
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
                  {live && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="block h-[6px] w-[6px] rounded-full bg-positive" />
                      <span className="text-[12px] text-text-3">Live</span>
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
