"use client";

import dynamic from "next/dynamic";
import { animate, utils } from "animejs";
import useReducedMotion from "@/components/ui/useReducedMotion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Field from "@/components/ui/Field";
import { Button, PrimaryButton } from "@/components/ui/Button";
import MatchCard from "./MatchCard";
import InterfaceCards, { InterfaceCardData, NewThinkingCard } from "./InterfaceCards";
import PartsYouBuy, { StageLegend } from "./PartsYouBuy";
import type { InterfaceStageHandle, StageCluster, StageMatch } from "./InterfaceStage";
import {
  ASK_FLOOR,
  PlanResult,
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
  goalFrom,
  goalHeadline,
  panelQuestions,
  partsOfProduct,
  productFromTitle,
  readStored,
  resolveProduct,
  stageCounts,
  stageFigures,
  stageItemsFor,
  stageLabelFor,
  textKey,
  writeStored,
} from "@/lib/panel";
import { shellFor } from "@/lib/models/productScene";
import { PlatformInterface } from "@/lib/interfaces";
import { shortRole } from "@/lib/roles";
import { PRODUCT_MASTER, VoltaraData, usd } from "@/lib/voltaraData";

// Three.js is large and only runs in the browser, so it loads on its own.
const InterfaceStage = dynamic(() => import("./InterfaceStage"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-panel" />,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * The headline, with its first number counting up once the stage has landed.
 * The sentence is the answer; the count is what makes a reader look at it.
 */
function CountingLine({ text, run }: { text: string; run: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const done = useRef("");

  useEffect(() => {
    const el = ref.current;
    if (!el || !run || done.current === text) return;
    done.current = text;
    const m = /^([^\d]*)(\d+)([\s\S]*)$/.exec(text);
    if (!m || reduced) {
      el.textContent = text;
      return;
    }
    const target = Number(m[2]);
    const counter = { v: 0 };
    animate(counter, {
      v: target,
      duration: 600,
      ease: "outQuad",
      modifier: utils.round(0),
      onUpdate: () => {
        el.textContent = `${m[1]}${Math.round(counter.v)}${m[3]}`;
      },
      onComplete: () => {
        el.textContent = text;
      },
    });
  }, [text, run, reduced]);

  return <span ref={ref}>{text}</span>;
}

export default function PanelClient({
  data,
  interfaces,
}: {
  data: VoltaraData;
  /** The interfaces the company already has, curated sample data. */
  interfaces: PlatformInterface[];
}) {
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
  const overrideRequest = useRef(0);
  const stage = useRef<InterfaceStageHandle>(null);
  /** An interface the reader is pointing at, on the stage or on a card. */
  const [hovered, setHovered] = useState<string | null>(null);
  /** True once the stage sequence has landed, so the figures can count in. */
  const [landed, setLanded] = useState(false);

  /** Interfaces adopted and needs proposed on this page, this search. */
  const [adopted, setAdopted] = useState<string[]>([]);
  const [proposed, setProposed] = useState<string[]>([]);
  const [settledNeeds, setSettledNeeds] = useState<string[]>([]);
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

  const product = plan?.product.name ?? "";

  // A result opens on the whole product. Picking a row steps down to one part.
  const cardIndex = picked && picked.search === search ? picked.index : -1;
  const override = ov && ov.search === search ? ov.need : null;
  const need: PlannedNeed | null =
    override ?? (plan && cardIndex >= 0 ? plan.needs[cardIndex] ?? null : null);
  const currentPart = need?.part ? data.parts.find((p) => p.name === need.part) : undefined;
  const partGroupId = currentPart?.id;

  const items = useMemo(
    () => (plan ? stageItemsFor(plan.needs, data.parts) : []),
    [plan, data.parts]
  );
  const counts = useMemo(() => stageCounts(items), [items]);

  /* ---------- one product, and the interfaces lit on it ---------- */

  const matched = useMemo(() => plan?.summary.interfaces ?? [], [plan]);

  // Which product this page is about: the one it names, or the one that
  // shares the most interfaces with what it needs.
  const shown = useMemo(() => {
    const text = `${ctx.title} ${ctx.selection || ctx.text || ""}`;
    return resolveProduct(
      text,
      PRODUCT_MASTER.map((p) => ({ id: p.id, name: p.name })),
      matched,
      (id) => partsOfProduct(data.parts, id).length
    );
  }, [ctx.title, ctx.text, ctx.selection, matched, data.parts]);

  const productParts = useMemo(
    () => (shown ? partsOfProduct(data.parts, shown.id) : []),
    [shown, data.parts]
  );

  /** One card per matched interface, with the parts this product carries. */
  const cards = useMemo<(InterfaceCardData & { partIds: string[] })[]>(() => {
    const full = new Map(interfaces.map((i) => [i.id, i]));
    const here = new Set(productParts.map((p) => p.id));
    return matched.map((m) => {
      const source = full.get(m.id);
      const partIds = (source?.parts ?? []).filter((id) => here.has(id));
      return {
        id: m.id,
        name: m.name,
        subsystem: m.subsystem,
        spec: m.spec,
        products: m.products,
        since: m.since,
        inherits: m.inherits,
        needs: m.needs,
        partIds,
        partNames: partIds.map(
          (id) => data.parts.find((p) => p.id === id)?.name ?? id
        ),
      };
    });
  }, [matched, interfaces, productParts, data.parts]);

  /**
   * Goal mode. A page that names what it is building rather than what it is
   * made of still has an answer: every interface the company already has in
   * that subsystem, for that product.
   */
  const pageText = useMemo(
    () => `${ctx.title} ${ctx.selection || ctx.text || ""}`,
    [ctx.title, ctx.text, ctx.selection]
  );
  const partLike = plan?.needs.filter((n) => n.part).length ?? 0;
  const goal = useMemo(() => goalFrom(pageText), [pageText]);
  const goalMode = Boolean(goal && shown && partLike < 3);

  const goalInterfaces = useMemo(() => {
    if (!goalMode || !goal || !shown) return [];
    return interfaces.filter(
      (i) =>
        goal.subsystems.includes(i.subsystem) && i.products.includes(shown.id)
    );
  }, [goalMode, goal, shown, interfaces]);

  /** What the stage lights: the page's own interfaces, or the goal's. */
  const liveCards = useMemo<(InterfaceCardData & { partIds: string[] })[]>(() => {
    if (!goalMode) return cards;
    const here = new Set(productParts.map((p) => p.id));
    return goalInterfaces.map((i) => {
      const partIds = i.parts.filter((id) => here.has(id));
      return {
        id: i.id,
        name: i.name,
        subsystem: i.subsystem,
        spec: i.spec,
        products: i.products,
        since: i.since,
        inherits: i.inherits,
        needs: [],
        partIds,
        partNames: partIds.map(
          (id) => data.parts.find((p) => p.id === id)?.name ?? id
        ),
      };
    });
  }, [goalMode, cards, goalInterfaces, productParts, data.parts]);

  /** Only an interface with parts in this product can light on the stage. */
  const stageClusters = useMemo<StageCluster[]>(
    () =>
      liveCards
        .filter((c) => c.partIds.length > 0)
        .map((c) => ({
          id: c.id,
          partIds: c.partIds,
          label: stageLabelFor(c),
        })),
    [liveCards]
  );

  /** The parts the stage calls out, in the order the page named them. */
  const stageMatched = useMemo<StageMatch[]>(() => {
    if (goalMode) {
      const seen = new Set<string>();
      return liveCards
        .flatMap((c) => c.partIds)
        .filter((id) => !seen.has(id) && seen.add(id))
        .map((id) => ({
          partId: id,
          label: data.parts.find((p) => p.id === id)?.name ?? id,
        }));
    }
    const out: StageMatch[] = [];
    for (const need of plan?.needs ?? []) {
      const part = need.part ? data.parts.find((p) => p.name === need.part) : undefined;
      if (part && !out.some((m) => m.partId === part.id)) {
        out.push({ partId: part.id, label: part.name });
      }
    }
    return out;
  }, [goalMode, liveCards, plan, data.parts]);

  /** Needs with nothing behind them get an empty slot on the stage. */
  const newCount = goalMode
    ? 0
    : plan?.needs.filter((n) => !n.part).length ?? 0;

  /** Three figures, from the parts this page matched. */
  const figures = useMemo(() => {
    const parts = stageMatched
      .map((m) => data.parts.find((p) => p.id === m.partId))
      .filter(Boolean) as VoltaraData["parts"];
    return stageFigures(parts, usd, goalMode);
  }, [stageMatched, data.parts, goalMode]);

  const headline = goalMode && goal && shown
    ? goalHeadline(goal, shown.id, goalInterfaces)
    : plan
      ? interfaceLine(plan.summary)
      : "";

  // Each result is a new search: it replaces the plan and drops any override.
  const applyPlan = useCallback((next: PlanResult | null) => {
    setPlan(next);
    setSearch((s) => s + 1);
    setDeclining(false);
    setNote("");
    setAdopted([]);
    setProposed([]);
    setSettledNeeds([]);
    setHovered(null);
    setLanded(false);
  }, []);

  /* ---------- which card ---------- */

  function showCard(i: number) {
    if (!plan) return;
    overrideRequest.current++;
    setOv(null);
    setPicked({ search, index: Math.max(0, Math.min(plan.needs.length - 1, i)) });
    setDeclining(false);
    setNote("");
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
        if (
          stored &&
          stored.textKey === key &&
          // Results saved before interfaces existed lack this field; recheck those.
          Array.isArray(stored.plan?.summary?.interfaces)
        ) {
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
        // A page that says what it is building has an answer even with no
        // parts named, so it goes to the stage, not to the ask form.
        const statesGoal = Boolean(goalFrom(`${context.title} ${body}`));
        if (!statesGoal && result.needs.length < ASK_FLOOR && result.summary.covered === 0) {
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
  async function adopt(iface: InterfaceCardData) {
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
      stage.current?.pulse(iface.id);
      setSettledNeeds((s) => [...new Set([...s, ...iface.needs])]);
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
    : goalMode
    ? "No parts named yet. This is what already exists."
    : plan
    ? `${plan.summary.total} needs read from this page`
    : busy
    ? "Reading the page"
    : "Tell the panel what you are working on";

  const lastPair = messages.slice(-2);

  return (
    <div className="relative flex h-dvh flex-col gap-2 overflow-hidden bg-surface px-3 pb-0 pt-3">
      {/* 1) header strip: what the page is, and what it is about */}
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

      </div>

      {/* 2) one product, with the interfaces this page lands on lit */}
      {headline && (
        <p className="shrink-0 text-[12px] leading-snug text-text">
          <CountingLine text={headline} run={landed} />
        </p>
      )}

      {(plan || goalMode) && shown && !shown.named && (
        <p className="shrink-0 text-[12px] text-text-3">
          Closest existing product: {shown.id}
        </p>
      )}

      <div className="relative h-[400px] shrink-0">
        <div className="absolute inset-0">
          {(plan || goalMode) && shown && productParts.length > 0 ? (
            <InterfaceStage
              ref={stage}
              productId={shown.id}
              parts={productParts}
              matched={stageMatched}
              clusters={stageClusters}
              newCount={newCount}
              shell={shellFor(shown.id)}
              hovered={hovered}
              onHover={setHovered}
              onSelect={(id) => stage.current?.pulse(id)}
              onSettled={() => setLanded(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-panel px-6 text-center">
              <p className="text-[12px] leading-snug text-text-3">
                {busy ? "Reading the page" : "No page read yet."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3) what this page is worth, and the word itself */}
      {figures.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1">
          {figures.map((f) => (
            <p key={f.label} className="text-[12px] leading-snug text-text-2">
              <span className="tabular-nums text-text">{f.value}</span>{" "}
              <span className="text-text-3">{f.label}</span>
            </p>
          ))}
        </div>
      )}


      <p className="shrink-0 text-[12px] leading-snug text-text-2">
        An interface is a group of parts that connect the same way across
        products. Design to it and you inherit everything already built around
        it.
      </p>

      {plan && items.length > 0 && stageClusters.length === 0 && (
        <div className="shrink-0">
          <StageLegend counts={counts} />
        </div>
      )}

      {/* 4) the layers: interfaces first, then the parts already bought */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
        {error && <p className="text-[12px] text-risk">{error}</p>}
        {note && <p className="bg-panel p-2 text-[12px] leading-snug text-text-2">{note}</p>}

        {(plan || goalMode) && (
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
              interfaces={liveCards}
              adopted={adopted}
              busy={recording}
              hovered={hovered}
              onAdopt={adopt}
              onHover={setHovered}
              onSelect={(id) => stage.current?.pulse(id)}
            />

            {plan && liveCards.length === 0 && (
              <NewThinkingCard
                needs={plan.needs.filter((n) => n.landing === "new")}
                proposed={proposed}
                busy={recording}
                onPropose={propose}
              />
            )}

            {plan && (
            <PartsYouBuy
              needs={plan.needs}
              settled={settledNeeds}
              selected={need?.need}
              onPick={(n) => showCard(plan.needs.indexOf(n))}
            />
            )}
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

        {busy && !plan && !goalMode && (
          <p className="bg-panel p-3 text-[13px] text-text-2">Reading the page.</p>
        )}

        {/* nothing readable: ask instead of showing an empty panel */}
        {!plan && !goalMode && !busy && (
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

      {/* 5) the assistant: one bar, and a sheet when it is wanted */}
      <div className="relative -mx-3 mt-auto shrink-0 border-t border-line bg-panel">
        <button
          type="button"
          onClick={() => setAnswerOpen((v) => !v)}
          aria-expanded={answerOpen}
          className="flex h-12 w-full items-center justify-between gap-3 px-3 text-left"
        >
          <span className="min-w-0 truncate text-[12px]">
            <span className="font-semibold text-text">Assistant</span>{" "}
            <span className="text-text-3">
              {thinking ? "Thinking" : `Answering for ${shortRole(TEST_PROFILE.role)}`}
            </span>
          </span>
          <span className="shrink-0 text-[12px] text-text-2">
            {answerOpen ? "Close" : "Ask"}
          </span>
        </button>

        {answerOpen && (
          <div className="absolute bottom-full left-0 right-0 z-30 max-h-[60vh] overflow-y-auto border-t border-line bg-panel px-3 pb-3 pt-3">
            {lastPair.length > 0 && (
              <div className="mb-3 bg-panel-2 p-3">
                <p className="text-[12px] text-text">{lastPair[0]?.content}</p>
                <div
                  ref={answerRef}
                  className="mt-2 max-h-[30vh] overflow-y-auto border-t border-line pt-2"
                >
                  <p className="text-[12px] leading-relaxed text-text-2">
                    {lastPair[1]?.content || (thinking ? "Thinking" : "")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
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

            <a
              href="/dashboard"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-[12px] text-text-2 underline-offset-4 transition-colors hover:text-text hover:underline"
            >
              See more in dashboard
            </a>
          </div>
        )}
      </div>

    </div>
  );
}
