"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createTimeline, stagger, utils } from "animejs";
import AnimationPanel from "@/components/ui/AnimationPanel";
import Badge from "@/components/ui/Badge";
import useReducedMotion from "@/components/ui/useReducedMotion";
import { Activity, ActivityDetail, Rule, reasonLabel } from "@/lib/rules";
import { px, usd } from "@/lib/voltaraData";

const STAGE_H = 206;
const SIDE_W = 200;
const CENTER_W = 300;
const BOX_H = 96;
const PN_TOP = 40;
const PN_COLS = 4;
const PN_W = 72;
const PN_H = 17;
const MAX_PN = 12;

interface Shot {
  seq: number;
  detail: ActivityDetail;
  product?: string;
  agent: string;
}

interface Verdict {
  seq: number;
  detail: ActivityDetail;
}

/** The badge the result chip settles with, by what the check actually found. */
function verdictOf(d: ActivityDetail): {
  label: string;
  tone: "positive" | "warn" | "neutral";
  muted?: boolean;
} {
  if (d.level === "match" && d.blocked) return { label: "Blocked by rule", tone: "warn" };
  if (d.level === "match") return { label: "Reuse", tone: "positive" };
  if (d.level === "possible") return { label: "Possible match", tone: "neutral" };
  return { label: "No match", tone: "neutral", muted: true };
}

