/**
 * The pitch deck, as data.
 *
 * Everything a screen says that is not read from the parts list, the survey,
 * the proven-design records or lib/index.ts lives here, with where it came
 * from written next to it. Two kinds of thing are kept apart on purpose:
 *
 *   SOURCED   a line or a figure that exists in docs/CONTEXT.md or the data,
 *             carried with its source so it can be checked.
 *   ASSUMED   a number we chose. Every one of these prints where it came
 *             from on screen beside it.
 *
 * Nothing in this file is a figure about Voltara. Those are all computed from
 * data/derived/*.json through lib/voltaraData.server.ts, lib/similarity.ts
 * and lib/index.ts.
 */

/* ---------- screen 1: the problem ---------- */

/**
 * The opener. The headline and the sentence under it are the deck's own
 * words; everything after them is the published survey, quoted with the line
 * of docs/CONTEXT.md it was read from.
 */
export const PROBLEM = {
  headline: "Platforming pays. Companies still don't do it.",
  sub: "Sharing parts and designs across a product line cuts cost, parts, and time to market.",
  citation:
    "Kearney PERLab, The current state of platforming and the hidden gap, November 2026. Survey of 100 manufacturing leaders.",
  citationCheck: "docs/CONTEXT.md line 5",
  close:
    "Everyone wants the result. Nobody owns the work, and nobody can see it in their own numbers.",
} as const;

/** The two survey figures, with the text they were read from. */
export const RESEARCH_FIGURES = [
  {
    value: 43,
    unit: "percent",
    read: "name engineering effort as the top challenge",
    source: "Kearney PERLab survey of 100 leaders, November 2026",
    check: "docs/CONTEXT.md line 9",
  },
  {
    value: 52,
    unit: "percent",
    read: "of companies platforming at scale set no complexity target",
    source: "Kearney PERLab survey of 100 leaders, November 2026",
    check: "docs/CONTEXT.md line 9",
  },
] as const;

/* ---------- screen 2: what the word means ---------- */

/**
 * The two definitions, and the picture under them.
 *
 * The block is read from the two power-stage records in
 * data/derived/voltara_interfaces.json: between them they carry six parts,
 * they were both proved in the same year, and the first of them is on all
 * six products. The screen draws those six parts twice, loose on the left
 * and held together on the right, which is the whole argument.
 */
export const PLATFORMING = {
  word: "Platforming",
  heard: "Platforming means making every product use the same parts.",
  real: "Platforming means never losing a design the company already proved.",
  /** The records the block is read from, in the order their parts are drawn. */
  blockIds: ["IF-PWR-HB", "IF-PWR-DCLINK"],
  blockName: "Power stage",
  oneProduct: "One product",
  caption:
    "Reuse the block, inherit the brackets, harness, firmware, and tests. Start from there.",
  source:
    "Sample data. data/derived/voltara_interfaces.json, the two power stage records.",
} as const;

/* ---------- screen 3: where the engineer already works ---------- */

/**
 * A clip the deck plays. The recorded ones carry the size they were filmed
 * at, so a screen can give the frame the video's own shape rather than a
 * shape of its own that would crop or letterbox it.
 */
export const CLIPS = {
  plugin: {
    src: "/pitch/clips/plugin.mp4",
    label: "Plugin on Velocity AI Studio",
    /** ffprobe of public/pitch/clips/plugin.mp4: 1126x1080, 21.8s, no audio. */
    width: 1126,
    height: 1080,
  },
  dashboard: {
    src: "/pitch/clips/dashboard.mp4",
    label: "Survey to dashboard",
    /** Not recorded yet; the frame falls back to 16:9 until it is. */
    width: 16,
    height: 9,
  },
} as const;

export const PLUGIN = {
  title: "Where the engineer already works",
  lines: [
    "Reads what they are building.",
    "Lights up what the company already proved.",
    "One click to design to it.",
  ],
} as const;

/* ---------- screen 4: how two part numbers become one part ---------- */

/**
 * The matcher, in words. Every figure the screen puts beside these lines is
 * computed: the weights and the two thresholds come from lib/similarity.ts,
 * the four scores from running similarity() on real descriptions, and the
 * graded figures from data/derived/matcher_eval.json.
 */
