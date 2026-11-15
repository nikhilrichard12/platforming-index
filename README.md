# PlatInform

Kearney PERLab x UIUC hackathon, team Ladebuggers

PlatInform helps manufacturers start platforming and keep doing it. Executives answer eight questions and get a rough Platforming Index in two minutes. The company then uploads its bill of materials and gets a measured index, with the cost shown to each function in its own unit. Leaders see where they disagree and decide who owns what. A browser extension carries this into daily work by pointing engineers to parts and designs the company already owns.

Voltara Power Systems and all data in this project are fictional sample data.

## Live links

- Product: https://kearney-rosy.vercel.app
- Dashboard: https://kearney-rosy.vercel.app/dashboard
- Pitch: https://kearney-rosy.vercel.app/pitch (arrow keys to advance, F for fullscreen)

The hosted copy is read-only: decisions made there do not persist between visits. Run it locally for the full experience.

## Run it locally

```
cd app && npm ci --legacy-peer-deps && npm run dev
```

Then open http://localhost:3000.

## Install the extension without running anything

1. Download `platinform-extension.zip` from this repository and unzip it.
2. Open `chrome://extensions` and turn on Developer mode (top right).
3. Choose Load unpacked and select the unzipped `platinform-extension` folder.
4. Open https://kearney-rosy.vercel.app/mock-plm, or a page on Velocity AI Studio, Jira, or Airtable.
5. Click the PlatInform icon in the Chrome toolbar. The panel opens beside the page.

This copy of the extension talks to the hosted product above. The `extension/` folder in the repository talks to a local server instead, as described below.

## Test the Chrome extension

PlatInform includes a Chrome extension that checks the page you are reading against the parts a company already buys. To try it, download the project and load the `extension/` folder into Chrome. No build step is required.

1. Download the project: on the repository page choose Code, then Download ZIP, and unzip it.
2. Start the demo app, which the extension connects to at `http://localhost:3000`. From the project folder, run `cd app && npm ci --legacy-peer-deps && npm run dev`.
3. Open `chrome://extensions`, turn on Developer mode (top right), choose Load unpacked, and select the `extension/` folder.
4. Open a page in your own product tools (Jira or Confluence on atlassian.net, or Airtable) and click the PlatInform icon in the Chrome toolbar.

Chrome displays a developer mode notice when it restarts. This is expected and can be dismissed.
