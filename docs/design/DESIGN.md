# Design system: match PERLab's accelerator look

Reference screenshots in this folder. Open them before styling anything.

- `perlab-ingredient-compass.png`: the main reference. Top bar, breadcrumb, tabs, filter fields, KPI tiles, chart panel, buttons.
- `perlab-tariff-simulator.png`: left sidebar navigation and dense data table.
- `velocity-how-it-works.png`: the five-step "how it works" strip. Use this pattern for our own flow diagram.

Match the visual language. Do not copy the PERLab or Kearney wordmark or logo. Our product name in the top bar is "Platforming Index".

Screenshots of our own pages live in `out/`.

## Tokens (sampled from the screenshots; resample if something looks off)

| Token | Value | Use |
|---|---|---|
| chrome | #000000 | Top bar, sidebar, page edge |
| surface | #191A1B | Main app background |
| panel | #242728 | Cards, KPI tiles, chart panels |
| panel-2 | #303436 | Outline button fill, selectable chips, hover |
| line | #2F3234 | 1px hairlines: tab row rule, table row rules |
| line-2 | #6A7275 | Field outlines and button outlines |
| text | #FFFFFF | Headings, values |
| text-2 | #B8BBBE | Body, labels, field legends |
| text-3 | #818182 | Breadcrumb parent, units, captions |
| accent | #EC5E31 | Primary action only (one per screen), step icons |
| positive | #59C376 | Up arrows, "Opportunity" style badges |
| warn | #F5C042 | Low-risk bars, cautions |
| risk | #E5484D | High-risk bars, errors |
| neutral-bar | #949B9E | "Not at risk" bars |
| heat-low to heat-high | #5E3536 to #D9595C | Table heatmaps, interpolated by `heatColor(t)` in `lib/voltaraData.ts` |

Live in `app/tailwind.config.ts` as named colors and in `app/app/globals.css` as CSS variables.

### Corrections made on 2026-11-14 after resampling the images

- `accent` was #EC5A31. The "Get Results" button is **#EC5E31**.
- `panel-2` was #363738. The Cancel and Save buttons fill at **#303436**.
- `line` was a single #3A3D40 token doing two jobs. The images use two weights:
  the hairline under the tab row measures **#2F3234**, while field and button
  outlines are much lighter at **#6A7275**. Split into `line` and `line-2`.

## Type

- One grotesque sans for everything. Inter, loaded at 300/400/600/700/800. No serif.
- Page title: 32px, weight 300, white. Breadcrumb above it at 17px weight 300, parent in text-3, current section in white.
- KPI values: 28 to 32px, weight 300 (light), right-aligned at the bottom of the tile, small green arrow before the number.
- KPI labels: 14px, weight 600, top-left of the tile. Unit label ("$", "Amt") bottom-left in text-3.
- Tabs and section labels: 14px, weight 400. Table headers 13 to 14px, text-2. No all-caps eyebrow labels.
- Field legend: 12px, weight 400, text-2.
- "How it works" step titles: weight 800, white, with a line-art orange icon above and an arrow between steps. The marketing page sets them at 28px; inside the app we use **20px** so five steps fit one row at 1440px.

## Components

Shared components live in `app/components/ui/`.

- **TopBar**: black, 44px tall, 48px gutter. "Platforming" bold, "Index" light, no logo. At the right, the client name in text-2 and a "Sample data" badge.
- **PageHeader**: breadcrumb, then title, with optional right-side actions.
- **Tabs**: plain text, active tab has a 1px white underline, a hairline (`line`) runs under the whole row. Our addition: a 6px `risk` dot after a tab whose answers are incomplete.
- **Button**: pill, 34px tall, `panel-2` fill, 1px `line-2` border, white text. The `muted` variant (transparent fill, `line` border, text-3) is the disabled state of a primary action that is not ready yet.
  - **PrimaryButton**: the same 34px pill as `Button`, filled `accent` with #1E1E1E text and no border. One per screen. The reference "Get Results" button is a chamfered hexagon; we tried that shape and it read as a pointed tag rather than a button beside our other pills, so every button in this app is a pill and only the fill separates the primary one.
  - **IconButton**: outlined circle, 34px.
