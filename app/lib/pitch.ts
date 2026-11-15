import type { Assumption } from "./ballpark";

/**
 * The pitch deck, as data.
 *
 * Everything a screen says that is not read from the parts list, the survey
 * or lib/index.ts lives here, with where it came from written next to it. Two
 * kinds of thing are kept apart on purpose:
 *
 *   SOURCED   a line or a figure that exists in docs/CONTEXT.md or the data,
 *             carried with its source so it can be checked.
 *   ASSUMED   a number we chose. Every one of these prints "Our assumption"
 *             on screen beside it.
 *
 * Nothing in this file is a figure about Voltara. Those are all computed from
 * data/derived/*.json through lib/voltaraData.server.ts and lib/index.ts.
 */

/* ---------- quotes, each with the line it came from ---------- */

export interface SourcedLine {
  text: string;
  /** Who said it, as the screen attributes it. */
  attribution: string;
  /** Where to check it. */
  source: string;
}

/**
 * The quotable lines, copied word for word from docs/CONTEXT.md. Screen 2
 * renders `mentor`; `research` is the other line the file supports, kept here
 * so a swap stays sourced. Nothing is attributed to Kearney that is not in
 * that file, and the mentor line is attributed to the mentor, not to the
 * published research.
 */
export const QUOTES: Record<"mentor" | "research", SourcedLine> = {
  mentor: {
    text: "The hard part of platforming is not building it. Companies do not want to do it. They do not understand it and do not see the value against the effort.",
    attribution: "A PERLab mentor, November 13",
    source: "docs/CONTEXT.md line 17",
  },
  research: {
    text: "Even companies that claim scale mostly share parts. Few built a common core with plug-in modules.",
    attribution: "Kearney PERLab survey of 100 senior leaders, November 2026",
    source: "docs/CONTEXT.md line 8",
  },
};

/** The two survey figures on screen 2, with the text they were read from. */
export const RESEARCH_FIGURES = [
  {
    value: 43,
    unit: "percent",
    read: "name engineering effort as the top challenge",
    source: "Kearney PERLab survey of 100 senior leaders, November 2026",
    check: "docs/CONTEXT.md line 9",
  },
  {
    value: 52,
    unit: "percent",
    read: "of companies platforming at scale set no complexity target",
    source: "Kearney PERLab survey of 100 senior leaders, November 2026",
    check: "docs/CONTEXT.md line 9",
  },
] as const;

/* ---------- the business model, every number named ---------- */

export interface Band {
  low: number;
  high: number;
}

/**
 * The commercial assumptions behind screen 7. The market range came out of
 * research; the two prices and the two rates did not, and the screen says so
 * next to each of them. Change a value here and the funnel maths follows.
 */
export const PITCH_ASSUMPTIONS = {
  qualifyingManufacturers: {
    value: { low: 400, high: 800 },
    source: "Velocity research, planning range",
  } as Assumption<Band>,

  measuredDiagnosticPriceUsd: {
    value: 100_000,
    source: "Our assumption. A round placeholder until we price a real diagnostic.",
  } as Assumption<number>,

  sustainedLicensePriceUsd: {
    value: 50_000,
    source: "Our assumption. A round placeholder until we price a real licence.",
  } as Assumption<number>,

  measuredTakeRate: {
    value: 0.05,
    source: "Our assumption. The share of the qualifying market that buys a diagnostic.",
  } as Assumption<number>,

  sustainedRenewalRate: {
    value: 0.6,
    source: "Our assumption. The share of diagnostics that go on to a licence.",
  } as Assumption<number>,
} as const;

export interface FunnelStage {
  name: string;
  /** What the client gets. */
  what: string;
  /** What it costs them. */
  price: string;
  /** Whether the price on this row is a figure we chose. */
  assumed: boolean;
  /** Who inside the client uses it. */
  who: string;
}

/** The three stages, with the prices read from PITCH_ASSUMPTIONS. */
export function funnelStages(money: (n: number) => string): FunnelStage[] {
  const a = PITCH_ASSUMPTIONS;
  return [
    {
      name: "Ballpark",
      what: "Eight questions, two minutes, no data needed",
      price: "Free",
      assumed: false,
      who: "The client's leadership",
    },
    {
      name: "Measured",
      what: "Parts list and purchase history, scored and mapped",
      price: `${money(a.measuredDiagnosticPriceUsd.value)} once`,
      assumed: true,
      who: "The Kearney team with the client",
    },
    {
      name: "Sustained",
      what: "The check runs wherever parts get chosen",
      price: `${money(a.sustainedLicensePriceUsd.value)} a year`,
      assumed: true,
      who: "The client's engineers",
    },
  ];
}

export interface FunnelMath {
  diagnostics: Band;
  diagnosticRevenue: Band;
  licences: Band;
  licenceRevenue: Band;
}

