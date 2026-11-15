# PlatInform extension

The way people reach PlatInform outside the dashboard. It does two
things: it opens a side panel that checks whatever page you are reading
against the parts your company already buys, and it keeps the inline card on
part request forms for the moment a part number would be born.

## What it does

- **Side panel.** Click the toolbar icon. The panel opens beside the page,
  reads it, and says how many of the things the page describes already exist,
  with the part, the best price, the supplier, the country of origin and the
  purchase order behind each one. Reuse or decline from the panel; declining
  writes a rule.
- **Toolbar badge.** On an allowed page the worker counts how many needs
  already exist and puts that number on the icon. No number means nothing
  matched. A badge count leaves no trace in the activity log; opening the
  panel does.
- **Inline card.** On a part request form the card still appears beside the
  description field, with the part already in stock and the yearly cost of a
  new part number.

## Scenes

`fixtures/scenes/` holds three pages for the pitch, each with the plan it is
expected to produce:

- `engineering.txt` — a cooling module brief for a new outdoor cabinet.
- `sales.txt` — a custom variant request for a top account.
- `procurement.txt` — a supplier change note.

Each `*.expected.json` records what `POST /api/plan-product` returns for that
page: the needs, where each one lands, and the interfaces it starts from. To
replay one without the extension, open the panel with the page text in the
query string:

    /panel?title=VBS-30%20Thermal%20design%20brief&text=<the file, url encoded>

## Where it runs

Host permissions, and the only pages it reads:

- `http://localhost:3000/*` (the demo, including `/mock-plm` and
  `/mock-procurement`)
- `https://*.atlassian.net/*`
- `https://airtable.com/*`
- `https://kearney-perlab.growthsignals.com/*` (Velocity AI Studio)

Page text goes to `PLATFORMING_INDEX_URL` and nowhere else. Nothing is stored
on the page, and the extension writes to the page only when someone clicks
"Reuse existing part".

## Install

1. Run the app: `cd app && npm run dev`.
2. Open `chrome://extensions`, turn on Developer mode, choose "Load unpacked"
   and pick this folder.
3. Open one of the allowed pages, for example
   `http://localhost:3000/mock-plm`, and click the toolbar icon.

`PLATFORMING_INDEX_URL` is `http://localhost:3000`, set as `API` at the top of
`background.js` and `sidepanel.js`. Change both to point at a deployed app.

## Files

| File | What it does |
|---|---|
| `manifest.json` | MV3 manifest: side panel, host permissions, content script |
| `sidepanel.html` / `sidepanel.js` | The frame around `/panel`, and the context relay |
| `background.js` | Opens the panel, relays page context, sets the badge, owns every fetch |
| `content.js` | Reads the page, keeps the inline card, draws it in a Shadow DOM |
| `adapters.js` | Field selectors per host page, so a new form is one entry |

## Reading a page

The content script prefers the current selection, then the last answer on a
chat style research page, then the main region. It skips navigation, headers,
footers, buttons, form fields, password inputs and anything hidden, and caps
what it sends at 8,000 characters. It re-reads when the selection changes and
when the address changes, which is what single page apps do instead of
loading.

## Checking by hand

Chrome 157 ignores `--load-extension`, so the automated run in this repo
injects `content.js` into a page instead. These need a human:

1. Load the folder unpacked, open `http://localhost:3000/mock-plm`, and click
   the toolbar icon. The panel should open and show "14 of 18 needs already
   exist."
2. Select three lines of the requirements table. The panel should re-check
   and show only those.
3. Open `http://localhost:3000/mock-procurement` and type a fan description.
   The inline card should still appear.
4. Check the toolbar badge on `/mock-plm` before opening the panel.