- **Field**: fieldset with the legend sitting on the top border, 1px `line-2` outline, 2px radius, transparent fill. Error state turns the outline `risk` and prints a 12px `risk` line underneath.
- **ChoiceGroup**: a wrapping row of selectable options. Unselected is `panel-2` fill with a `line` border and text-2 label. Selected is a transparent fill with a 1px white border and white text, so orange stays reserved for the one primary action.
- **Badge**: solid rectangle, 2px radius, 11px text, never wraps. Tones: `neutral` (`panel-2` with text-2), `positive` (the green chip from the reference, used for "Agreed gap"), `warn` (used for "Split" and "Needs review"), `risk`.
- **Tile**: `panel` fill, no border, no shadow, square corners, 140px tall minimum.
- **StatusMark** (build screen): 16px. Empty `line-2` circle while waiting, an `accent` ring while running, a `positive` check when done.
- **KPI tile** (dashboard): label top-left at 14px/600, value bottom-right at 30px/300, source tag under the value in text-3 at 12px. Values over 10 characters drop to 24px so they stay on one line. The whole tile is a button that sends its question to the assistant.
- **GapChart**: plain SVG, no library. Thin bars in `warn` with the largest in `accent`, five `line` gridlines, dollar axis on the left, three-line part labels below. Hover dims the other bars and draws a readout in chart space; click asks the assistant.
- **SourcePopover**: centered dialog over a 60% black scrim, `panel` fill, one label/value row per field with `line` rules. Opens from a [POxxxxxx] tag and closes on Escape or an outside click.
- **Blocked state**: when a rule rules a part out for a product, the badge turns `warn` and reads "Blocked by a rule for this product", the rule text and its date replace the tiles, the alternatives list replaces the reuse line, and the accent primary button is removed entirely. Same shape in the dashboard and in the extension card.
- **Extension card** (`extension/content.js`): the design system on someone else's page. 380px, fixed to the right of the viewport below the host's header, drawn in a Shadow DOM so neither stylesheet can reach the other. Black header with the wordmark, a `positive` badge, three `panel-2` tiles, the accent primary pill and an outline pill. The CSS is hand-written there rather than Tailwind because the extension ships no build step; keep the hex values in step with the token table above.
- **IndexStrip**: one slim full-width row above the two-column split. Score at 56px/300 with "of 100" and a Provisional badge, the one-line read and four inline dimension bars, then the three steps with the current one picked out by a white top rule. About 165px tall.
- **StepStrip**: four or five columns of orange line icon, 20px/800 title, 15px text-2 body, with a thin text-2 arrow between columns. Icons are 56px with 2.6px strokes. Stacks to one column under `md`. Used for the survey overview and again on Connections for the three moments a part number can be born.
- **Possible match card**: the lighter sibling of the confident card, shown when the best score lands between 0.35 and 0.6. No badge, no tiles, no primary button. A text-2 "Possible match" line, up to three candidates with their part number count and best price, and "Keep typing to narrow it down." in text-3. It suggests, it does not ask for a decision.
- **Price spread panel** (`components/dashboard/PriceSpreadPanel.tsx`): one row
  per part, the part name at the left, a hairline price track in the middle
  with one dot per part number at the price actually paid, and the yearly gap
  at the right. The cheapest dot is `positive` and sits above the stack; every
  other dot is text-2. Dots appear at their real prices, hold a second, then
  slide to the cheapest, row by row, while each gap figure and the total count
  up. The end state leaves a faint `line-2` tick where each dot started, so a
  still frame still carries the point. No accent anywhere in this panel.
