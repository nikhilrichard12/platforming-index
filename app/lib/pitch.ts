/**
 * The pitch deck, as data.
 *
 * Everything a screen says that is not read from the parts list, the proven
 * design records or lib/index.ts lives here, with where it came from written
 * next to it. Nothing in this file is a computed figure about Voltara: those
 * are all read from data/derived/*.json through lib/voltaraData.server.ts,
 * lib/similarity.ts and lib/index.ts at render time.
 *
 * The product is PlatInform. The score it produces is the Platforming Index.
 */

export const PRODUCT = "PlatInform";
export const SCORE_NAME = "Platforming Index";
export const TEAM = {
  name: "Team Ladebuggers",
  members: ["Nikhil Richard", "Rittrija Mandal"],
} as const;

/* ---------- 1. title ---------- */

export const TITLE = {
  event: "Kearney PERLab x UIUC AI Entrepreneurship Hackathon",
} as const;

/* ---------- 2. the problem ---------- */

/**
 * The survey behind the opener. The two percentages are the ones
 * docs/CONTEXT.md line 9 records; the industry bars are the figures written
 * into the deck brief, carried here with the survey they belong to so the
 * screen can print the source under the chart.
 */
export const PROBLEM = {
  title: "Platforming has two problems, and they feed each other.",
  effortHead: "It takes real engineering effort.",
  effortBody:
    "Every product decision has to account for what the company already designed and bought, across every team.",
  effortFigure: 43,
  effortRead: "name engineering effort as the top challenge",
  effortSource:
    "Kearney PERLab survey of 100 leaders, November 2026. docs/CONTEXT.md line 9.",
  adoptionHead: "Most companies do not see the potential.",
  chartTitle: "Companies running a platforming strategy at scale, by industry",
  chartSource: "Kearney Platforming Survey, 2026.",
  bars: [
    { name: "Aerospace and defense", value: 80, accent: false },
    { name: "Consumer electronics", value: 75, accent: false },
    { name: "Auto and transport", value: 71, accent: false },
    { name: "Construction", value: 57, accent: false },
    { name: "Industrial equipment", value: 44, accent: false },
    { name: "Medical", value: 43, accent: false },
    { name: "Telecom", value: 38, accent: false },
    { name: "Energy and power", value: 20, accent: true },
  ],
  /** The four industries under half, which the bracket names. */
  targetUnder: 50,
  targetLabel: "Our target market",
  close:
    "Both problems are the opportunity: more companies to bring into platforming, and engineering work that continues after the first project.",
} as const;

/* ---------- 3. what platforming is ---------- */

export const PLATFORMING = {
  heard: "Platforming means making every product use the same parts.",
  real: "Platforming means never losing a design the company already proved.",
  blockIds: ["IF-PWR-HB", "IF-PWR-DCLINK"],
  blockName: "Power stage",
  oneProduct: "One product",
  caption:
    "Reuse the block, inherit the brackets, harness, firmware, and tests. Start from there.",
  /** Read from the first block record: the same block, this many products. */
  conceptLead: "Design concept: a shared power stage module, the same block built into",
  conceptTail: "products.",
  source:
    "Sample data. data/derived/voltara_interfaces.json, the two power stage records.",
} as const;

/* ---------- clips, and what stands in when one is missing ---------- */

export interface ClipSpec {
  src: string;
  label: string;
  /** Filmed size, so a frame can take the clip's own shape. */
  width: number;
  height: number;
}

export const CLIPS: Record<string, ClipSpec> = {
  plugin: {
    src: "/pitch/clips/plugin.mp4",
    label: "PlatInform running on Velocity AI Studio",
    width: 1126,
    height: 1080,
  },
  survey: {
    src: "/pitch/clips/survey.mp4",
    label: "Eight questions about the company",
    width: 1254,
    height: 1080,
  },
  ballpark: {
    src: "/pitch/clips/ballpark.mp4",
    label: "A rough index and a rough cost, from those answers",
    width: 1910,
    height: 1080,
  },
  summary: {
    src: "/pitch/clips/summary.mp4",
    label: "The measured index, read from the company's own parts list",
    width: 1782,
    height: 1080,
  },
  alignment: {
    src: "/pitch/clips/alignment.mp4",
    label: "Decisions recorded where the functions disagree",
    width: 1782,
    height: 1080,
  },
};

/* ---------- 4. the plugin ---------- */