export const MATCHING = {
  title: "How we know two part numbers are one part.",
  /** The two rows the screen opens on, by part number. */
  rowA: "10-92550",
  rowB: "SL5-2214B",
  sameLine: "Same fan. Two products. Two part numbers.",
  terms:
    "The method is Fellegi-Sunter record linkage, 1969: compare field by field, weight the fields, two thresholds, and a human review band between them. The same method behind census matching and product matching across web shops. We applied it to part descriptions.",
  /** Where the method comes from. The weights themselves are ours. */
  methodSource:
    "Fellegi and Sunter, A Theory for Record Linkage, 1969. Multi-component Similarity Method, ACM SAC 2015.",
  rules: "A different type scores 0. One rating that disagrees caps it at 0.30.",
  rulesCheck: "lib/similarity.ts",
  blindTitle: "Tested blind",
  mistake: "a two-input board versus a three-input board",
  nextTitle: "What comes next",
  next: "Text cannot match those. Reading drawings and datasheets can.",
  citation:
    "Anthropic, Testing Claude on real-world electronics design, November 2026: models now rebuild parts from engineering drawings.",
  planned: "Planned, not built.",
} as const;

/* ---------- screen 5: how a client is brought to care ---------- */

export const CARE = {
  title: "A fourth accelerator, and a door opener.",
  /** The sample company, in one sentence. The figures in it are computed. */
  sampleLead: "Voltara is a sample company we built:",
  sampleTail: "real purchase orders.",
} as const;

export const THREE_STEPS = [
  {
    name: "Ballpark",
    line: "8 questions. 2 minutes.",
    who: "The CEO sees a rough score and a rough cost.",
    note: "Questions shaped with Andrew Cecola, who runs these conversations with clients.",
  },
  {
    name: "Measured",
    line: "Upload the parts list.",
    who: "The real score, in each leader's unit.",
    note: null,
  },
  {
    name: "Sustained",
    line: "The plugin.",
    who: "Every time an engineer picks a part.",
    note: null,
  },
] as const;

/* ---------- screen 6: how it gets smarter ---------- */

/**
 * What the product accumulates. Each line is a thing the prototype already
 * records: a reuse, a decline with its reason, and a product planned onto a
 * block. The rules engine that reads them back is lib/rules.ts.
 */
export const SMARTER = {
  title: "Every decision becomes a rule.",
  lines: [
    "Engineer reuses a part: one part number avoided.",
    "Engineer declines for compliance: a rule, so nobody asks again.",
    "Engineer designs to a block: the next product starts there.",
  ],
  benchmark: "The benchmark is new thinking avoided.",
  close: "The more engineers use it, the more the company remembers.",
  source: "Decisions are recorded by the check and read back by lib/rules.ts.",
} as const;

/* ---------- screen 7: what Velocity AI Studio changed ---------- */

export interface VelocityColumn {
  title: string;
  /** The lines of the column, in order. */
  lines: string[];
  /** A line that is struck through on arrival, with its badge beside it. */
  struck?: string;
  badge?: string;
  /** A second, smaller line under the first block. */
  small?: string;
  /** A picture under the column, cropped into public/pitch/velocity. */
  image?: { src: string; alt: string; from: string };
  /** The middle column is the one the screen is about. */
  accent?: boolean;
}

/**
 * Screen 7, word for word.
 *
 * Every line here was written by the team about work recorded in
 * docs/velocity: the 21-source library, the folder-grounded research answer,
 * the evidence synthesis with its NOT IN SOURCES list, and the concept the
 * Voltara persona was developed in. The pictures are crops of the screenshots
 * in docs/velocity/screens, named below by the file they came from, so a
 * judge can go and look at the original.
 */