- **AnimationPanel**: the shell every animated panel shares. Title, optional 12px text-3 note, a control slot on the right, the stage, and a Replay pill. Same `panel` fill and square corners as every other block, so motion is the only thing that marks it out.
- **CountUp**: a number that counts to its new value over 700ms when the value changes. Renders the figure outright on first paint, so the server HTML and a reader with reduced motion both show the real number. Used for the index score and the four dimension scores.
- **Merge panel** (`252 become 60`, top of Parts): 252 7px squares, one per part number, blocked and tinted by product in six tints walked from text-3 to text-2. They travel to 60 clusters on a 12 by 5 grid, staggered 6ms by start position so the motion reads as a wave left to right. Cluster footprint is the number of part numbers merged. Core candidates land in accent, two-to-four in text-2, unique in text-3. About 5 seconds, once per tab open.
- **Exploded view** (Summary): an isometric stack, one diamond slab per layer, parts drawn as small outlined diamonds on the slab surface. Stroke 1.1px on slabs, 1.5px on blocks, no fills except an 88% `surface` wash so a slab occludes what sits behind it. Accent for five or more products, text for two to four, text-3 for unique. Assembled sits centred in the same frame the exploded stack fills, so the panel never changes height.
- **Live stage** (Connections): three outlined stations, a Rules tray under the middle one, and chips that carry one call across it. Chips are `panel-2` on a `line` border; the result keeps its badges inside the station box and its numbers as a caption below it.
- **Origin column and line**: country of origin is a column in the parts rows, the source popover and the New product table, and a line on every card. When a compliance rule blocks a part, the same part from a compliant supplier is offered in 13px text above the alternatives: "Same part, US-origin source: Ostrava Thermal, $12.73", with the part number and its PO tag. Origin is read from `voltara_suppliers.csv`, never guessed from a supplier name, and the copy says so wherever a reader might guess.
- **Ballpark result** (`components/survey/BallparkResult.tsx`): the score as a
  range in the 56px light figure with a `warn` "Ballpark" badge, three tiles,
  one sentence for the reader's role, and a "How we got this" disclosure that
  prints the arithmetic with their own numbers in a monospace block, the cost
  per part number as an editable field, and every constant with its source.
  One accent action, "Get the measured index"; the tab header steps back to an
  outline button on this screen so orange still appears once.
- **Side panel** (`/panel`, 400 to 600px): the extension's page, one panel
  height with no scrolling. Top to bottom: a two line header (the product, then
  the part being looked for) with the Sample data badge and a three item part
  switcher; the 3D product view at about 55% of the height; one match card at a
  time with prev and next arrows, Reuse and Can't reuse (the decline reason
  picker replaces the buttons in place); the assistant with three suggested
  questions as chips, a one line input and a "See more in dashboard" link. An
  answer opens as a short overlay above the assistant and closes with "Close".
  The score, the decisions list and the part-number merge animation live on the
  dashboard only.
- **Product stage** (`components/panel/ProductStage.tsx`, models in
  `lib/models/`): the 3D view shows the part being looked at, alone, and nothing
  else. Procedural Three.js, toon shading, thin edge lines, an accent rim light,
  background `panel`. Twelve parts in voltara_parts.json have a component in the
  SunLine 5 kW inverter model (`TWINS`) and show that component. Every other
  part shows a plain shape chosen from its name and category (`parts.ts`), so
  something always appears. The caption says which: "Illustrative model of this
  part. Not CAD." or "Generic shape for this type of part. Not CAD." With
  nothing searched, the whole inverter rests assembled and turning.
  - **One part everywhere**: the header line, the match card and the 3D view are
    all driven by one current part. The three-tab switcher is a manual override
    that changes all three; the next search on the page puts it back.
  - **Exploded** separates the part's own pieces (capacitor cans lift off their
    base, a fuse comes apart into caps, tube and element).
  - **Callout**: a 1px accent line from a label with the part's name to the top
    of the part, re-projected every frame.
  - **Sequence** on load and on every new search: assembled and turning, the
    pieces part with a stagger, then the callout fades in. anime.js timelines.
  - **Camera**: fitted to the part's bounding box every frame, from the angle it
    is being seen at, so it fills about 80% of the view and stays centred even
    for a long thin part. Drag to rotate with damping; zoom and pan are off.
    Idle rotation resumes three seconds after a drag.
  - **Layout inside the stage**: label top left, Replay and the Assembled and
    Exploded toggle bottom, caption as one line below the canvas. Rendering
    stops when the panel is hidden; with reduced motion nothing moves by
    itself, and a drag still turns it.