export const PLUGIN = {
  title: `${PRODUCT} sits where product decisions get made.`,
  lines: [
    "It works inside the web tools teams already use for product development, shown here on Velocity AI Studio.",
    "It answers from the company's own purchasing and design data.",
    "It points to proven designs to build on, and to single parts as well.",
  ],
} as const;

/* ---------- 5. how similarity is calculated ---------- */

/**
 * The matcher, in words. Every figure beside these lines is computed: the
 * weights and the two thresholds from lib/similarity.ts, the four scores by
 * running similarity() on real descriptions, the blind result from
 * data/derived/matcher_eval.json, and the two-product comparison from the
 * parts list and the proven design records.
 */
export const SIMILAR = {
  title: "How we know part A can replace part B.",
  asked: "The question a judge, BK, asked us on Saturday.",
  /** The two rows the screen opens on, by part number. */
  rowA: "10-92550",
  rowB: "SL5-2214B",
  method:
    "Fellegi-Sunter record linkage (1969): weighted fields, two thresholds, human review between them.",
  ringRead: "of matches correct in a blind test on 252 part numbers",
  /** The second beat: two products from different families. */
  pairTitle: "When two products share no parts",
  pairA: "VRK-3000",
  pairB: "VSI-10",
  pairInterface: "IF-PWR-HB",
  pairLine:
    "Part matching finds identical parts. Design matching finds what different products have in common.",
  nextTitle: "Next",
  next: "Reading datasheets and drawings for parts that text cannot describe.",
  nextCitation:
    "Anthropic, Testing Claude on real-world electronics design, November 2026.",
  nextLabel: "Planned",
} as const;

/* ---------- 6. step back ---------- */

export const STEP_BACK = {
  lines: [
    "All of this runs on a company's own data.",
    "Today no team has a reason to platform, so no company hands that data over.",
    `${PRODUCT} gives every function a reason, in three steps.`,
  ],
} as const;

/* ---------- 7, 8, 9. the three steps ---------- */

export const STEP_ONE = {
  title: "Step one: a two-minute ballpark for the C-suite.",
  body: `Eight plain questions produce a rough ${SCORE_NAME} and a rough cost, so executives see the size of the problem before anyone opens a parts list. For Kearney this is a business development opening: any manufacturer can take it, and each result starts a conversation.`,
  note: "Questions shaped with Andrew Cecola of Kearney PERLab.",
} as const;

export const STEP_TWO = {
  title: "Step two: upload the bill of materials.",
  body: "The company's own parts list and purchase history produce a measured index, and each leader sees the cost in their own unit.",
  note: "Sample company: Voltara, a fictional energy and power manufacturer, the sector at 20 percent.",
} as const;

export const STEP_THREE = {
  title: "Step three: the plugin puts it in every product decision.",
  body: "The first version works on purchasing data, the low-hanging fruit. Each time someone uses the plugin, their decision goes back into the company's data, so the answers get better for the next team.",
} as const;

/* ---------- 10. the loop ---------- */

/**
 * The circle the three steps close. The last segment, from the decisions
 * back to the ballpark, is the one the screen is about: it is what makes the
 * next answer better than the last one.
 */
export const LOOP = {
  nodes: [
    { name: "Ballpark", line: "Executives see a rough score." },
    { name: "Measured index", line: "Every function sees its cost." },
    { name: "Plugin", line: "Teams reuse proven designs." },
    { name: "Decisions return", line: "Each choice goes back in." },
  ],
  /** What the two nodes the closing segment improves are labelled with. */
  gains: { plugin: "better answers", measured: "sharper index" },
  center: "Every decision improves the data and the plugin.",
  /** The two alignment decisions, with the index either side of them. */
  decisionsLead: "Two leadership decisions: index",
  decisionsTail: "no part changed.",
} as const;

/* ---------- 11. Velocity AI Studio ---------- */

export interface VelocityItem {
  line: string;
  image: string;
  alt: string;
  /** The file in docs/velocity this picture was taken from. */
  from: string;
}

/**
 * Three things the research tool did, each with the screenshot it can be
 * checked against. The pictures are copies of the shots in
 * docs/velocity/new, named below by the file they came from. None of them
 * shows the old hand-set score: the index is computed now.
 */