/** The one line of arithmetic the funnel screen prints. */
export function funnelMath(): FunnelMath {
  const a = PITCH_ASSUMPTIONS;
  const m = a.qualifyingManufacturers.value;
  const take = a.measuredTakeRate.value;
  const renew = a.sustainedRenewalRate.value;

  const diagnostics = {
    low: Math.round(m.low * take),
    high: Math.round(m.high * take),
  };
  const licences = {
    low: Math.round(diagnostics.low * renew),
    high: Math.round(diagnostics.high * renew),
  };
  return {
    diagnostics,
    diagnosticRevenue: {
      low: diagnostics.low * a.measuredDiagnosticPriceUsd.value,
      high: diagnostics.high * a.measuredDiagnosticPriceUsd.value,
    },
    licences,
    licenceRevenue: {
      low: licences.low * a.sustainedLicensePriceUsd.value,
      high: licences.high * a.sustainedLicensePriceUsd.value,
    },
  };
}

/* ---------- how we got here ---------- */

export interface TimelineBeat {
  when: string;
  title: string;
  body: string;
  /** What Velocity AI Studio contributed at this point. */
  velocity: string;
  /** True when nothing in docs/CONTEXT.md records the Velocity contribution. */
  velocityUnrecorded: boolean;
  source: string;
}

/**
 * The timeline on screen 8. The mentor beats are recorded in
 * docs/CONTEXT.md; what Velocity AI Studio contributed at each turn is not
 * written down anywhere in this repository, so those cells carry a stand-in
 * label rather than a sentence we made up. Fill them in from the Velocity
 * session history before the pitch.
 */
export const TIMELINE: TimelineBeat[] = [
  {
    when: "Friday",
    title: "The idea",
    body: "Build the tool that finds parts a manufacturer could share, and the reason they would act on it.",
    velocity: "Not recorded in docs/CONTEXT.md",
    velocityUnrecorded: true,
    source: "Track 1 brief, docs/CONTEXT.md line 25",
  },
  {
    when: "Mentor one",
    title: "Procurement is too late",
    body: "A check at the purchase order catches a part number that already exists. Move the check to the moment an engineer is still choosing.",
    velocity: "Not recorded in docs/CONTEXT.md",
    velocityUnrecorded: true,
    source: "Mentor conversation, November 13. Not written up in docs/CONTEXT.md.",
  },
  {
    when: "Mentor two",
    title: "Start with a ballpark",
    body: "Kearney is starting a platforming index: a survey that sizes up a prospect's complexity for business development. Leadership has to care before anyone opens a parts list.",
    velocity: "Not recorded in docs/CONTEXT.md",
    velocityUnrecorded: true,
    source: "docs/CONTEXT.md line 21",
  },
  {
    when: "Saturday",
    title: "What we cut",
    body: "The matcher. Part groups for the sample come from a prepared answer key, and every screen that uses them says so.",
    velocity: "Not recorded in docs/CONTEXT.md",
    velocityUnrecorded: true,
    source: "data/derived/voltara_parts.json, note field",
  },
];

/* ---------- what is real and what is sample ---------- */

/**
 * The footer on screen 5. A judge should be able to tell, without asking,
 * which part of the prototype would survive meeting a real company.
 */
export const HONESTY = [
  "Real code: the index formulas, the role views, the check, the rules engine, the browser panel and the assistant.",
  "Sample data: Voltara Power Systems is a fictional company. Its parts list, purchase orders and product master are generated.",
  "Part groups for the sample come from a prepared answer key, not from a running matcher.",
  "Survey answers are five sample responses, one per function, not a real survey of a real company.",
];

/* ---------- the deck itself ---------- */

export type Rubric =
  | "Commercial potential"
  | "Technical feasibility"
  | "Final pitch"
  | "Deliverable"
  | "Research and use of Velocity AI"
  | "Physical product";

export interface ScreenMeta {
  n: number;
  id: string;
  /** What the presenter sees in the notes sheet, not always what is on screen. */
  title: string;
  /** How many advances this screen holds, including the first state. */
  steps: number;
  targetSeconds: number;
  rubric: Rubric;
  /** The spoken script, one short sentence per line. */
  script: string[];
}

