"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { flushSync } from "react-dom";
import Badge from "@/components/ui/Badge";
import { ComputedIndex } from "@/lib/index";
import { RingResult } from "@/lib/alignment";
import { PlatformInterface } from "@/lib/interfaces";
import { MatcherEval } from "@/lib/similarity";
import { VoltaraData } from "@/lib/voltaraData";
import {
  POSITIONS,
  SCREENS,
  TALK_SECONDS,
  WARN_SECONDS,
  clock,
  positionOf,
} from "@/lib/pitch";

import ScreenTitle from "./screens/ScreenTitle";
import ScreenProblem from "./screens/ScreenProblem";
import ScreenWhat from "./screens/ScreenWhat";
import ScreenPlugin from "./screens/ScreenPlugin";
import ScreenSimilar from "./screens/ScreenSimilar";
import ScreenStepBack from "./screens/ScreenStepBack";
import ScreenStepOne from "./screens/ScreenStepOne";
import ScreenStepTwo from "./screens/ScreenStepTwo";
import ScreenStepThree from "./screens/ScreenStepThree";
import ScreenLoop from "./screens/ScreenLoop";
import ScreenVelocity from "./screens/ScreenVelocity";
import ScreenClose from "./screens/ScreenClose";

/** Everything the server read, in the shape every screen reads it. */
export interface PitchBundle {
  data: VoltaraData;
  /** The measured index as the data stands. */
  before: ComputedIndex;
  /** The same formulas after the two decisions on screen 6. */
  after: ComputedIndex;
  ringsBefore: Record<string, RingResult>;
  ringsAfter: Record<string, RingResult>;
  ownerChoice: string;
  targetChoice: string;
  bomLines: number | null;
  purchaseOrders: number | null;
  products: number | null;
  /** The interfaces the company already has, for screens 2 and 3. */
  interfaces: PlatformInterface[];
  /** How the matcher scored when graded blind, for screen 4. */
  matcherEval: MatcherEval | null;
}

export interface ScreenProps {
  bundle: PitchBundle;
  /** Which advance this screen is on, 0 for its first state. */
  step: number;
  /**
   * True only for the screen being shown. Every screen stays mounted for the
   * print path, so anything that keeps running on its own, a clip above all,
   * reads this to stop when the presenter walks off it.
   */
  active: boolean;
  /**
   * True while the page is being printed. Every screen is held at its last
   * step for the duration, and a screen whose animation would restart on
   * that change uses this to sit still instead.
   */
  printing: boolean;
}

/**
 * The twelve screens, in the order they are presented. The order here and
 * the order in SCREENS are the same list seen twice, so they move together.
 */
const COMPONENTS = [
  ScreenTitle,
  ScreenProblem,
  ScreenWhat,
  ScreenPlugin,
  ScreenSimilar,
  ScreenStepBack,
  ScreenStepOne,
  ScreenStepTwo,
  ScreenStepThree,
  ScreenLoop,
  ScreenVelocity,
  ScreenClose,
];

/** The stage is drawn at 1280x720 and scaled; 16:9 is the safe area. */
const STAGE_W = 1280;
const STAGE_H = 720;
/** Room under the stage for the progress rule and the clock. */
const CHROME_H = 52;

