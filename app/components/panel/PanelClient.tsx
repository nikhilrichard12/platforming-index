"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Field from "@/components/ui/Field";
import { Button, PrimaryButton } from "@/components/ui/Button";
import ReasonPicker from "@/components/ui/ReasonPicker";
import CountUp from "@/components/ui/CountUp";
import PartMergeAnimation from "@/components/dashboard/PartMergeAnimation";
import NeedsExplodedView from "./NeedsExplodedView";
import { ORIGIN_ADJECTIVE, originLine } from "@/lib/origin";
import {
  ASK_FLOOR,
  PlanResult,
  PlannedNeed,
  SAMPLE_CONCEPT,
  headline,
} from "@/lib/plan";
import {
  Decision,
  IndexShape,
  ReasonKind,
  Rule,
  reasonLabel,
} from "@/lib/rules";
import {
  EMPTY_CONTEXT,
  PANEL_CONTEXT,
  PANEL_READY,
  PageContext,
  TEST_PROFILE,
  panelQuestions,
  productFromTitle,
  readStored,
  writeStored,
} from "@/lib/panel";
import { Part, VoltaraData, px } from "@/lib/voltaraData";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STATUS_TONE: Record<string, "positive" | "neutral" | "warn" | "risk"> = {
  "in core": "positive",
  shared: "neutral",
  "exists, unique": "neutral",
  "blocked by rule": "risk",
  "new part needed": "warn",
};