export const VELOCITY = {
  title: "How Velocity AI Studio shaped this",
  header:
    "21 sources in one team library. Every figure cited, anything unsupported marked NOT IN SOURCES.",
  columns: [
    {
      title: "Validated the problem",
      lines: [
        "Kearney PERLab surveyed 100 manufacturers. About half say they platform at scale. Only a minority of those describe a true common core with modules.",
      ],
      small:
        "Wärtsilä engines: unique components from nearly 7,000 to under 4,000. Supplier-published case.",
      image: {
        src: "/pitch/velocity/validated.png",
        alt: "The folder-grounded research answer, with its evidence table",
        from: "docs/velocity/screens/12-research-energy-answer.png",
      },
    },
    {
      title: "Changed our decisions",
      accent: true,
      struck: "We planned to claim: companies with duplicate parts fail to platform.",
      badge: "NOT IN SOURCES",
      lines: [
        "Velocity found no data measuring both at the same companies. We dropped the claim.",
        "Velocity flagged weighting and validation risk in our scoring. The score is now computed from data and tested blind.",
      ],
      image: {
        src: "/pitch/velocity/not-in-sources.png",
        alt: "The NOT IN SOURCES passage of the evidence synthesis",
        from: "docs/velocity/screens/09-canvas-evidence-synthesis-not-in-sources.png",
      },
    },
    {
      title: "Built into the product",
      lines: [
        "The plugin runs on Velocity. An engineer writes in a research chat and the panel answers.",
        "The Voltara persona was developed in a Velocity concept, with every invented value labeled fictional.",
      ],
      image: {
        src: "/pitch/velocity/plugin-on-velocity.png",
        alt: "The panel answering beside the Velocity research chat",
        from: "A still from public/pitch/clips/plugin.mp4",
      },
    },
  ] as VelocityColumn[],
  close:
    "Andrew Cecola: start with the ballpark. Alex Gallard: a proven design is platforming, a part is standardization. BK: prove two parts are the same.",
} as const;

/* ---------- screen 8: why Kearney ---------- */

export const KEARNEY = {
  title: "Why Kearney.",
  lead: "The ballpark is business development. Every manufacturer can take it in two minutes, and every result is a reason to talk to Kearney.",
  stages: [
    { name: "Ballpark", what: "Free." },
    { name: "Measured", what: "A diagnostic engagement." },
    { name: "Sustained", what: "A license." },
  ],
} as const;

/* ---------- screen 9: the close ---------- */

