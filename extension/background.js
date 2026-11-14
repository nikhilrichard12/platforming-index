/**
 * Service worker. The content script runs on the host page and should not own
 * the network calls, so every fetch happens here and the result goes back as
 * plain JSON.
 *
 * It also does two things the page cannot: it opens the side panel when the
 * toolbar icon is clicked, and it counts how much of the page already exists
 * so the toolbar badge can say so before anyone opens anything.
 */

const API = "http://localhost:3000";

/* Only these hosts are read. Page text goes to the Platforming Index and
   nowhere else. Keep in step with host_permissions in manifest.json. */
const ALLOWED = [
  /^http:\/\/localhost:3000\//,
  /^https:\/\/[^/]+\.atlassian\.net\//,
  /^https:\/\/airtable\.com\//,
  /^https:\/\/kearney-perlab\.growthsignals\.com\//,
];

const allowed = (url) => !!url && ALLOWED.some((p) => p.test(url));

async function postJson(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-pi-source": "extension" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

/** The assistant streams plain text; collect it before replying. */
async function askAssistant(body) {
  const res = await fetch(API + "/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`/api/agent returned ${res.status}`);
  return {
    text: await res.text(),
    live: res.headers.get("X-Agent-Mode") === "live",
  };
}

/* ---------- the toolbar badge ---------- */

async function setBadge(tabId, count) {
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#EC5E31" });
  await chrome.action.setBadgeTextColor?.({ tabId, color: "#1E1E1E" });
  await chrome.action.setBadgeText({ tabId, text: count > 0 ? String(count) : "" });
}

/**
 * A badge scan answers one question, quietly: how many needs on this page
 * already exist? It is marked quiet so it leaves no row in the activity log;
 * only opening the panel is a real visit.
 */
async function scanForBadge(tabId, payload) {
  if (!allowed(payload?.url)) return { covered: 0 };
  try {
    const plan = await postJson("/api/plan-product", {
      product_name: payload.title || "This page",
      text: payload.text || "",
      quiet: true,
    });
    const covered = plan?.summary?.covered ?? 0;
    await setBadge(tabId, covered);
    return { covered };
  } catch {
    await setBadge(tabId, 0);
    return { covered: 0 };
  }
}

/* ---------- context relay ---------- */

/** The last context each tab reported, so the panel can ask for it on open. */
const lastContext = new Map();

function relay(payload) {
  chrome.runtime.sendMessage({ type: "pageContext", payload }).catch(() => {});
}

const HANDLERS = {
  checkPart: (payload) => postJson("/api/check-part", payload),
  recordDecision: (payload) => postJson("/api/part-decision", payload),
  ask: (payload) => askAssistant(payload),
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender?.tab?.id;

  if (message?.type === "pageContext") {
    if (tabId !== undefined) lastContext.set(tabId, message.payload);
    relay(message.payload);
    scanForBadge(tabId, message.payload);
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "panelOpened") {
    // The panel asked what the active tab is reading.
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      const context = tab ? lastContext.get(tab.id) : null;
      if (context) relay(context);
      else if (tab?.id !== undefined) {
        chrome.tabs.sendMessage(tab.id, { type: "sendContext" }).catch(() => {});
      }
    });
    sendResponse({ ok: true });
    return false;
  }

  const handler = HANDLERS[message?.type];
  if (!handler) {
    sendResponse({ ok: false, error: `unknown message ${message?.type}` });
    return false;
  }
  handler(message.payload ?? {})
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: String(err) }));
  return true; // keep the channel open for the async reply
});

/* Clicking the toolbar icon opens the panel beside the page. */
chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id === undefined) return;
  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: "sidepanel.html",
    enabled: true,
  });
  await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.tabs.onRemoved.addListener((tabId) => lastContext.delete(tabId));
