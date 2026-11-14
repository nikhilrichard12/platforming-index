/**
 * Service worker. The content script runs on the host page and should not own
 * the network calls, so every fetch happens here and the result goes back as
 * plain JSON.
 */

const API = "http://localhost:3000";

async function postJson(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

const HANDLERS = {
  checkPart: (payload) => postJson("/api/check-part", payload),
  recordDecision: (payload) => postJson("/api/part-decision", payload),
  ask: (payload) => askAssistant(payload),
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
