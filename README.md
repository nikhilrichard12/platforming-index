# PlatInform

Kearney PERLab x UIUC hackathon, team Ladebuggers

## Test the Chrome extension

PlatInform includes a Chrome extension that checks the page you are reading against the parts a company already buys. To try it, download the project and load the `extension/` folder into Chrome. No build step is required.

1. Download the project: on the repository page choose Code, then Download ZIP, and unzip it.
2. Start the demo app, which the extension connects to at `http://localhost:3000`. From the project folder, run `cd app && npm ci --legacy-peer-deps && npm run dev`.
3. Open `chrome://extensions`, turn on Developer mode (top right), choose Load unpacked, and select the `extension/` folder.
4. Open a page in your own product tools (Jira or Confluence on atlassian.net, or Airtable) and click the PlatInform icon in the Chrome toolbar.

Chrome displays a developer mode notice when it restarts. This is expected and can be dismissed.
