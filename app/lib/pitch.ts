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
 * The quotable lines, copied word for word from docs/CONTEXT.md. No screen
 * renders either one while the deck is being rebuilt; both are kept here so
 * the screen that takes the mentor line back carries its attribution with it.
 * Nothing is attributed to Kearney that is not in that file, and the mentor
 * line is attributed to the mentor, not to the published research.
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

/** The two survey figures on screen 1, with the text they were read from. */
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

/**
 * The citation screen 1 opens on, split into the two lines it types.
 *
 * The title, the date and the survey are docs/CONTEXT.md line 5. Two of the
 * four names are recorded there as well: line 13 names Alex Gallard and
 * Andrew Cecola as authors and as mentors at this hackathon. Bruns and Mehl
 * are the remaining two names on the article's byline; nothing in this
 * repository records them, so `bylineUnrecorded` says so here rather than the
 * screen implying the file backs all four.
 */
export const RESEARCH_CITATION = {
  publication:
    "Kearney PERLab, The current state of platforming and the hidden gap. November 2026. Bruns, Mehl, Gallard, Cecola.",
  sample: "A survey of 100 leaders at manufacturers over one billion dollars.",
  check: "docs/CONTEXT.md lines 5 and 13",
  bylineUnrecorded:
    "Bruns and Mehl are from the article byline; docs/CONTEXT.md records only Gallard and Cecola.",
} as const;

/**
 * The one part screen 1 draws, named by words rather than by id so it is
 * found the way every other surface finds a part. The axial fan is carried by
 * all six products under six part numbers, which is the picture the screen
 * makes: one fan, six numbers, nobody looking at the row.
 */
export const FAN_EXAMPLE = {
  fragment: "axial fan",
  caption: "One fan. Six products. Six part numbers. Nobody sees it.",
  source: "data/derived/voltara_parts.json, part C005",
} as const;

/* ---------- screen 2: what the word means ---------- */

/**
 * The two definitions screen 2 puts one above the other. The first is struck
 * through on the second beat; it is the thing people hear when they hear the
 * word, not a claim this deck makes. The picture under them is drawn from one
 * real interface, so "an interface" is shown rather than asserted.
 */
export const PLATFORMING = {
  word: "Platforming",
  heard: "making every product use the same parts.",
  real: "never losing an interface the company already built.",
  caption: "Same parts is step one. We built it, tested it, and kept going.",
  /** The interface the picture is read from, by id. */
  interfaceId: "IF-COOL-120",
  /** The one part on the left of the picture, by name. */
  partName: "Axial Fan 120mm 24VDC",
  partLabel: "A part",
  interfaceLabel: "An interface",
  source: "data/derived/voltara_interfaces.json, IF-COOL-120",
} as const;

/* ---------- screen 3: where the engineer already works ---------- */

/** A clip the deck plays, by the file it is waiting for. */
export const CLIPS = {
  plugin: {
    src: "/pitch/clips/plugin.mp4",
    label: "Plugin on Velocity AI Studio, 30 seconds",
  },
  dashboard: {
    src: "/pitch/clips/dashboard.mp4",
    label: "Survey to dashboard, 45 seconds",
  },
} as const;

export interface PluginScene {
  /** Which function is writing, and the page they are writing on. */
  who: string;
  tool: string;
  crumb: string;
  heading: string;
  /** The product the page is about, by its id in the product master. */
  product: string;
  /**
   * The lines the plugin reads off the page. Each one is put through
   * lib/interfaces.ts at render time against the real interfaces file; no
   * interface id is written down here, because the point of the screen is
   * that the matching is done rather than asserted.
   */
  needs: string[];
}

/**
 * The three pages on screen 3. The tools are the three the panel fixtures
 * use (extension/fixtures/scenes), the products are real product ids, and
 * the need lines are written the way the person on that page would write
 * them. The pages themselves are drawn, not captured, and every frame says
 * so on it.
 */