export default function PitchDeck({ bundle }: { bundle: PitchBundle }) {
  const [pos, setPos] = useState(0);
  const [notes, setNotes] = useState(false);
  /** The clock starts on the first advance, not on load. */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [left, setLeft] = useState(TALK_SECONDS);
  const [scale, setScale] = useState(1);
  /** Held true for the length of a print, so every screen shows its end state. */
  const [printing, setPrinting] = useState(false);

  const here = POSITIONS[pos];
  const meta = SCREENS[here.screen];

  /* ---------- navigation ---------- */

  const go = useCallback((next: number) => {
    setPos(Math.max(0, Math.min(POSITIONS.length - 1, next)));
  }, []);

  const forward = useCallback(() => {
    setStartedAt((t) => t ?? Date.now());
    setPos((p) => Math.min(POSITIONS.length - 1, p + 1));
  }, []);

  const back = useCallback(() => setPos((p) => Math.max(0, p - 1)), []);

  /** A number key jumps to that screen's first state. */
  const jump = useCallback(
    (screen: number) => {
      const target = positionOf(screen, 0);
      if (target >= 0) go(target);
    },
    [go]
  );

  /**
   * /pitch#5 opens on screen 5 at its end state. It is how the presenter
   * gets back to a screen after the demo. /pitch#1.3 opens on screen 1 at its
   * third beat, which is how the screenshots in docs/design/out are taken one
   * beat at a time.
   */
  useEffect(() => {
    const [a, b] = window.location.hash.slice(1).split(".");
    const n = Number(a);
    if (!Number.isInteger(n) || n < 1 || n > SCREENS.length) return;
    const last = SCREENS[n - 1].steps - 1;
    const beat = b === undefined ? last : Number(b) - 1;
    if (!Number.isInteger(beat) || beat < 0 || beat > last) return;
    const target = positionOf(n - 1, beat);
    if (target >= 0) setPos(target);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        forward();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        back();
      } else if (e.key >= "1" && e.key <= "9") {
        jump(Number(e.key) - 1);
      } else if (e.key === "n" || e.key === "N") {
        setNotes((v) => !v);
      } else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => {});
      } else if (e.key === "Escape") {
        setNotes(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [forward, back, jump]);

  /* ---------- the clock ---------- */

  useEffect(() => {
    if (startedAt === null) return;
    const tick = () =>
      setLeft(TALK_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  /* ---------- printing ---------- */

  // flushSync, because the browser takes its snapshot as soon as the
  // beforeprint handler returns and a batched update would miss it.
  useEffect(() => {
    const set = (v: boolean) => () => flushSync(() => setPrinting(v));
    const before = set(true);
    const after = set(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    // Headless rendering drives the print media query without firing the events.
    const mq = window.matchMedia("print");
    const onChange = (e: MediaQueryListEvent) => setPrinting(e.matches);
    if (mq.matches) setPrinting(true);
    mq.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  /* ---------- fitting the stage to the window ---------- */

  useLayoutEffect(() => {
    const fit = () =>
      setScale(
        Math.min(
          window.innerWidth / STAGE_W,
          (window.innerHeight - CHROME_H) / STAGE_H
        )
      );
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  /** Clicking the stage advances, unless the click landed on a control. */
  const onClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a,button,input,textarea")) return;
    forward();
  };

  const progress =
    POSITIONS.length > 1 ? pos / (POSITIONS.length - 1) : 1;
  const warn = left <= WARN_SECONDS;

  const steps = useMemo(
    () =>
      SCREENS.map((s, i) =>
        // A screen you are not on holds its end state, so the deck prints
        // nine finished pages whether or not you walked to them first. While
        // printing, the one you are on joins them.
        i === here.screen && !printing ? here.step : s.steps - 1
      ),
    [here.screen, here.step, printing]
  );

  return (
    <div className="pitch-deck h-screen w-screen select-none overflow-hidden bg-[#16171A]">
      <div
        className="pitch-viewport relative"
        style={{ height: `calc(100vh - ${CHROME_H}px)` }}
        onClick={onClick}
      >
        {COMPONENTS.map((Screen, i) => {
          const active = i === here.screen;
          return (
            <div
              key={SCREENS[i].id}
              className="pitch-page"
              style={{ opacity: active ? 1 : 0 }}
              aria-hidden={!active}
            >
              <div
                className="pitch-stage"
                style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
              >
                {/*
                  Remounting on the active flip is what makes a count start at
                  zero when you arrive on a screen rather than running down to
                  it from the end state it was holding.
                */}
                <Screen
                  key={active ? "live" : "end"}
                  bundle={bundle}
                  step={steps[i]}
                  active={active}
                  printing={printing}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/*
        Presenter furniture, and none of it prints. The deck carries no
        header or footer text: the only thing under the stage is the rule
        that fills as the talk runs. The clock lives in the notes sheet,
        which is where a presenter is already looking.
      */}
      <div className="pitch-chrome relative h-[52px] bg-[#16171A]">
        <div className="h-px w-full bg-line">
          <div
            className="h-px bg-accent transition-[width] duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {notes && (
        <div className="pitch-chrome fixed inset-x-0 bottom-0 z-20 max-h-[46vh] overflow-auto border-t border-line bg-panel px-12 py-6">
          <div className="flex items-baseline gap-4">
            <h2 className="text-[17px] font-light text-text">
              {here.screen + 1}. {meta.title}
            </h2>
            {meta.rubric.map((r) => (
              <Badge key={r}>{r}</Badge>
            ))}
            <span className="text-[12px] text-text-3">
              {meta.targetSeconds} seconds
            </span>
            <span
              className={`text-[13px] tabular-nums ${
                warn ? "text-warn" : "text-text-2"
              }`}
            >
              {clock(left)} left
            </span>
            <button
              type="button"
              onClick={() => setNotes(false)}
              className="ml-auto text-[12px] text-text-3 hover:text-text-2"
            >
              Close
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {meta.script.map((line) => (
              <li key={line} className="text-[16px] leading-snug text-text-2">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
