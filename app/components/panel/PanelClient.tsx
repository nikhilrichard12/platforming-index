"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Field from "@/components/ui/Field";
import { Button, PrimaryButton } from "@/components/ui/Button";
import MatchCard from "./MatchCard";
import InterfaceCards, { NewThinkingCard } from "./InterfaceCards";
import PartsYouBuy, { StageLegend } from "./PartsYouBuy";
import type { ProductStageHandle } from "./ProductStage";
import {
  ASK_FLOOR,
  PlanResult,
  PlanSummary,
  PlannedNeed,
  SAMPLE_CONCEPT,
  interfaceLine,
} from "@/lib/plan";
import { ReasonKind, reasonLabel } from "@/lib/rules";
import {
  EMPTY_CONTEXT,
  PANEL_CONTEXT,
  PANEL_READY,
  PageContext,
  TEST_PROFILE,
  panelQuestions,
  planSubject,
  productFromTitle,
  readStored,
  stageCounts,
  stageItemsFor,
  textKey,
  writeStored,
} from "@/lib/panel";
import {
  HIGHLIGHT_PARTS,
  PART_KEYS,
  PartKey,
  resolveHeroParts,
} from "@/lib/models/product";
import { subjectFor } from "@/lib/models/parts";
import { VoltaraData } from "@/lib/voltaraData";