export default function PanelClient({ data }: { data: VoltaraData }) {
  const [ctx, setCtx] = useState<PageContext>(EMPTY_CONTEXT);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");

  const [rules, setRules] = useState<Rule[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [index, setIndex] = useState<IndexShape>(data.index);

  const [exception, setException] = useState<number | null>(null);
  const [reasonKind, setReasonKind] = useState<ReasonKind | "">("");
  const [reasonText, setReasonText] = useState("");
  const [note, setNote] = useState("");

  const [askName, setAskName] = useState("");
  const [askText, setAskText] = useState("");
  const [chips, setChips] = useState<string[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  const product = plan?.product.name ?? "";

  /* ---------- the decision store ---------- */

  const refresh = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([
        fetch("/api/rules").then((res) => res.json()),
        fetch("/api/part-decision").then((res) => res.json()),
      ]);
      setRules(r.rules ?? []);
      setDecisions(d.decisions ?? []);
      setIndex((await fetch("/api/index?quiet=1").then((res) => res.json())).index);
    } catch {
      /* the panel keeps what it had */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ---------- reading the page ---------- */

  const check = useCallback(
    async (context: PageContext, opts: { force?: boolean } = {}) => {
      const body = (context.selection || context.text || "").trim();
      const name = productFromTitle(context.title);

      if (!opts.force) {
        const stored = readStored<PlanResult>(context.url);
        if (stored) {
          setPlan(stored.plan);
          setChips([]);
          setStale(true);
          return;
        }
      }
      if (!body) {
        setPlan(null);
        setAskName(name);
        return;
      }

      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/plan-product", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-pi-source": "extension" },
          body: JSON.stringify({
            product_name: name || context.title || "This page",
            text: body,
          }),
        });
        const result = (await res.json()) as PlanResult;
        if (!res.ok) {
          setError("That page could not be checked.");
          return;
        }
        setStale(false);
        if (result.needs.length < ASK_FLOOR && result.summary.covered === 0) {
          // Too little to show and nothing matched. Ask, and show what was read.
          setPlan(null);
          setAskName(name || productFromTitle(context.title));
          setChips(
            // A phrase can be both a need and something the reader looked at.
            // Chips are keyed and removed by their text, so each must be unique.
            Array.from(
              new Set([
                ...result.needs.map((n) => n.need),
                // What the reader looked at, minus one word scraps.
                ...(result.considered ?? []).filter(
                  (c) => c.length > 10 && c.trim().split(/\s+/).length >= 2
                ),
              ])
            ).slice(0, 6)
          );
        } else {
          setPlan(result);
          setChips([]);
          writeStored(context.url, {
            at: new Date().toISOString(),
            title: context.title,
            product: result.product.name,
            plan: result,
          });
        }
      } catch {
        setError("The check could not be reached.");
      } finally {
        setBusy(false);
      }
    },
    []
  );

  // Context arrives from the extension by message, or from the query string
  // when the panel is opened directly for testing.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery: PageContext = {
      url: params.get("url") ?? "",
      title: params.get("title") ?? "",
      text: params.get("text") ?? "",
      selection: params.get("selection") ?? "",
    };
    if (fromQuery.text || fromQuery.selection || fromQuery.url) {
      setCtx(fromQuery);
      check(fromQuery);
    }

    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || msg.type !== PANEL_CONTEXT) return;
      const next: PageContext = {
        url: String(msg.url ?? ""),
        title: String(msg.title ?? ""),
        text: String(msg.text ?? ""),
        selection: String(msg.selection ?? ""),
      };
      setCtx(next);
      check(next);
    }

    window.addEventListener("message", onMessage);
    window.parent?.postMessage({ type: PANEL_READY }, "*");
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- decisions from the panel ---------- */

  async function record(
    need: PlannedNeed,
    decision: "reuse" | "exception",
    extra: Record<string, unknown> = {}
  ) {
    await fetch("/api/part-decision", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pi-source": "extension" },
      body: JSON.stringify({
        description: need.need,
        product: product || "This page",
        decision,
        matchedPart: need.part,
        suggestedPn: need.partNumber,
        role: TEST_PROFILE.role,
        source: "extension",
        ...extra,
      }),
    });
    await refresh();
  }

  async function reuse(need: PlannedNeed) {
    await record(need, "reuse");
    setNote(`Reusing ${need.partNumber} for ${product}. Recorded.`);
  }

  async function sendException(need: PlannedNeed) {
    if (!reasonKind) return;
    await record(need, "exception", { reasonKind, reasonText });
    setNote(
      `Exception recorded as ${reasonLabel(reasonKind)}. A rule now covers ${need.part}. The score does not drop.`
    );
    setException(null);
    setReasonKind("");
    setReasonText("");
  }

  /* ---------- the assistant ---------- */

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, thinking]);

  async function ask(question: string) {
    if (thinking || !question.trim()) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          profile: TEST_PROFILE,
          context: {
            url: ctx.url,
            title: ctx.title,
            product,
            needs: plan?.needs.map((n) => `${n.need} (${n.status})`) ?? [],
          },
        }),
      });
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
        { role: "assistant", content: "The assistant could not be reached." },
      ]);
    } finally {
      setThinking(false);
    }
  }

  /* ---------- derived ---------- */

  const matchedParts: Part[] = plan
    ? (plan.needs
        .map((n) => (n.part ? data.parts.find((p) => p.name === n.part) : null))
        .filter((p, i, all): p is Part => !!p && all.indexOf(p) === i) as Part[])
    : [];

  const applicable = rules.filter((r) =>
    plan?.needs.some((n) => n.part === r.appliesToPart)
  );

  function scrollToNeed(i: number) {
    rowsRef.current
      ?.querySelector(`[data-need="${i}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function runAsk() {
    const text = askText.trim();
    if (!text) {
      setError("Describe the product or paste what it needs.");
      return;
    }
    setError("");
    setBusy(true);
    fetch("/api/plan-product", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pi-source": "extension" },
      body: JSON.stringify({
        product_name: askName.trim() || "This page",
        description: [...chips, text].join("\n"),
      }),
    })
      .then((r) => r.json())
      .then((result: PlanResult) => {
        setPlan(result);
        setStale(false);
        writeStored(ctx.url, {
          at: new Date().toISOString(),
          title: ctx.title,
          product: result.product.name,
          plan: result,
        });
      })
      .catch(() => setError("The check could not be reached."))
      .finally(() => setBusy(false));
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex-1 space-y-4 px-4 pb-4 pt-4">
        {/* Who is looking */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[14px] text-text">
              <span className="font-bold">Platforming</span> Index
            </p>
            <p className="mt-[2px] truncate text-[12px] text-text-3">
              {TEST_PROFILE.role} at {TEST_PROFILE.company}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge>Test profile</Badge>
            <Badge>Sample data</Badge>
          </div>
        </div>

        {/* a) the headline */}
        {plan && (
          <div>
            <p className="text-[17px] font-light leading-snug text-text">
              {headline(plan.summary)}
            </p>
            <p className="mt-1 truncate text-[12px] text-text-3" title={ctx.title}>
              {ctx.title || plan.product.name}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {stale && (
                <button
                  type="button"
                  onClick={() => check(ctx, { force: true })}
                  className="h-[26px] rounded-full border border-line-2 bg-panel-2 px-3 text-[12px] text-text transition-colors hover:border-text-2"
                >
                  Check page again
                </button>
              )}
              {busy && <span className="text-[12px] text-text-3">Checking</span>}
            </div>
          </div>
        )}

        {busy && !plan && <p className="text-[13px] text-text-2">Reading the page.</p>}
        {error && <p className="text-[12px] text-risk">{error}</p>}
        {note && <p className="text-[12px] text-text-2">{note}</p>}

        {/* The part numbers converging, once per check */}
        {plan && matchedParts.length > 0 && (
          <PartMergeAnimation
            key={`${plan.product.name}-${plan.needs.length}`}
            data={data}
            parts={matchedParts}
            compact
            title="What this page asks for"
            note="One square per part number Voltara already carries."
            footnote="Click a cluster to open its need below."
            tail={`${plan.summary.byStatus["in core"]} in the common core`}
            onOpenPart={(partId) => {
              const part = data.parts.find((p) => p.id === partId);
              const i = plan.needs.findIndex((n) => n.part === part?.name);
              if (i >= 0) scrollToNeed(i);
            }}
          />
        )}

        {/* b) reusable parts */}
        {plan && (
          <div ref={rowsRef} className="space-y-2">
            <h2 className="text-[13px] font-semibold text-text">Reusable parts</h2>
            {plan.needs.map((n, i) => (
              <div key={`${n.need}-${i}`} data-need={i} className="bg-panel p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-[13px] leading-snug text-text">
                    {n.need}
                  </p>
                  <Badge tone={STATUS_TONE[n.status] ?? "neutral"}>{n.status}</Badge>
                </div>

                {n.part ? (
                  <>
                    <p className="mt-2 text-[13px] text-text-2">
                      {n.part}{" "}
                      <span className="font-mono text-[11px] text-text-3">
                        {n.partNumber}
                      </span>
                    </p>
                    <p className="mt-1 text-[12px] text-text-3">
                      {px(n.price ?? 0)} from {n.supplier}, {n.origin}{" "}
                      {n.po && <span className="font-mono">[{n.po}]</span>}
                      {n.confidence < 0.6 && (
                        <span className="ml-1 text-text-3">check fit</span>
                      )}
                    </p>
                    {n.complianceSource && (
                      <p className="mt-1 text-[12px] text-text-2">
                        {originLine(n.complianceSource)}
                      </p>
                    )}
                    {n.status !== "blocked by rule" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <PrimaryButton onClick={() => reuse(n)}>Reuse</PrimaryButton>
                        <Button onClick={() => setException(exception === i ? null : i)}>
                          Can&apos;t reuse
                        </Button>
                      </div>
                    )}
                    {exception === i && (
                      <div className="mt-3">
                        <ReasonPicker
                          narrow
                          kind={reasonKind}
                          text={reasonText}
                          onKind={setReasonKind}
                          onText={setReasonText}
                          onSend={() => sendException(n)}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-[12px] text-text-3">
                    No match in the parts data. A new part number is reasonable here.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* c) rules that apply */}
        {plan && applicable.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[13px] font-semibold text-text">Rules that apply</h2>
            {applicable.map((r) => {
              const need = plan.needs.find((n) => n.part === r.appliesToPart);
              return (
                <div key={r.id} className="bg-panel p-3">
                  <p className="text-[13px] text-text">
                    {r.appliesToPart}{" "}
                    <span className="font-mono text-[11px] text-text-3">{r.id}</span>
                  </p>
                  <p className="mt-1 text-[12px] text-text-2">
                    &ldquo;{r.text}&rdquo;{" "}
                    <span className="text-text-3">
                      {reasonLabel(r.kind)}, {r.scope.product}
                    </span>
                  </p>
                  {need?.complianceSource && (
                    <p className="mt-1 text-[12px] text-text">
                      {originLine(need.complianceSource)}{" "}
                      <span className="text-text-3">
                        {ORIGIN_ADJECTIVE[need.complianceSource.origin] ??
                          need.complianceSource.origin}{" "}
                        origin, no new part number
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* d) this product, the score, the last decisions */}
        {plan && (
          <>
            <NeedsExplodedView
              needs={plan.needs}
              parts={data.parts}
              product={plan.product.name}
              onSelect={scrollToNeed}
            />

            <div className="bg-panel p-3">
              <div className="flex items-baseline gap-2">
                <CountUp
                  value={index.score}
                  className="text-[28px] font-light leading-none tabular-nums text-text"
                />
                <span className="text-[12px] text-text-3">of 100</span>
                <span className="text-[12px] text-text-2">Platforming Index</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                {index.dimensions.map((d) => (
                  <div key={d.name}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[11px] text-text-2">{d.name}</span>
                      <CountUp
                        value={d.score}
                        className="shrink-0 text-[11px] tabular-nums text-text-3"
                      />
                    </div>
                    <div className="mt-1 h-[3px] w-full bg-line">
                      <div className="h-full bg-text-2" style={{ width: `${d.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-panel p-3">
              <h2 className="text-[13px] font-semibold text-text">Recent decisions</h2>
              {decisions.length === 0 ? (
                <p className="mt-2 text-[12px] text-text-3">Nothing recorded yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {decisions.slice(0, 3).map((d) => (
                    <li key={d.id} className="text-[12px] text-text-2">
                      <span className="text-text">{d.description}</span>{" "}
                      <span className="text-text-3">
                        {d.decision === "reuse" ? "reused" : "exception"}, {d.product},{" "}
                        {d.at.slice(11, 16)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* c2) nothing readable: ask instead of showing an empty panel */}
        {!plan && !busy && (
          <div className="space-y-3 bg-panel p-4">
            <p className="text-[15px] text-text">What product are you working on?</p>
            {chips.length > 0 && (
              <div>
                <p className="text-[12px] text-text-3">What the panel read:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setChips(chips.filter((x) => x !== c))}
                      title="Remove"
                      className="max-w-full truncate border border-line bg-panel-2 px-2 py-1 text-[11px] text-text-2 transition-colors hover:border-line-2 hover:text-text"
                    >
                      {c} ×
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Field label="Product name" dense>
              <input
                type="text"
                value={askName}
                onChange={(e) => setAskName(e.target.value)}
                placeholder="VBS-30 Outdoor Battery Cabinet"
                className="w-full bg-transparent py-1 text-[14px] text-text placeholder:text-text-3 focus:outline-none"
              />
            </Field>
            <Field label="Describe it or paste what it needs">
              <textarea
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                rows={5}
                placeholder={"Cooling fan, axial, 120 mm\nDC link capacitor\nEnclosure latch"}
                className="w-full resize-y bg-transparent text-[13px] leading-relaxed text-text placeholder:text-text-3 focus:outline-none"
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setAskName(SAMPLE_CONCEPT.name);
                  setAskText(SAMPLE_CONCEPT.description);
                }}
                className="text-[13px] text-text-2 underline-offset-4 transition-colors hover:text-text hover:underline"
              >
                Load sample concept
              </button>
              <PrimaryButton onClick={runAsk} disabled={busy}>
                Check against the core
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>

      {/* e) the assistant, docked */}
      <div className="sticky bottom-0 border-t border-line bg-panel px-4 pb-3 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-text">Assistant</h2>
          <span className="text-[11px] text-text-3">Answering for {TEST_PROFILE.role}</span>
        </div>

        {messages.length > 0 && (
          <div ref={threadRef} className="mt-2 max-h-[200px] space-y-2 overflow-y-auto">
            {messages.map((m, i) => (
              <p
                key={i}
                className={`text-[12px] leading-relaxed ${
                  m.role === "user" ? "text-text" : "text-text-2"
                }`}
              >
                {m.content || (thinking ? "Thinking" : "")}
              </p>
            ))}
          </div>
        )}

        {messages.length === 0 && (
          <div className="mt-2 space-y-1">
            {panelQuestions(product).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="block text-left text-[12px] text-text-2 transition-colors hover:text-text"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ask(input);
            }}
            placeholder="Ask about this page"
            className="h-[30px] min-w-0 flex-1 rounded-field border border-line-2 bg-transparent px-2 text-[13px] text-text placeholder:text-text-3 focus:outline-none"
          />
          <Button onClick={() => ask(input)} disabled={thinking}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