export const PLUGIN_SCENES: PluginScene[] = [
  {
    who: "Engineering",
    tool: "Partsmith PLM",
    crumb: "Programs / RackLine / VRK-3000",
    heading: "Power stage brief",
    product: "VRK-3000",
    needs: ["Half bridge IGBT module, 24 VDC gate drive"],
  },
  {
    who: "Sales",
    tool: "Voltara CRM",
    crumb: "Accounts / Northwind Utilities / Opportunity 4821",
    heading: "Outdoor variant request",
    product: "VBS-50",
    needs: ["IP65 outdoor enclosure, 10 mm EPDM gasket", "Nylon cable gland, M20"],
  },
  {
    who: "Procurement",
    tool: "OrderDesk",
    crumb: "Purchasing / Supplier notes / SN-2211",
    heading: "Supplier change note",
    product: "VMX-20",
    needs: ["Axial fan, 120 mm 24 VDC", "Wire fan guard, 120 mm"],
  },
];

export const PLUGIN = {
  title: "Where the engineer already works.",
  gallery: "The same panel, three functions",
  /** On every drawn frame, so a judge never takes one for a screenshot. */
  tag: "Illustration of the intended experience",
  close: "It reads the page. It answers from what the company already built.",
} as const;

/* ---------- screen 4: what happens after the matcher ---------- */

/**
 * The step after matching descriptions. It is not built, and the screen says
 * so in those words. The citation is the one the inventory diagram already
 * carries in components/dashboard/MatchingPanel.tsx.
 */
export const MATCH_NEXT = {
  line: "Next: datasheets and drawings.",
  citation:
    "Anthropic, Testing Claude on real-world electronics design, Nov 9 2026",
  planned:
    "Planned, not built. Nothing in this prototype reads a datasheet or a drawing yet.",
} as const;

/* ---------- screen 5: the three steps, and who is in the room ---------- */

/**
 * The accelerator row. The two grey tiles stand for accelerators PERLab
 * already sells; they are not named, drawn or branded, and the count is our
 * framing rather than a figure from docs/CONTEXT.md, which the screen says.
 */
export const ACCELERATORS = {
  title: "A fourth accelerator.",
  existing: "Existing accelerator",
  ours: "Platforming Index",
  assumption:
    "Our framing. docs/CONTEXT.md does not list PERLab's accelerators, and none are named or drawn here.",
} as const;

export const THREE_STEPS = [
  {
    name: "Ballpark",
    line: "8 questions, 2 minutes.",
    note: "Questions shaped with a mentor who runs these conversations with clients.",
    noteSource:
      "PERLab mentor, November 13, docs/CONTEXT.md lines 15 to 21. Eight questions is lib/ballpark.ts; two minutes is our estimate.",
  },
  { name: "Measured", line: "Upload the parts list.", note: null, noteSource: null },
  { name: "Sustained", line: "The plugin.", note: null, noteSource: null },
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
  /** The rubric lines this screen is answering. A screen may serve two. */
  rubric: Rubric[];
  /** The spoken script, one short sentence per line. */
  script: string[];
}