export const CLOSE = {
  ask: "Ballpark today. Measured in two weeks. Sustained every time an engineer picks a part.",
  team: ["Nikhil Richard", "Rittrija Mandal"],
} as const;

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
      "Platforming pays. Everyone in manufacturing knows it.",
      "Share parts and designs across a product line and you cut cost, parts, and time to market.",
      "Kearney PERLab asked a hundred manufacturing leaders this month.",
      "Forty three percent name engineering effort as the top challenge.",
      "Fifty two percent of the companies already platforming at scale set no complexity target.",
      "So the result is wanted and the work is not owned.",
      "And no leader can see it in the numbers they are measured on.",
      "That is the gap.",
    ],
  },
  {
    n: 2,
    id: "what",
    title: "What platforming is",
    steps: 3,
    targetSeconds: 25,
    rubric: ["Final pitch"],
    script: [
      "Platforming is not making every product use the same parts.",
      "That is parts reuse, and most companies stop there.",
      "Platforming is never losing a design the company already proved.",
      "Voltara proved its power stage in 2019.",
      "Six products later, the brackets, the harness, the firmware and the tests all came with it.",
      "You start from there, not from a blank page.",
    ],
  },
  {
    n: 3,
    id: "plugin",
    title: "The plugin",
    steps: 4,
    targetSeconds: 60,
    rubric: ["Deliverable", "Technical feasibility"],
    script: [
      "This is the product, running where the work actually happens.",
      "An engineer writes a brief in their own tool. They never open our dashboard.",
      "So the plugin goes to them, on the page they are already on.",
      "It reads what they are building.",
      "It lights up what the company already proved, with the products already on it and the year it was proved.",
      "And it is one click to design to it.",
      "No new part number. No second harness. No second test plan.",
      "That is the whole product, in thirty seconds.",
    ],
  },
  {
    n: 4,
    id: "knows",
    title: "How it knows",
    steps: 5,
    targetSeconds: 70,
    rubric: ["Technical feasibility"],
    script: [
      "Two rows out of Voltara's parts list.",
      "Axial Fan 120mm 24VDC on one product. Lowercase and reordered on another.",
      "Same fan, two products, two part numbers. A person sees it. A spreadsheet does not.",
      "So we score it. Half the weight on type: is it the same kind of thing.",
      "A third on ratings: do the numbers agree. The rest on the wording.",
      "A different type scores zero, because a fan is never a fan guard.",
      "One rating that disagrees caps the whole score at nought point three.",
      "Above nought point eight five we merge. Below nought point six they are different parts.",
      "In between, a person looks.",
      "This is not something we invented. It is Fellegi-Sunter record linkage, from 1969, the method behind census matching.",
      "The three-term version is the Multi-component Similarity Method, ACM SAC 2015. We applied it to part descriptions.",
      "We tested it blind on all 252 part numbers against a hand labelled key the matcher never reads.",
      "99.8 percent of the merges were correct.",
      "One mistake, and we will name it: a two input board merged with a three input board.",
      "Nine lines in the sample say only SEE DWG. Text cannot match those. Reading the drawing can.",
      "That part is planned, not built.",
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
      "Voltara is a sample company we built: six power products, 252 part numbers, real purchase orders.",
      "The product runs in three steps.",
      "Ballpark. Eight questions, two minutes. The CEO sees a rough score and a rough cost.",
      "Those questions were shaped with Andrew Cecola, who runs these conversations with clients.",
      "Measured. Upload the parts list, and the real score comes back in each leader's own unit.",
      "Sustained. The plugin, every time an engineer picks a part.",
      "Here is the survey becoming the dashboard.",
      "And here is why leadership cares.",
      "Each function sits on a ring. The further out, the more questions they answer differently from everyone else.",
      "Two decisions. Name one owner. Set one complexity target.",
      "Everyone pulls in and the score moves. No part changed. They agreed.",
    ],
  },
  {
    n: 6,
    id: "smarter",
    title: "How it gets smarter",
    steps: 2,
    targetSeconds: 30,
    rubric: ["Commercial potential"],
    script: [
      "And it gets better the more it is used.",
      "Every decision becomes a rule.",
      "An engineer reuses a part: one part number avoided.",
      "An engineer declines on compliance: that becomes a rule, so nobody asks again.",
      "An engineer designs to a proven block: the next product starts there.",
      "The benchmark is new thinking avoided.",
      "The more engineers use it, the more the company remembers.",
    ],
  },
  {
    n: 7,
    id: "velocity",
    title: "How Velocity AI Studio shaped this",
    steps: 4,
    targetSeconds: 30,
    rubric: ["Research and use of Velocity AI"],
    script: [
      "Our research ran in Velocity AI Studio, on a 21 source team library.",
      "Every figure cited. Anything the sources do not support, marked NOT IN SOURCES.",
      "It validated the problem. About half say they platform at scale, and only a minority of those describe a true common core.",
      "It changed a decision. We planned to claim that companies with duplicate parts fail to platform.",
      "Velocity found no data measuring both at the same companies, so we dropped the claim.",
      "It flagged weighting and validation risk in our scoring, so the score is computed from data and tested blind.",
      "And it is in the product. The plugin runs on Velocity.",
      "The mentors did the rest.",
    ],
  },
  {
    n: 8,
    id: "kearney",
    title: "Why Kearney",
    steps: 3,
    targetSeconds: 25,
    rubric: ["Commercial potential"],
    script: [
      "The ballpark is business development.",
      "Every manufacturer can take it in two minutes, and every result is a reason to talk to Kearney.",
      "Ballpark is free. Measured is a diagnostic engagement. Sustained is a licence.",
      "And the client's side is real.",
      "1.13 million dollars a year, on 39.33 million of spend, in a six product sample.",
    ],
  },
  {
    n: 9,
    id: "close",
    title: "The core, and the ask",
    steps: 2,
    targetSeconds: 15,
    rubric: ["Physical product"],
    script: [
      "Twenty three parts already fit five or more products. That is the platform Voltara already owns.",
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
