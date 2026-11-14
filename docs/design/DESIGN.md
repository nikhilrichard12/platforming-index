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
  - **PrimaryButton**: not a pill. The reference "Get Results" button is a **chamfered hexagon** (14px cut on each end) in `accent` with #1E1E1E text and a 1px `line-2` edge. Image beats the earlier "pill" note in this doc. One per screen.
  - **IconButton**: outlined circle, 34px.
- **Field**: fieldset with the legend sitting on the top border, 1px `line-2` outline, 2px radius, transparent fill. Error state turns the outline `risk` and prints a 12px `risk` line underneath.
- **ChoiceGroup**: a wrapping row of selectable options. Unselected is `panel-2` fill with a `line` border and text-2 label. Selected is a transparent fill with a 1px white border and white text, so orange stays reserved for the one primary action.
- **Badge**: solid rectangle, 2px radius, 11px text, never wraps. Tones: `neutral` (`panel-2` with text-2), `positive` (the green chip from the reference, used for "Agreed gap"), `warn` (used for "Split" and "Needs review"), `risk`.
- **Tile**: `panel` fill, no border, no shadow, square corners, 140px tall minimum.
- **StatusMark** (build screen): 16px. Empty `line-2` circle while waiting, an `accent` ring while running, a `positive` check when done.
- **KPI tile** (dashboard): label top-left at 14px/600, value bottom-right at 30px/300, source tag under the value in text-3 at 12px. Values over 10 characters drop to 24px so they stay on one line. The whole tile is a button that sends its question to the assistant.
- **GapChart**: plain SVG, no library. Thin bars in `warn` with the largest in `accent`, five `line` gridlines, dollar axis on the left, three-line part labels below. Hover dims the other bars and draws a readout in chart space; click asks the assistant.
- **SourcePopover**: centered dialog over a 60% black scrim, `panel` fill, one label/value row per field with `line` rules. Opens from a [POxxxxxx] tag and closes on Escape or an outside click.
- **IndexStrip**: one slim full-width row above the two-column split. Score at 56px/300 with "of 100" and a Provisional badge, the one-line read and four inline dimension bars, then the three steps with the current one picked out by a white top rule. About 165px tall.
- **StepStrip**: five columns of orange line icon, 20px/800 title, 15px text-2 body, with a thin text-2 arrow between columns. Icons are 56px with 2.6px strokes. Stacks to one column under `md`.
- Sidebar (when used): black, small text-3 group labels, 14px nav items, active item gets a surface-colored row.
- Chart panel: panel fill, title top-left in weight 600, segmented toggle top-right, legend centered above the plot, thin gridlines in line color.
- Tables: `panel` background, `line` row rules, `panel-2` header row, tabular right-aligned numbers, 8px vertical cell padding for tariff-style density. Headers and cells stay on one line; the first column takes `max-w-0 w-full truncate` so it absorbs the slack and ellipsizes rather than pushing later columns out of view. A heat column fills its cell edge to edge, as in the tariff table.
- Assistant panel: `panel` fill, sticky. User messages right-aligned with a 1px white border; assistant messages on `panel-2`. Monospace is reserved for evidence tags, part numbers, and file names. A status line at the foot carries a `positive` dot for live and a `warn` dot for the offline fallback, and appears only once an answer has come back.

## Rules

- Dark theme only. Flat. No gradients, shadows, glows, or rounded cards.
- Corners are square or nearly square (2px on fields and chips). Only the outline button and icon button are pills; the primary button is a chamfered hexagon.
- Orange appears once per screen, on the main action. Two exceptions, both
  carrying meaning rather than decoration: the build screen's transient marks
  (the ring on the running stage, the 1 second left rule on an arriving
  section), and the largest bar in the dashboard's gap chart.
- Page gutter is 48px. 24px between blocks, 16px inside tiles.
- Every number shows a source tag in text-3 beneath or beside it.
- No em dashes in UI copy. This covers prompt text rendered on screen, so `lib/agent/buildSystemPrompt.ts` carries none either.
- Every number on screen reads from `data/derived/*.json` through `lib/voltaraData.server.ts`. No figure is typed into a component, including the counts in filter labels and the evidence lines on the alignment view.
- The index score leads the dashboard. It sits above the fold at 1440x900, with the KPI tiles and the top of the chart.
- A scroll container clips anything left of its padding edge. A left rule on a
  child inside one needs the container pulled left and padded back (`-ml-5 pl-5`).