export const SCREENS: ScreenMeta[] = [
  {
    n: 1,
    id: "hook",
    title: "Hook",
    steps: 2,
    targetSeconds: 25,
    rubric: "Final pitch",
    script: [
      "Voltara builds six products.",
      "It carries 252 part numbers to do it.",
      "Watch what happens when you ask which of those are actually the same part.",
      "Sixty. The other 192 are duplicates under a different name and number.",
      "Voltara is made up. The pattern is not.",
    ],
  },
  {
    n: 2,
    id: "problem",
    title: "The problem",
    steps: 3,
    targetSeconds: 35,
    rubric: "Commercial potential",
    script: [
      "Every manufacturer already knows platforming pays.",
      "Kearney asked a hundred senior leaders this month.",
      "Forty three percent said engineering effort is the top challenge.",
      "Fifty two percent of the companies already platforming at scale carry no complexity target at all.",
      "A PERLab mentor said it to us plainly on Thursday.",
      "So the blocker is agreement, before it is engineering.",
      "That is the gap we built for.",
    ],
  },
  {
    n: 3,
    id: "answer",
    title: "The answer",
    steps: 3,
    targetSeconds: 35,
    rubric: "Commercial potential",
    script: [
      "The Platforming Index is a fourth accelerator.",
      "It runs in three steps, and each one has a different user.",
      "Ballpark. Eight questions, two minutes, no data. It gets leadership in the room.",
      "Measured. We read the parts list and the purchase history and show where the money sits.",
      "Sustained. A check lives where engineers pick parts, so the gain does not leak back.",
      "Leadership, then the Kearney team with the client, then the client's engineers.",
    ],
  },
  {
    n: 4,
    id: "demo",
    title: "Live demo",
    steps: 1,
    targetSeconds: 150,
    rubric: "Deliverable",
    script: [
      "Three things, quickly.",
      "First the ballpark. Eight questions about your company, no data.",
      "Here is the score, the range, and the arithmetic with your own numbers in it.",
      "Now the measured dashboard. Same four dimensions, computed from 252 part numbers and 1,109 purchase orders.",
      "This is the price spread. One capacitor, three suppliers, three prices.",
      "Ask the assistant anything. Every answer carries the purchase order it came from.",
      "Last, the panel. This is a product page in the customer's own system, not ours.",
      "The engineer types what they need. The panel finds the part already in stock and the price already paid.",
      "They press Reuse. A part number never gets created, and the score moves.",
      "Back to the deck.",
    ],
  },
  {
    n: 5,
    id: "how",
    title: "How it works",
    steps: 3,
    targetSeconds: 40,
    rubric: "Technical feasibility",
    script: [
      "Four boxes.",
      "The parts list and the purchase history go in. The matcher groups the same part under different numbers.",
      "The index scores it. The check sits at the point of choice.",
      "Nobody sets the score. Every dimension is a ratio of two numbers in the data.",
      "Twenty three of sixty parts are used by five or more products. Two of five functions name the same owner.",
      "Half a function out of five carries a target. Sixty real parts across 252 part numbers.",
      "Average the four. Twenty eight.",
      "And we are clear about what is real. The code is real. The company is sample data.",
    ],
  },
  {
    n: 6,
    id: "orbit",
    title: "Same score, five units",
    steps: 3,
    targetSeconds: 30,
    rubric: "Deliverable",
    script: [
      "The same score, said five ways.",
      "Each function sits on a ring. The further out, the more questions they answer differently from everyone else.",
      "Now leadership makes two decisions. Name one owner. Set one complexity target.",
      "Everyone pulls in, and the score goes from 28 to 66.",
      "No part changed. Nobody redesigned anything. They agreed.",
    ],
  },
  {
    n: 7,
    id: "model",
    title: "Why Kearney wins",
    steps: 4,
    targetSeconds: 40,
    rubric: "Commercial potential",
    script: [
      "It opens the door, then it sizes the work.",
      "The ballpark is free. It starts a conversation with any manufacturer.",
      "The measured diagnostic is paid. It tells the Kearney team where to focus first.",
      "The licence renews every year, because the check keeps running.",
      "Those prices are our assumption and the screen says so.",
      "The client's side is not an assumption.",
      "A six product company spending 39.33 million dollars a year is paying 1.13 million of that in price gaps on parts it already shares.",
    ],
  },
  {
    n: 8,
    id: "process",
    title: "How we got here",
    steps: 1,
    targetSeconds: 25,
    rubric: "Research and use of Velocity AI",
    script: [
      "Friday we had the idea.",
      "The first mentor conversation moved it. Procurement is too late. The decision happens at design.",
      "The second moved it again. Start with a ballpark, because leadership has to care first.",
      "Velocity AI Studio did the research at each turn.",
      "And we cut the matcher. Part groups in the sample come from a prepared key, and every screen says so.",
    ],
  },
  {
    n: 9,
    id: "close",
    title: "The core, and the ask",
    steps: 2,
    targetSeconds: 20,
    rubric: "Physical product",
    script: [
      "Twenty three parts fit five or more products. That is the shared core, drawn from the parts data.",
      "Ballpark today. Measured in two weeks. Sustained every time an engineer picks a part.",
      "We are the Ladebuggers. Thank you.",
    ],
  },
];

/** Flat positions: every (screen, step) pair the arrow keys walk through. */
export const POSITIONS: { screen: number; step: number }[] = SCREENS.flatMap((s, i) =>
  Array.from({ length: s.steps }, (_, step) => ({ screen: i, step }))
);

export function positionOf(screen: number, step: number): number {
  return POSITIONS.findIndex((p) => p.screen === screen && p.step === step);
}

/** Six minutes to present, one minute of warning. */
export const TALK_SECONDS = 360;
export const WARN_SECONDS = 60;

export function clock(seconds: number): string {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
