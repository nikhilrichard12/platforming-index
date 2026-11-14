# Platforming Index browser extension

Shows the part Voltara already buys at the moment someone requests a new one,
inside the procurement system they already use.

The point of the extension is that it works on a page we do not own. The demo
page (`/mock-procurement`) contains no Platforming Index code and knows nothing
about the check.

## Load it in Chrome

1. Start the app: `cd app && npm run dev`. It must be on `http://localhost:3000`.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick this `extension/` folder.
5. "Platforming Index" appears in the list with a service worker. If it shows
   an error, click **Errors** to see it.

## Demo it

1. Open `http://localhost:3000/mock-procurement`. It looks like OrderDesk, a
   stand-in for the manufacturer's own procurement system.
2. In **Description**, type: `Fan, axial, 120 mm, 24 VDC`
3. Half a second after you stop typing, the card appears on the right. It shows
   6 existing part numbers, the best price of $9.77 at Norwick Components, and
   a $5,324 yearly saving at 1,800 units.
4. **Reuse existing part** writes `10-92550` into the Part number field and
   records the decision.
5. **Request an exception** asks why this product needs its own part and
   records that instead.
6. **Ask why** sends the question to the assistant with the profile saved from
   the survey, and shows the reply with its evidence tags.
7. Open `http://localhost:3000/dashboard` and the **New part check** tab to see
   the decisions you just recorded.

Nothing matches below 0.6 confidence, so typing something Voltara does not buy
(`titanium widget`) shows no card at all.

## What is where

| File | Does |
|---|---|
| `manifest.json` | Manifest V3. Content script on `/mock-procurement` only, one host permission, no tabs or storage permission. |
| `adapters.js` | The only site-specific knowledge: which selectors hold the description, product, units, and part number. Adding a second procurement system means adding one entry here. |
| `content.js` | Watches the description, debounces 500ms, asks the background worker for a check, and draws the card in a Shadow DOM so the host page's styles cannot reach it. |
| `background.js` | Does the fetches to `/api/check-part`, `/api/part-decision`, and `/api/agent`, and returns JSON. |

## Known limits

- The content script is registered for `http://localhost:3000/mock-procurement*`
  only. Pointing it at a real system means adding both a `matches` entry in the
  manifest and an adapter.
- Everything is sample data for a fictional company, and a match is a
  suggestion until engineering approves it.
- Chrome 137 and later ignore the `--load-extension` command line flag, so the
  extension cannot be loaded by an automated browser. It must be loaded by hand
  as above. The card itself is covered by injecting `content.js` into the page
  in the test harness.