export const VELOCITY = {
  title: `How Velocity AI Studio shaped ${PRODUCT}.`,
  items: [
    {
      line: "It validated the problem: 21 sources and 29 research chats, every figure cited.",
      image: "/pitch/velocity/sources.png",
      alt: "The 21-source Platforming Index library in the team workspace",
      from: "docs/velocity/new/n01-sources-21.png",
    },
    {
      line: "It changed our claim: we planned to say companies with duplicate parts fail to platform. Velocity found no data for that, so we dropped it.",
      image: "/pitch/velocity/answer.png",
      alt: "The folder-grounded research answer and its evidence tables",
      from: "docs/velocity/new/n08-energy-answer.png",
    },
    {
      line: "It is where the plugin runs: our browser extension was built on Velocity AI Studio.",
      image: "/pitch/velocity/plugin-on-velocity.png",
      alt: "The panel answering beside a Velocity research chat",
      from: "A still from public/pitch/clips/plugin.mp4",
    },
  ] as VelocityItem[],
} as const;

/* ---------- 12. why this is a business ---------- */

/**
 * The last screen answers the two problems the second screen opened with,
 * in the same two positions on the stage. Both figures under the left column
 * are computed from the purchase history; the chart on the right is the same
 * one screen 2 draws, at a quarter of the size.
 */
export const BUSINESS = {
  title: "Why this is a business.",
  left: {
    was: "It takes real engineering effort.",
    now: "Sustained work.",
    body: "Platforming is never one project. Each product line, each acquisition, and each new design brings more to measure and more to reuse. The plugin keeps the client engaged between projects.",
  },
  right: {
    was: "Most companies do not see the potential.",
    now: "Business development.",
    body: "A two-minute ballpark gives any manufacturer a number to react to. Every result is a reason to start a conversation with Kearney.",
    chartLabel: "Where the conversations start",
  },
  steps: [
    { name: "Ballpark", what: "free, opens the door." },
    { name: "Measured index", what: "a paid diagnostic." },
    { name: "Plugin", what: "a yearly license that keeps the gain." },
  ],
  close: `${PRODUCT} turns Kearney's own research into the first meeting, the first project, and the reason to stay.`,
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
  rubric: Rubric[];
  /** The spoken script, in full sentences. */
  script: string[];
}