- **New product tab**: a name field beside a tall concept textarea, one text link ("Load sample concept") on the left of the row and the single accent button ("Check against the core") on the right. The answer is a 17px light headline, two supporting lines, then the standard table: need, status badge, matched part, best price, PO tag. Status badges read `positive` in core, `neutral` shared and unique, `warn` for blocked and for new part needed, because both of those end in a new part number.
- **ActivityTable**: the standard table with a 2px left rule per row, transparent at rest and `accent` for one second on a row that arrived since the last poll. The Source column carries a `positive` badge when the check came from the panel or the extension, and a `neutral` badge when it came from this dashboard. 20 rows on Connections, 3 on Decisions.
- Sidebar (when used): black, small text-3 group labels, 14px nav items, active item gets a surface-colored row.
- Chart panel: panel fill, title top-left in weight 600, segmented toggle top-right, legend centered above the plot, thin gridlines in line color.
- Tables: `panel` background, `line` row rules, `panel-2` header row, tabular right-aligned numbers, 8px vertical cell padding for tariff-style density. Headers and cells stay on one line; the first column takes `max-w-0 w-full truncate` so it absorbs the slack and ellipsizes rather than pushing later columns out of view. A heat column fills its cell edge to edge, as in the tariff table.
- Assistant panel: `panel` fill, sticky. User messages right-aligned with a 1px white border; assistant messages on `panel-2`. Monospace is reserved for evidence tags, part numbers, and file names. A status line at the foot carries a `positive` dot for live and a `warn` dot for the offline fallback, and appears only once an answer has come back.

## Rules

- Dark theme only. Flat. No gradients, shadows, glows, or rounded cards.
- Corners are square or nearly square (2px on fields and chips). Every button is a pill, including the primary one; fill, not shape, marks the primary action.
- Orange appears once per screen, on the main action. Two exceptions, both
  carrying meaning rather than decoration: the build screen's transient marks
  (the ring on the running stage, the 1 second left rule on an arriving
  section), and the largest bar in the dashboard's gap chart.
- Page gutter is 48px. 24px between blocks, 16px inside tiles.
- Every number shows a source tag in text-3 beneath or beside it, written as
  words ("Purchase history", "Parts list", "Product master"). A file name
  belongs in the source popover, where the file itself is the evidence.
- A rate is written in whole dollars: "$100 per part number", not "$100.00".
  `rate()` in `lib/voltaraData.ts`; `usd()` still formats prices and totals.
- The top bar names the sample company only on the screens that run on sample
  data. The ballpark is about the reader's own company, so it reads "Your
  company" with no sample badge.
- One money format everywhere, `usd()` in `lib/voltaraData.ts`, mirrored in the
  side panel's host extension because it does not share our bundle: two decimals
  under $1,000, no decimals above it, K at ten thousand, M at a million,
  thousands separators throughout. A unit price and a yearly total are the same
  kind of number to a reader. `priceSpan()` prints one figure when both ends of
  a range round the same way.
- The assistant badge names the role from the saved profile, the same string
  the page title uses. The four role lenses are an internal mapping, never a
  label: a CEO is never told they are "Finance".
- No em dashes in UI copy. This covers prompt text rendered on screen, so `lib/agent/buildSystemPrompt.ts` carries none either.
- Every number on screen reads from `data/derived/*.json` through `lib/voltaraData.server.ts`. No figure is typed into a component, including the counts in filter labels and the evidence lines on the alignment view.
- The measured index is computed, never set. `lib/index.ts` holds four
  formulas, each a ratio of two numbers in the data, and the strip carries a
  "How the score works" disclosure that prints them with this company's
  figures in them. A recorded reuse retires a part number, so Complexity
  control rises out of the arithmetic rather than being credited points. The
  counter beside the score, "Part numbers avoided", is what moves on every
  single decision.