export const SCREENS: ScreenMeta[] = [
  {
    n: 1,
    id: "problem",
    title: "The problem",
    steps: 4,
    targetSeconds: 40,
    rubric: ["Commercial potential", "Final pitch"],
    script: [
      "This is Kearney's own research, published this month.",
      "A hundred leaders at manufacturers over a billion dollars.",
      "Andrew Cecola co-wrote it. He is a mentor here this weekend.",
      "Forty three percent name engineering effort as the top challenge.",
      "Fifty two percent of the companies already platforming at scale carry no complexity target.",
      "So the belief is there. The measurement is not.",
      "Everyone agrees platforming pays. Nobody can see where.",
      "Here is what that looks like on one row.",
      "The same 120 millimetre axial fan goes into six products.",
      "Six part numbers. Six purchase orders. Six prices.",
      "No report in the company puts those six side by side.",
      "That is the gap we built for.",
    ],
  },
  {
    n: 2,
    id: "what",
    title: "What platforming is",
    steps: 4,
    targetSeconds: 25,
    rubric: ["Final pitch"],
    script: [
      "Platforming is not making every product use the same parts.",
      "That is parts reuse. It is step one, and most companies stop there.",
      "Platforming is never losing an interface you already built.",
      "A fan is a part.",
      "A fan with its guard, its bolt pattern, its harness and its test fixture is an interface.",
      "Voltara has carried that one on six products since 2019.",
      "We built it, we tested it, and we kept going.",
    ],
  },
  {
    n: 3,
    id: "plugin",
    title: "The plugin",
    steps: 3,
    targetSeconds: 60,
    rubric: ["Deliverable", "Technical feasibility"],
    script: [
      "This is where the work actually happens.",
      "An engineer writing a brief. A sales rep writing a variant request. A buyer writing a supplier change.",
      "None of them open our dashboard.",
      "So the plugin goes to them. It sits in the browser, on the page they are already on.",
      "It reads the page and pulls out what the product needs.",
      "Then it answers in the company's own interfaces.",
      "Engineering asks for a half bridge IGBT module on the 3 kVA rack. The panel lights the half bridge power block.",
      "Sales asks for an outdoor battery cabinet. The outdoor envelope and the field wiring entry, both already built.",
      "Procurement changes the supplier on the 120 millimetre fan. That fan is the cooling interface on six products.",
      "Same panel, three functions.",
      "Those three are illustrations. The plugin itself is real, and you just watched it.",
    ],
  },
  {
    n: 4,
    id: "knows",
    title: "How it knows",
    steps: 4,
    targetSeconds: 70,
    rubric: ["Technical feasibility"],
    script: [
      "No company has a list of its own interfaces. We have to find them, and we start in the parts list.",
      "Two rows. Two part numbers. The same fan.",
      "We read each description into three terms. What kind of thing it is, its ratings, and the words left over.",
      "Type is half the score, because a fan is never a fan guard.",
      "That gives one number, and the number lands in one of three zones.",
      "Same part. Different part. Or not enough to tell, which goes to a person.",
      "A 120 millimetre fan against an 80 millimetre fan sits low, because one rating disagrees and that caps the whole score.",
      "The line that says only SEE DWG scores low too. Nobody could tell from that text, and neither can we.",
      "We graded it blind against a hand labelled key the matcher never reads.",
      "99.8 percent of the merges it made were right. One was wrong, and we name it: a dual input board merged with a triple input board.",
      "It found 82 percent of the duplicates on its own. The rest went to a person.",
      "Next is datasheets and drawings. That step is planned, not built.",
    ],
  },
  {
    n: 5,
    id: "care",
    title: "How you get them to care",
    steps: 6,
    targetSeconds: 60,
    rubric: ["Commercial potential", "Deliverable"],
    script: [
      "Kearney sells accelerators. This is a fourth one.",
      "It runs in three steps.",
      "Ballpark: eight questions, two minutes, no data at all.",
      "Those questions were shaped with a mentor who runs these conversations with clients.",
      "Measured: upload the parts list and the purchase history.",
      "Sustained: the plugin, running where parts actually get chosen.",
      "Here is the survey turning into the dashboard.",
      "And here is why leadership cares.",
      "Each function sits on a ring. The further out, the more questions they answer differently from everyone else.",
      "Leadership makes two decisions. Name one owner. Set one complexity target.",
      "Everyone pulls in and the score moves.",
      "No part changed. Nobody redesigned anything. They agreed.",
    ],
  },
  {
    n: 6,
    id: "hook",
    title: "Hook",
    steps: 2,
    targetSeconds: 25,
    rubric: ["Final pitch"],
    script: [
      "Voltara builds six products.",
      "It carries 252 part numbers to do it.",
      "Watch what happens when you ask which of those are actually the same part.",
      "Sixty. The other 192 are duplicates under a different name and number.",
      "Voltara is made up. The pattern is not.",
    ],
  },
  {
    n: 7,
    id: "model",
    title: "Why Kearney wins",
    steps: 4,
    targetSeconds: 40,
    rubric: ["Commercial potential"],
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
    rubric: ["Research and use of Velocity AI"],
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
    rubric: ["Physical product"],
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