export const SCREENS: ScreenMeta[] = [
  {
    n: 1,
    id: "title",
    title: "Title",
    steps: 1,
    targetSeconds: 10,
    rubric: ["Final pitch"],
    script: [
      "We are the Ladebuggers, and our product is called PlatInform.",
      "It was built for the Kearney PERLab track on rapid platforming.",
    ],
  },
  {
    n: 2,
    id: "problem",
    title: "The problem",
    steps: 3,
    targetSeconds: 35,
    rubric: ["Commercial potential", "Final pitch"],
    script: [
      "Platforming has two problems, and each one makes the other worse.",
      "The first is that it takes real engineering effort: every decision has to account for what the company already designed and bought, across every team.",
      "In Kearney PERLab's survey of a hundred manufacturing leaders, 43 percent named engineering effort as the top challenge.",
      "The second is that most companies do not see the potential, and the gap between industries is wide.",
      "Aerospace and defence runs platforming at scale in 80 percent of companies. Energy and power is at 20.",
      "The four industries under half are the ones we are aiming at, and they are most of the market.",
      "Both problems are the opportunity: more companies to bring into platforming, and engineering work that continues after the first project.",
    ],
  },
  {
    n: 3,
    id: "what",
    title: "What platforming is",
    steps: 4,
    targetSeconds: 20,
    rubric: ["Final pitch"],
    script: [
      "Here is the definition most people have in their heads.",
      "It is wrong, or at least it is only the first half: that is parts reuse, and most companies stop there.",
      "Platforming is never losing a design the company already proved.",
      "Voltara proved its power stage in 2019, and six products later the brackets, the harness, the firmware and the tests all came with it.",
    ],
  },
  {
    n: 4,
    id: "plugin",
    title: "The plugin",
    steps: 4,
    targetSeconds: 45,
    rubric: ["Deliverable", "Technical feasibility"],
    script: [
      "PlatInform sits where product decisions actually get made.",
      "It works inside the web tools teams already use for product development. What you are watching runs on Velocity AI Studio.",
      "It reads what the engineer is writing, and it answers from the company's own purchasing and design data.",
      "It points to proven designs to build on, and to single parts as well, so nobody has to go looking for either.",
    ],
  },
  {
    n: 5,
    id: "similar",
    title: "How similarity is calculated",
    steps: 3,
    targetSeconds: 50,
    rubric: ["Technical feasibility"],
    script: [
      "A judge, BK, asked us on Saturday how we know that one part can replace another.",
      "These two rows are the same fan on two products, written two different ways.",
      "We score each pair on three weighted fields: what kind of thing it is, whether its ratings agree, and how much of the rest of the wording matches.",
      "The method is Fellegi-Sunter record linkage, from 1969: weighted fields, two thresholds, and a human review band between them.",
      "A different kind of thing scores zero, and one rating that disagrees caps the score at nought point three.",
      "Graded blind against a hand-labelled key, 99.8 percent of the merges were correct, with one mistake in 602.",
      "Then the harder question: two products that share no part numbers at all are still built on the same power block.",
      "Part matching finds identical parts. Design matching finds what different products have in common.",
      "Next is reading datasheets and drawings for the parts that text cannot describe. That is planned, not built.",
    ],
  },
  {
    n: 6,
    id: "stepback",
    title: "Step back",
    steps: 3,
    targetSeconds: 15,
    rubric: ["Commercial potential"],
    script: [
      "All of this runs on a company's own data.",
      "Today no team has a reason to platform, so no company hands that data over.",
      "PlatInform gives every function a reason, and it does that in three steps.",
    ],
  },
  {
    n: 7,
    id: "step-one",
    title: "Step one, the foot in the door",
    steps: 3,
    targetSeconds: 30,
    rubric: ["Commercial potential"],
    script: [
      "Step one is a two-minute ballpark aimed at the C-suite.",
      "Eight plain questions about the company, and no data to upload.",
      "Executives get a rough Platforming Index and a rough cost, so they see the size of the problem before anyone opens a parts list.",
      "For Kearney this is a business development opening: any manufacturer can take it, and every result starts a conversation.",
      "The questions were shaped with Andrew Cecola of Kearney PERLab.",
    ],
  },
  {
    n: 8,
    id: "step-two",
    title: "Step two, the measured index",
    steps: 2,
    targetSeconds: 30,
    rubric: ["Deliverable"],
    script: [
      "Step two is uploading the bill of materials.",
      "The company's own parts list and purchase history produce a measured index.",
      "Each leader sees the same score in the unit they are measured on: dollars, engineering hours, suppliers, weeks of lead time.",
      "The sample company is Voltara, a fictional energy and power manufacturer, which is the sector sitting at 20 percent.",
    ],
  },
  {
    n: 9,
    id: "step-three",
    title: "Step three, every function joins",
    steps: 2,
    targetSeconds: 25,
    rubric: ["Deliverable", "Technical feasibility"],
    script: [
      "Step three is the plugin, which puts the index inside every product decision.",
      "The first version works on purchasing data, because that is the low-hanging fruit.",
      "Where functions disagree, the decision is recorded, and each one goes back into the company's data.",
      "So the answers get better for the next team.",
    ],
  },
  {
    n: 10,
    id: "loop",
    title: "The loop",
    steps: 2,
    targetSeconds: 20,
    rubric: ["Commercial potential"],
    script: [
      "Put the three steps together and they close a circle.",
      "The ballpark gets executives a score. The measured index gives every function its own cost. The plugin gets teams reusing proven designs.",
      "And this is the segment that matters: every decision goes back in, which makes the plugin's answers better and the index sharper.",
      "Two leadership decisions moved this sample from 28 to 66 without changing a single part.",
    ],
  },
  {
    n: 11,
    id: "velocity",
    title: "Velocity AI Studio",
    steps: 3,
    targetSeconds: 25,
    rubric: ["Research and use of Velocity AI"],
    script: [
      "Velocity AI Studio validated the problem: 21 sources in one team library, 29 research chats, and every figure cited.",
      "It changed our claim. We planned to say that companies with duplicate parts fail to platform, and Velocity found no data measuring both at the same companies, so we dropped it.",
      "And it is where the plugin runs: our browser extension was built on Velocity AI Studio.",
    ],
  },
  {
    n: 12,
    id: "business",
    title: "Why this is a business",
    steps: 5,
    targetSeconds: 30,
    rubric: ["Commercial potential"],
    script: [
      "Back to the two problems we opened with, because each one is why this is a business.",
      "The engineering effort is sustained work. Platforming is never one project: each product line, each acquisition and each new design brings more to measure and more to reuse, and the plugin keeps the client engaged between projects.",
      "In a six-product sample that was 1.13 million dollars a year on 39.33 million of parts spend, about 3 percent.",
      "And the companies that do not see the potential are the business development opening. A two-minute ballpark gives any manufacturer a number to react to.",
      "The four industries under half are where those conversations start.",
      "Ballpark is free and opens the door. The measured index is a paid diagnostic. The plugin is a yearly license that keeps the gain.",
      "PlatInform turns Kearney's own research into the first meeting, the first project, and the reason to stay.",
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