- Two levels, never confused. A ballpark comes from 8 answers and is always a
  range with a `warn` badge, named constants and visible arithmetic. A measured
  index comes from a parts list, carries a `positive` "Measured" badge and the
  line "From 252 part numbers and 1,109 purchase orders.", and prints single
  figures. A ballpark prints one headline figure with its range on the line
  below ("33 of 100", then "Likely between 23 and 43"), never a range as the
  headline. Where both exist the dashboard shows "Ballpark said 33" beside
  the measured score, so the gap between guessing and measuring is on screen
  rather than in an argument.
- The dashboard is two columns under the tab row: the page scrolls on the
  left, the assistant holds the right at 420px from the tab row to the bottom
  of the window, and nothing else sits in that column. The page itself does
  not scroll; the left column does.
- The assistant carries a four point mark (`components/ui/Sparkle.tsx`) beside
  its name and beside every reply. Suggested questions are outline chips above
  the input, not links in the thread.
- A role name never shows a slash. `shortRole()` in `lib/roles.ts` is what a
  reader sees ("CFO view", "Answering for CFO"); the long strings stay as ids.
- The index score leads the dashboard. It sits above the fold at 1440x900, with the KPI tiles and the top of the chart.
- `/mock-procurement` is deliberately outside this design system. It is a stand-in for the customer's own software, so it has its own root layout and its own light stylesheet, and nothing in `components/ui/` may leak into it.
- Evidence tags read as words on screen (Survey, Kearney survey 2026, Product master). Only purchase order tags stay in their raw form, because that is what the buyer searches for.
- An exception never lowers the index score, and every surface that records one says so. Complexity a rule requires is not complexity anyone chose.
- The check reaches engineers through one front door outside the dashboard: the browser extension. Its side panel rides along with whatever page they are reading, and its inline card appears on a part request form. Both call the same endpoints the Decisions tab does, so the wording only has to be right once.
- The check is one question asked at three moments, and the Connections strip
  says so in order: Concept, Design, Part release. Each one is the panel or
  the card on a page the engineer is already reading, and all three call the
  same parts data and the same rules.
- A plan never moves the index score. Only a recorded decision on a real part
  does, and every surface that shows a plan says so.
- Motion is anime.js v4 (`animate`, `createTimeline`, `stagger`, `utils`),
  imported from `animejs` in client components only.
- Every animation animates real rows. The merge moves one element per part
  number in `voltara_parts.json`, the exploded view draws one block per part
  the product carries, and the live stage draws the part numbers the check
  actually returned. Nothing on a stage is a placeholder.
- Every animation has an end state that carries the whole point on its own,
  a Replay control, and a `prefers-reduced-motion` path that jumps straight to
  that end state. `useReducedMotion` reads the setting on the first render, not
  in an effect, or an animation that starts with its tab would play once first.
- Animated colour comes from the token table above and nowhere else. Accent
  still means one thing: a part five or more products already share.
- An alternative must be the same kind of thing as the part it replaces. The
  matcher compares head nouns, so a fan guard is never offered in place of a
  fan. With nothing in the same category the card says "No approved alternative
  yet. Request a new part and note the rule." in all three surfaces.
- The index score responds to use. Complexity control starts at 50 and gains 2
  points per recorded reuse; an exception with a reason changes nothing. The
  strip carries that sentence under the read so a moving number is never a
  surprise. Reset restores the starting values.
- Connections is one column, not two. The sources table needs the full content
  width to keep its five headers readable.
- Nothing on Connections pretends to call a real system. "Sync now" re-reads the
  CSV files on this machine and says so in the footnote; an unconnected source
  shows the columns it would need and the words "connector not active".
- A scroll container clips anything left of its padding edge. A left rule on a
  child inside one needs the container pulled left and padded back (`-ml-5 pl-5`).