export default function LiveCheckStage({
  activity,
  scoreLine,
  onScoreMoved,
}: {
  activity: Activity[];
  scoreLine: string;
  onScoreMoved: () => void;
}) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef<HTMLDivElement>(null);
  const resRef = useRef<HTMLDivElement>(null);
  const ruleChipRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<ReturnType<typeof createTimeline> | null>(null);

  const [width, setWidth] = useState(0);
  const [shot, setShot] = useState<Shot | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [tray, setTray] = useState<Rule[]>([]);
  const [idle, setIdle] = useState(true);
  // Once a call has played out, the first two stations keep saying what it
  // asked and what it found, so the stage is never blank between calls.
  const [settled, setSettled] = useState(false);

  const queue = useRef<Activity[]>([]);
  const busy = useRef(false);
  const seen = useRef<Set<string>>(new Set());
  const seq = useRef(0);
  const primed = useRef(false);
  const last = useRef<{ check?: Activity; decision?: Activity }>({});

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geom = useMemo(() => {
    const agentX = 0;
    const centerX = Math.max(0, (width - CENTER_W) / 2);
    const resultX = Math.max(0, width - SIDE_W);
    return {
      agentX,
      centerX,
      resultX,
      chipY: 34,
      convergeX: centerX + (CENTER_W - 140) / 2,
      convergeY: 40,
      trayY: BOX_H + 20,
    };
  }, [width]);

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch("/api/rules");
      setTray((await res.json()).rules ?? []);
    } catch {
      /* the tray keeps what it had */
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  /* The queue: one sequence at a time, in the order the calls arrived. */
  const pump = useCallback(() => {
    if (busy.current) return;
    const next = queue.current.shift();
    if (!next) {
      setIdle(true);
      return;
    }
    busy.current = true;
    setIdle(false);
    seq.current += 1;
    if (next.tool === "check_part" && next.detail) {
      setVerdict(null);
      setShot({
        seq: seq.current,
        detail: next.detail,
        product: next.product,
        agent: next.agentName ?? "Agent",
      });
    } else if (next.tool === "record_decision" && next.detail) {
      setVerdict({ seq: seq.current, detail: next.detail });
    } else {
      busy.current = false;
      pump();
    }
  }, []);

  // New entries from the poll. The first poll only primes the stage with the
  // most recent result, so opening the tab does not replay the whole log.
  useEffect(() => {
    if (activity.length === 0) return;
    const fresh = [...activity].reverse().filter((a) => !seen.current.has(a.id));
    activity.forEach((a) => seen.current.add(a.id));

    if (!primed.current) {
      primed.current = true;
      const lastCheck = activity.find((a) => a.tool === "check_part" && a.detail);
      if (lastCheck?.detail) {
        last.current.check = lastCheck;
        setShot({
          seq: ++seq.current,
          detail: lastCheck.detail,
          product: lastCheck.product,
          agent: lastCheck.agentName ?? "Agent",
        });
      }
      return;
    }

    fresh.forEach((a) => {
      if (a.tool === "check_part") last.current = { check: a };
      if (a.tool === "record_decision") last.current.decision = a;
      if (a.tool === "check_part" || a.tool === "record_decision") queue.current.push(a);
    });
    pump();
  }, [activity, pump]);

  /* Sequence one: the check. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!shot || !stage || width === 0) return;
    const pnEls = Array.from(stage.querySelectorAll<HTMLElement>("[data-pn]"));
    const req = reqRef.current;
    const res = resRef.current;
    if (!req || !res) return;
    const badges = Array.from(res.querySelectorAll<HTMLElement>("[data-reveal]"));

    tlRef.current?.revert();

    const finish = () => {
      setSettled(true);
      busy.current = false;
      pump();
    };

    if (reduced) {
      utils.set(req, { opacity: 0 });
      utils.set(pnEls, { opacity: 0 });
      utils.set(res, { opacity: 1, x: geom.resultX - geom.convergeX + 8, y: 0 });
      utils.set(badges, { opacity: 1 });
      finish();
      return;
    }

    setSettled(false);
    utils.set(req, { opacity: 0, x: 0, y: 0, scale: 0.94 });
    utils.set(pnEls, { opacity: 0, x: 0, y: 0 });
    utils.set(res, { opacity: 0, x: 0, y: 0, scale: 0.94 });
    utils.set(badges, { opacity: 0 });

    const tl = createTimeline({
      defaults: { ease: "outQuad" },
      onComplete: finish,
    });

    tl.add(req, { opacity: 1, scale: 1, duration: 280 }, 0).add(
      req,
      {
        x: geom.centerX - geom.agentX,
        duration: 620,
        ease: "inOutQuad",
      },
      360
    );

    if (pnEls.length > 0) {
      tl.add(req, { opacity: 0, duration: 200 }, 980)
        .add(pnEls, { opacity: 1, duration: 260, delay: stagger(40) }, 1000)
        .add(
          pnEls,
          {
            x: (_t?: unknown, i?: number) =>
              geom.convergeX + 30 - (geom.centerX + 10 + ((i ?? 0) % PN_COLS) * PN_W),
            y: (_t?: unknown, i?: number) =>
              geom.convergeY + 4 - (PN_TOP + Math.floor((i ?? 0) / PN_COLS) * PN_H),
            opacity: 0,
            duration: 520,
            ease: "inOutQuad",
            delay: stagger(24),
          },
          1680
        )
        .add(res, { opacity: 1, scale: 1, duration: 260 }, 2080);
    } else {
      tl.add(req, { opacity: 0, duration: 200 }, 1100).add(
        res,
        { opacity: 1, scale: 1, duration: 280 },
        1180
      );
    }

    tl.add(
      res,
      {
        x: geom.resultX + 8 - geom.convergeX,
        duration: 640,
        ease: "inOutQuad",
      },
      "+=120"
    ).add(badges, { opacity: 1, duration: 300, delay: stagger(80) }, "<+=260");

    tlRef.current = tl;
    // geom and reduced are stable for a given width; shot drives the replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot, width]);

  /* Sequence two: what the engineer decided. */
  useEffect(() => {
    const res = resRef.current;
    if (!verdict || !res) return;
    const mark = res.querySelector<HTMLElement>("[data-decision]");
    const chip = ruleChipRef.current;

    const finish = () => {
      busy.current = false;
      if (verdict.detail.decision === "reuse") onScoreMoved();
      pump();
    };

    if (reduced) {
      if (verdict.detail.decision === "exception") loadRules();
      if (mark) utils.set(mark, { opacity: 1 });
      if (chip) utils.set(chip, { opacity: 0 });
      finish();
      return;
    }

    const tl = createTimeline({ defaults: { ease: "outQuad" }, onComplete: finish });
    if (mark) {
      utils.set(mark, { opacity: 0 });
      tl.add(mark, { opacity: 1, duration: 300 }, 0);
    }
    if (chip && verdict.detail.decision === "exception") {
      utils.set(chip, { opacity: 0, x: 0, y: 0 });
      tl.add(chip, { opacity: 1, duration: 200 }, 200).add(
        chip,
        {
          x: geom.centerX + 10 - (geom.resultX + 8),
          y: geom.trayY + 26 - geom.chipY,
          duration: 760,
          ease: "inOutQuad",
        },
        400
      )
        // The tray gains the rule as the chip lands in it, not before.
        .call(() => loadRules(), 1100)
        .add(chip, { opacity: 0, duration: 200 }, 1120);
    } else {
      tl.add({ duration: 500 }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdict, width]);

  function replayLast() {
    if (!last.current.check) return;
    queue.current = [last.current.check, ...(last.current.decision ? [last.current.decision] : [])];
    busy.current = false;
    tlRef.current?.revert();
    pump();
  }

  const d = shot?.detail;
  const v = d ? verdictOf(d) : null;
  const pns = (d?.partNumbers ?? []).slice(0, MAX_PN);

  /** What the last call asked for, and what the index found for it. */
  const asked = d
    ? `Needs: ${d.description}${shot?.product ? ` for ${shot.product}` : ""}`
    : null;
  const found = !d
    ? null
    : d.level === "match"
    ? `${d.partNumbers?.length ?? 0} part numbers, 1 real part`
    : d.level === "possible"
    ? `${d.candidates?.length ?? 0} possible matches, nothing certain`
    : "No match in the parts data";

  return (
    <AnimationPanel
      title="What the agent just did"
      note="Every call an agent makes through MCP, drawn as it arrives."
      onReplay={replayLast}
      replayLabel="Replay last"
      footnote={
        idle
          ? "Waiting for the next check."
          : `${shot?.agent ?? "Agent"} is calling the check.`
      }
    >
      <div ref={stageRef} className="relative w-full" style={{ height: STAGE_H }}>
        {/* Stations */}
        {[
          { x: geom.agentX, w: SIDE_W, label: "Engineer's agent", body: asked },
          { x: geom.centerX, w: CENTER_W, label: "Platforming Index", body: found },
          { x: geom.resultX, w: SIDE_W, label: "Result", body: null },
        ].map((st) => (
          <div
            key={st.label}
            className="absolute border border-line-2"
            style={{ left: st.x, top: 0, width: st.w, height: BOX_H }}
          >
            <p className="px-3 pt-2 text-[12px] text-text-2">{st.label}</p>
            {st.body && (
              <p
                className={`px-3 pt-3 text-[12px] leading-snug text-text transition-opacity duration-500 ${
                  settled ? "opacity-100" : "opacity-0"
                }`}
              >
                {st.body}
              </p>
            )}
          </div>
        ))}

        {/* Connectors */}
        {width > 0 &&
          [
            { from: SIDE_W, to: geom.centerX },
            { from: geom.centerX + CENTER_W, to: geom.resultX },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute border-t border-line-2"
              style={{ left: c.from + 8, top: BOX_H / 2, width: Math.max(0, c.to - c.from - 16) }}
            />
          ))}

        {/* Rules tray */}
        <div
          className="absolute border border-line"
          style={{
            left: geom.centerX,
            top: geom.trayY,
            width: CENTER_W,
            minHeight: STAGE_H - geom.trayY,
          }}
        >
          <p className="px-3 pt-2 text-[12px] text-text-2">
            Rules{" "}
            <span className="tabular-nums text-text-3">{tray.length}</span>
          </p>
          <div className="space-y-1 px-3 pb-2 pt-2">
            {tray.length === 0 ? (
              <p className="text-[11px] text-text-3">No rule yet.</p>
            ) : (
              tray.slice(0, 3).map((r) => (
                <p
                  key={r.id}
                  className="truncate border border-line bg-panel-2 px-2 py-1 text-[11px] text-text-2"
                  title={`${r.appliesToPart}: ${r.text}`}
                >
                  {r.scope.product} {r.appliesToPart}
                </p>
              ))
            )}
          </div>
        </div>

        {/* The request */}
        {d && (
          <div
            ref={reqRef}
            className="absolute max-w-[180px] truncate border border-line-2 bg-panel-2 px-2 py-1 text-[11px] text-text opacity-0"
            style={{ left: geom.agentX + 8, top: geom.chipY }}
            title={d.description}
          >
            {d.description}
          </div>
        )}

        {/* Existing part numbers, one chip each */}
        {d &&
          pns.map((row, i) => (
            <div
              key={row.pn}
              data-pn
              className="absolute border border-line bg-panel-2 px-1 py-[2px] text-[9px] leading-tight text-text-2 opacity-0"
              style={{
                left: geom.centerX + 10 + (i % PN_COLS) * PN_W,
                top: PN_TOP + Math.floor(i / PN_COLS) * PN_H,
                width: PN_W - 6,
              }}
            >
              <span className="block truncate font-mono text-text">{row.pn}</span>
              <span className="block truncate">{row.product}</span>
            </div>
          ))}

        {/* The result */}
        {d && v && (
          <div
            ref={resRef}
            className="absolute w-[180px] opacity-0"
            style={{ left: geom.convergeX, top: geom.chipY }}
          >
            <div className="border border-line-2 bg-panel-2 px-2 py-1">
              <span className="block truncate font-mono text-[11px] text-text">
                {d.recommendedPn ??
                  (d.level === "possible"
                    ? `${d.candidates?.length ?? 0} candidates`
                    : "no part")}
              </span>
            </div>
            {/* One badge: the decision replaces the verdict once it lands. */}
            {!verdict && (
              <div data-reveal className="mt-2 opacity-0">
                <Badge tone={v.tone}>{v.label}</Badge>
              </div>
            )}
            {d.level === "match" && !d.blocked && (
              <div data-reveal className="mt-[16px] space-y-[2px] opacity-0">
                <p className="text-[11px] text-text-2">
                  Best price {px(d.minPrice ?? 0)}
                  {d.origin ? `, ${d.origin}` : ""}
                </p>
                <p className="text-[11px] text-text-2">
                  Saves {usd(d.savingUsd ?? 0)} a year
                </p>
                {d.po && (
                  <p className="font-mono text-[10px] text-text-3">[{d.po}]</p>
                )}
              </div>
            )}
            {d.blocked && (
              <p data-reveal className="mt-[16px] text-[11px] leading-snug text-text-2 opacity-0">
                {d.ruleText ?? "A rule covers this part for this product."}
              </p>
            )}
            {d.level === "possible" && (
              <p data-reveal className="mt-[16px] text-[11px] text-text-3 opacity-0">
                {d.candidates?.slice(0, 2).join(", ")}
              </p>
            )}
            {verdict && (
              <div data-decision className="mt-2 opacity-0">
                <Badge tone={verdict.detail.decision === "reuse" ? "positive" : "warn"}>
                  {verdict.detail.decision === "reuse" ? "Reused" : "Exception recorded"}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* The rule, detaching from the result and dropping into the tray */}
        {verdict?.detail.decision === "exception" && (
          <div
            ref={ruleChipRef}
            className="absolute w-[150px] truncate border border-line-2 bg-panel-2 px-2 py-1 text-[10px] text-text-2 opacity-0"
            style={{ left: geom.resultX + 8, top: geom.chipY }}
          >
            {verdict.detail.reasonKind ? reasonLabel(verdict.detail.reasonKind) : "Rule"}
          </div>
        )}
      </div>

      {scoreLine && (
        <p className="mt-3 text-[12px] text-text-2">{scoreLine}</p>
      )}
    </AnimationPanel>
  );
}
