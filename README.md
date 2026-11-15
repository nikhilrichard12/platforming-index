# PlatInform

Kearney PERLab x UIUC hackathon, team Ladebuggers

## Install the Chrome extension

There is no build step. The folder that contains `manifest.json` is `extension/`.

1. Zip the `extension/` folder (not needed if you cloned the repo, select `extension/` in step 4).
2. Go to `chrome://extensions`
3. Turn on Developer mode (top right)
4. Click "Load unpacked" and select the unzipped folder

Chrome shows a developer mode warning when it restarts. That is expected, just dismiss it.

The extension talks to `http://localhost:3000`, so start the app first: `cd app && npm run dev`
