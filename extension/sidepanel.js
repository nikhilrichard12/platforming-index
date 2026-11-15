/**
 * The side panel is a thin frame around PLATFORMING_INDEX_URL/panel. It owns
 * no logic: it loads the panel page and relays page context into it, so the
 * panel and the dashboard stay one codebase.
 */

/* The PlatInform server. scripts/package-extension.sh rewrites this line. */
const PI_SERVER = "http://localhost:3000";

const API = PI_SERVER;
const PANEL_READY = "platforming-index:panel-ready";
const PANEL_CONTEXT = "platforming-index:context";

const frame = document.getElementById("panel");
const wait = document.getElementById("wait");

let ready = false;
let pending = null;

frame.src = `${API}/panel`;
frame.addEventListener("load", () => {
  wait.hidden = true;
  frame.hidden = false;
});

function send(context) {
  if (!context) return;
  if (!ready) {
    pending = context;
    return;
  }
  frame.contentWindow?.postMessage({ type: PANEL_CONTEXT, ...context }, API);
}

window.addEventListener("message", (event) => {
  if (event.data?.type !== PANEL_READY) return;
  ready = true;
  if (pending) {
    send(pending);
    pending = null;
  } else {
    // Opened from the toolbar: ask the page for its context.
    chrome.runtime.sendMessage({ type: "panelOpened" }).catch(() => {});
  }
});

/* Context arrives from the content script by way of the service worker. */
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "pageContext") send(message.payload);
});