// Three.js is large and only runs in the browser, so it loads on its own.
const ProductStage = dynamic(() => import("./ProductStage"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-panel" />,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function PanelClient({ data }: { data: VoltaraData }) {
  const [ctx, setCtx] = useState<PageContext>(EMPTY_CONTEXT);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");

  // Every result from the page is a new search. A card the reader stepped to, and
  // a part picked from the switcher, belong to one search and die with it.
  const [search, setSearch] = useState(0);
  const [picked, setPicked] = useState<{ search: number; index: number } | null>(null);
  const [ov, setOv] = useState<{ search: number; need: PlannedNeed } | null>(null);
  const [replayNonce, setReplayNonce] = useState(0);
  const overrideRequest = useRef(0);
  const stage = useRef<ProductStageHandle>(null);

  /** Interfaces adopted and needs proposed on this page, this search. */
  const [adopted, setAdopted] = useState<string[]>([]);
  const [proposed, setProposed] = useState<string[]>([]);
  const [settled, setSettled] = useState<string[]>([]);
  const [recording, setRecording] = useState("");

  const [declining, setDeclining] = useState(false);
  const [reasonKind, setReasonKind] = useState<ReasonKind | "">("");
  const [reasonText, setReasonText] = useState("");
  const [note, setNote] = useState("");

  const [askName, setAskName] = useState("");
  const [askText, setAskText] = useState("");
  const [chips, setChips] = useState<string[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  // Raises if the data no longer says what the 3D models were drawn from.
  const heroParts = useMemo(() => resolveHeroParts(data.parts), [data.parts]);

  const product = plan?.product.name ?? "";

  // A result opens on the whole page: every need it raised, drawn together.
  // Picking a row, or the switcher, steps down to one part.
  const cardIndex = picked && picked.search === search ? picked.index : -1;
  const override = ov && ov.search === search ? ov.need : null;

  // ONE current part drives the header line, the match card and the 3D view,
  // so the three cannot disagree. The switcher changes it; so does a new search.
  const need: PlannedNeed | null =
    override ?? (plan && cardIndex >= 0 ? plan.needs[cardIndex] ?? null : null);
  const currentPart = need?.part ? data.parts.find((p) => p.name === need.part) : undefined;
  const partGroupId = currentPart?.id;

  // The stage draws what this page needs, and nothing else: one shape per
  // need, coloured by what it landed on. Stepping into a need shows that part
  // alone; with no page read it shows the whole inverter.
  const items = useMemo(
    () => (plan ? stageItemsFor(plan.needs, data.parts) : []),
    [plan, data.parts]
  );
  const counts = useMemo(() => stageCounts(items), [items]);
  const partSubject = useMemo(() => subjectFor(currentPart), [currentPart]);
  const pageSubject = useMemo(() => planSubject(items), [items]);
  const subject = partSubject ?? pageSubject;
  const activeTab: PartKey | null = PART_KEYS.find((k) => HIGHLIGHT_PARTS[k].partId === currentPart?.id) ?? null;

  // Each result is a new search: it replaces the plan, drops any override and
  // replays the 3D sequence.
  const applyPlan = useCallback((next: PlanResult | null) => {
    setPlan(next);
    setSearch((s) => s + 1);
    setDeclining(false);
    setNote("");
    setAdopted([]);
    setProposed([]);
    setSettled([]);
  }, []);

  /* ---------- which card ---------- */

  function showCard(i: number) {
    if (!plan) return;
    overrideRequest.current++;
    setOv(null);
    setPicked({ search, index: Math.max(0, Math.min(plan.needs.length - 1, i)) });
    setDeclining(false);
    setNote("");
    setReplayNonce((n) => n + 1);
  }

  /**
   * The switcher is a manual override for demos. The header line, the card and
   * the 3D view all follow it, and the next search on the page puts it back.
   */
  async function pickPart(key: PartKey) {
    const part = heroParts[key];
    const request = ++overrideRequest.current;
    const forSearch = search;
    const i = plan?.needs.findIndex((n) => n.part === part.name) ?? -1;

    if (plan && i >= 0) {
      // The page already asked about this part: use its card.
      setOv(null);
      setPicked({ search: forSearch, index: i });
    } else {
      try {
        const res = await fetch("/api/plan-product", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-pi-source": "extension" },
          // quiet: looking at a part by hand leaves no entry in the activity log
          body: JSON.stringify({
            product_name: product || ctx.title || "This page",
            needs: [part.name],
            quiet: true,
          }),
        });
        const result = (await res.json()) as PlanResult;
        if (!res.ok || !result.needs[0]) throw new Error("no result");
        if (request !== overrideRequest.current) return; // a newer pick came first
        setOv({ search: forSearch, need: result.needs[0] });
        setError("");
      } catch {
        if (request === overrideRequest.current) setError("That part could not be checked.");
        return;
      }
    }
    setDeclining(false);
    setNote("");
    setReplayNonce((n) => n + 1);
  }

  /* ---------- reading the page ---------- */

  const check = useCallback(
    async (context: PageContext, opts: { force?: boolean } = {}) => {
      const body = (context.selection || context.text || "").trim();
      const name = productFromTitle(context.title);
      const key = textKey(body);

      if (!opts.force) {
        // A stored result is only the right answer if the page still says the
        // same thing. A chat keeps its address when a new answer arrives.
        const stored = readStored<PlanResult>(context.url);
        if (stored && stored.textKey === key) {
          applyPlan(stored.plan);
          setChips([]);
          setStale(true);
          return;
        }
      }
      if (!body) {
        applyPlan(null);
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
          applyPlan(null);
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
          applyPlan(result);
          setChips([]);
          writeStored(context.url, {
            at: new Date().toISOString(),
            title: context.title,
            product: result.product.name,
            plan: result,
            textKey: key,
          });
        }
      } catch {
        setError("The check could not be reached.");
      } finally {
        setBusy(false);
      }
    },
    [applyPlan]
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
    n: PlannedNeed,
    decision: "reuse" | "exception",
    extra: Record<string, unknown> = {}
  ) {
    await fetch("/api/part-decision", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pi-source": "extension" },
      body: JSON.stringify({
        description: n.need,
        product: product || "This page",
        decision,
        matchedPart: n.part,
        suggestedPn: n.partNumber,
        role: TEST_PROFILE.role,
        source: "extension",
        ...extra,
      }),
    });
  }

  /**
   * Designing to an interface is a decision about the boundary, not about one
   * part, so it is recorded once and settles every need it covers.
   */
  async function adopt(iface: PlanSummary["interfaces"][number]) {
    setRecording(iface.id);
    try {
      await fetch("/api/part-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pi-source": "extension" },
        body: JSON.stringify({
          description: iface.spec,
          product: product || ctx.title || "This page",
          decision: "interface_adopted",
          interfaceId: iface.id,
          interfaceName: iface.name,
          covers: iface.needs,
          role: TEST_PROFILE.role,
          source: "extension",
        }),
      });
      setAdopted((a) => [...new Set([...a, iface.id])]);
      setSettled((s) => [...new Set([...s, ...iface.needs])]);
      setNote(
        `Designing to ${iface.name}. ${iface.needs.length} ${
          iface.needs.length === 1 ? "need" : "needs"
        } settled, and the brackets, harness and tests come with it.`
      );
    } catch {
      setError("That decision could not be recorded.");
    } finally {
      setRecording("");
    }
  }

  /** A need with nothing behind it, named so the next product can find it. */
  async function propose(n: PlannedNeed) {
    setRecording(n.need);
    try {
      await fetch("/api/part-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pi-source": "extension" },
        body: JSON.stringify({
          description: n.need,
          product: product || ctx.title || "This page",
          decision: "interface_proposed",
          covers: [n.need],
          role: TEST_PROFILE.role,
          source: "extension",
        }),
      });
      setProposed((p) => [...new Set([...p, n.need])]);
      setNote(`Proposed ${n.need} as a new interface. The next product will find it.`);
    } catch {
      setError("That proposal could not be recorded.");
    } finally {
      setRecording("");
    }
  }

  async function reuse(n: PlannedNeed) {
    stage.current?.reassemble(); // the part snaps back in, the model reassembles
    await record(n, "reuse");
    setNote(`Reusing ${n.partNumber} for ${product}. Recorded.`);
  }

  async function sendException(n: PlannedNeed) {
    if (!reasonKind) return;
    await record(n, "exception", { reasonKind, reasonText });
    setNote(
      `Exception recorded as ${reasonLabel(reasonKind)}. A rule now covers ${n.part}. The score does not drop.`
    );
    setDeclining(false);
    setReasonKind("");
    setReasonText("");
  }

  /* ---------- the assistant ---------- */

  useEffect(() => {
    if (answerRef.current) answerRef.current.scrollTop = answerRef.current.scrollHeight;
  }, [messages, thinking]);

  async function ask(question: string) {
    if (thinking || !question.trim()) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setAnswerOpen(true);
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
        applyPlan(result);
        setStale(false);
        writeStored(ctx.url, {
          at: new Date().toISOString(),
          title: ctx.title,
          product: result.product.name,
          plan: result,
          // The page as it is now, so reopening it on the same text finds this.
          textKey: textKey((ctx.selection || ctx.text || "").trim()),
        });
      })
      .catch(() => setError("The check could not be reached."))
      .finally(() => setBusy(false));
  }

  /* ---------- the header's two lines ---------- */

  const line1 = plan ? plan.product.name : ctx.title || askName || "No product yet";
  const line2 = need
    ? `Looking for ${need.part ?? need.need}`
    : plan
    ? `${plan.summary.total} needs read from this page`
    : busy
    ? "Reading the page"
    : "Tell the panel what you are working on";

  const lastPair = messages.slice(-2);

  return (
    <div className="relative flex h-dvh flex-col gap-2 overflow-hidden bg-surface px-3 pb-0 pt-3">
      {/* 1) header strip: two lines, then the part switcher */}
      <div className="shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] text-text" title={line1}>
              {line1}
            </p>
            <p className="mt-[2px] truncate text-[12px] text-text-2" title={line2}>
              {line2}
            </p>
          </div>
          <Badge>Sample data</Badge>
        </div>

        <div className="mt-2 flex gap-1" role="group" aria-label="Parts to show">
          {PART_KEYS.map((k) => {
            const on = activeTab === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                title={HIGHLIGHT_PARTS[k].name}
                onClick={() => pickPart(k)}
                className={`h-[26px] min-w-0 flex-1 truncate border px-2 text-[12px] transition-colors ${
                  on
                    ? "border-text bg-transparent text-text"
                    : "border-line bg-panel-2 text-text-2 hover:text-text"
                }`}
              >
                {HIGHLIGHT_PARTS[k].short}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2) what this page needs, drawn: one shape per need, nothing else */}
      {plan && (
        <p className="shrink-0 text-[12px] leading-snug text-text">
          {interfaceLine(plan.summary)}
        </p>
      )}

      <div className="relative min-h-[140px] flex-[0_1_30%]">
        <div className="absolute inset-0">
          <ProductStage
            ref={stage}
            subject={subject}
            playNonce={search + replayNonce}
          />
        </div>
      </div>

      {plan && items.length > 0 && (
        <div className="shrink-0">
          <StageLegend counts={counts} />
        </div>
      )}

      {/* 3) the layers: interfaces first, then the parts already bought */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
        {error && <p className="text-[12px] text-risk">{error}</p>}
        {note && <p className="bg-panel p-2 text-[12px] leading-snug text-text-2">{note}</p>}

        {plan && (
          <>
            {stale && (
              <button
                type="button"
                onClick={() => check(ctx, { force: true })}
                className="h-[22px] rounded-full border border-line-2 bg-panel-2 px-3 text-[11px] text-text transition-colors hover:border-text-2"
              >
                Check page again
              </button>
            )}

            <InterfaceCards
              interfaces={plan.summary.interfaces}
              adopted={adopted}
              busy={recording}
              onAdopt={adopt}
            />

            <NewThinkingCard
              needs={plan.needs.filter((n) => n.landing === "new")}
              proposed={proposed}
              busy={recording}
              onPropose={propose}
            />

            <PartsYouBuy
              needs={plan.needs}
              settled={settled}
              selected={need?.need}
              onPick={(n) => showCard(plan.needs.indexOf(n))}
            />
          </>
        )}

        {/* the part card, once a reader steps into one */}
        {need && (
          <MatchCard
            need={need}
            index={plan ? Math.max(0, cardIndex) : 0}
            total={plan ? plan.needs.length : 1}
            partGroupId={partGroupId}
            note=""
            declining={declining}
            reasonKind={reasonKind}
            reasonText={reasonText}
            onPrev={() => showCard(Math.max(0, cardIndex) - 1)}
            onNext={() => showCard(Math.max(0, cardIndex) + 1)}
            onReuse={() => reuse(need)}
            onToggleDecline={() => setDeclining((d) => !d)}
            onReasonKind={setReasonKind}
            onReasonText={setReasonText}
            onSendException={() => sendException(need)}
          />
        )}

        {busy && !plan && <p className="bg-panel p-3 text-[13px] text-text-2">Reading the page.</p>}

        {/* nothing readable: ask instead of showing an empty panel */}
        {!plan && !busy && (
          <div className="space-y-2 bg-panel p-3">
            <p className="text-[14px] text-text">What product are you working on?</p>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChips(chips.filter((x) => x !== c))}
                    title="Remove"
                    className="max-w-full truncate border border-line bg-panel-2 px-2 py-[3px] text-[11px] text-text-2 transition-colors hover:border-line-2 hover:text-text"
                  >
                    {c} ×
                  </button>
                ))}
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
                rows={2}
                placeholder={"Cooling fan, axial, 120 mm\nDC link capacitor"}
                className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-text placeholder:text-text-3 focus:outline-none"
              />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setAskName(SAMPLE_CONCEPT.name);
                  setAskText(SAMPLE_CONCEPT.description);
                }}
                className="text-[12px] text-text-2 underline-offset-4 transition-colors hover:text-text hover:underline"
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

      {/* 4) the assistant */}
      <div className="relative -mx-3 mt-auto shrink-0 border-t border-line bg-panel px-3 pb-3 pt-2">
        {answerOpen && lastPair.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 z-20 mb-2 bg-panel-2 p-3 shadow-none">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 text-[12px] text-text">{lastPair[0]?.content}</p>
              <button
                type="button"
                onClick={() => setAnswerOpen(false)}
                aria-label="Close answer"
                className="shrink-0 text-[12px] text-text-2 transition-colors hover:text-text"
              >
                Close
              </button>
            </div>
            <div ref={answerRef} className="mt-2 max-h-[30vh] overflow-y-auto border-t border-line pt-2">
              <p className="text-[12px] leading-relaxed text-text-2">
                {lastPair[1]?.content || (thinking ? "Thinking" : "")}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-[12px]">
            <span className="font-semibold text-text">Assistant</span>{" "}
            <span className="text-text-3">Answering for {TEST_PROFILE.role}</span>
          </p>
          <a
            href="/dashboard"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[12px] text-text-2 underline-offset-4 transition-colors hover:text-text hover:underline"
          >
            See more in dashboard
          </a>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {panelQuestions(product).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              title={q}
              className="max-w-full truncate border border-line bg-panel-2 px-2 py-[3px] text-[11px] text-text-2 transition-colors hover:border-line-2 hover:text-text"
            >
              {q}
            </button>
          ))}
        </div>

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
