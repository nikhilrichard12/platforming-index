/**
 * Platforming Index content script.
 *
 * Watches the requisition description on the host page and, when the
 * description matches a part Voltara already buys, shows the evidence before
 * a new part number is created.
 *
 * The card lives in a Shadow DOM so the host page's stylesheet cannot reach
 * it and ours cannot leak out. Nothing is written to the page except the part
 * number, and only when someone clicks "Reuse existing part".
 */

const PI = {
  adapter: null,
  host: null, // the <div> we attach the shadow root to
  root: null, // the shadow root
  timer: null,
  lastQuery: "",
  match: null,
  dismissed: "", // description the user closed the card on
};

const DEBOUNCE_MS = 500;

const REASON_KINDS = [
  ["compliance_or_origin", "Compliance or country of origin"],
  ["customer_requirement", "Customer requirement"],
  ["technical_fit", "Technical fit"],
  ["other", "Other"],
];
const MIN_CONFIDENCE = 0.6;
const POSSIBLE_CONFIDENCE = 0.35;

/* ---------- talking to the background worker ---------- */

function send(type, payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (reply) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(reply ?? { ok: false, error: "no reply" });
      }
    });
  });
}

/* ---------- reading the host page ---------- */

function field(selector) {
  return selector ? document.querySelector(selector) : null;
}

function readForm() {
  const a = PI.adapter;
  return {
    description: field(a.description)?.value?.trim() ?? "",
    product: field(a.product)?.value ?? "",
    unitsPerYear: Number(field(a.unitsPerYear)?.value ?? 0) || 0,
  };
}

/** React and friends listen for input events, so fire one after writing. */
function writePartNumber(value) {
  const input = field(PI.adapter.partNumber);
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

/* ---------- formatting ---------- */

/* The one money format, the same as the app and the MCP server. */
const usd = (n) => {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e6) return sign + "$" + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e4) return sign + "$" + Math.round(v / 1e3).toLocaleString("en-US") + "K";
  if (v >= 1e3) return sign + "$" + Math.round(v).toLocaleString("en-US");
  return sign + "$" + v.toFixed(2);
};

const px = usd;

/* Country of origin comes from the data, never from the supplier name. */
const ORIGIN_ADJECTIVE = {
  "United States": "US",
  Mexico: "Mexican",
  Germany: "German",
  "Czech Republic": "Czech",
  Taiwan: "Taiwanese",
  Vietnam: "Vietnamese",
};

const originAdjective = (origin) => ORIGIN_ADJECTIVE[origin] || origin;

const reasonLabel = (kind) =>
  (REASON_KINDS.find(([id]) => id === kind) ?? [null, "Other"])[1];

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- the card ---------- */

const STYLE = `
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .card {
    position: fixed; top: 72px; right: 24px; width: 380px; max-height: calc(100vh - 96px);
    overflow-y: auto; z-index: 2147483647;
    background: #242728; color: #FFFFFF;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 14px; line-height: 1.5;
  }
  .head {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: #000000; padding: 10px 16px;
  }
  .brand { font-size: 13px; letter-spacing: -0.01em; }
  .brand b { font-weight: 700; }
  .brand span { font-weight: 300; }
  .close {
    background: none; border: 0; color: #818182; font-size: 16px; line-height: 1;
    cursor: pointer; padding: 2px 4px; font-family: inherit;
  }
  .close:hover { color: #FFFFFF; }
  .body { padding: 16px; }
  .badge {
    display: inline-block; background: #59C376; color: #1E1E1E;
    font-size: 11px; line-height: 1; padding: 4px 8px; border-radius: 2px;
  }
  .badge.warn { background: #F5C042; }
  .rule { margin-top: 12px; font-size: 13px; color: #B8BBBE; }
  .rule .meta { color: #818182; }
  ul.alts { margin-top: 10px; padding-left: 0; list-style: none; }
  ul.alts li { font-size: 13px; color: #FFFFFF; margin-top: 6px; }
  ul.alts .pn { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #B8BBBE; }
  ul.alts .meta { color: #818182; }
  select.reason {
    width: 100%; background: #242728; color: #FFFFFF; font: inherit; font-size: 13px;
    border: 1px solid #6A7275; border-radius: 2px; padding: 7px 8px; margin-bottom: 10px;
  }
  select.reason:focus { outline: none; border-color: #B8BBBE; }
  .name { margin-top: 12px; font-size: 17px; font-weight: 300; }
  .quiet { margin-top: 12px; font-size: 13px; color: #B8BBBE; }
  ul.cands { margin-top: 8px; padding-left: 0; list-style: none; }
  ul.cands li { font-size: 13px; color: #FFFFFF; margin-top: 6px; }
  ul.cands .meta { color: #818182; }
  .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
  .tile { background: #303436; padding: 12px; display: flex; flex-direction: column;
          justify-content: space-between; min-height: 92px; }
  .tile.wide { grid-column: 1 / -1; }
  .tile .l { font-size: 12px; font-weight: 600; line-height: 1.3; }
  .tile .v { font-size: 26px; font-weight: 300; line-height: 1; text-align: right; margin-top: 10px; }
  .tile .s { font-size: 11px; color: #818182; text-align: right; margin-top: 6px; }
  p.read { margin-top: 14px; font-size: 13px; color: #B8BBBE; }
  p.read + p.read { margin-top: 8px; }
  .po {
    display: inline-block; border: 1px solid #6A7275; border-radius: 2px;
    padding: 0 5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px; color: #B8BBBE; background: none; cursor: default;
  }
  .actions { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
  .primary {
    border-radius: 999px;
    background: #EC5E31; color: #1E1E1E; border: 0; height: 32px; padding: 0 20px;
    font: inherit; font-size: 13px; cursor: pointer;
  }
  .primary:hover { opacity: 0.9; }
  .outline {
    background: #303436; color: #FFFFFF; border: 1px solid #6A7275; border-radius: 999px;
    height: 32px; padding: 0 16px; font: inherit; font-size: 13px; cursor: pointer;
  }
  .outline:hover { border-color: #B8BBBE; }
  .done { margin-top: 14px; font-size: 13px; color: #59C376; }
  .exception { margin-top: 14px; }
  .exception label { display: block; font-size: 12px; color: #B8BBBE; margin-bottom: 6px; }
  textarea, input.ask {
    width: 100%; background: transparent; color: #FFFFFF; font: inherit; font-size: 13px;
    border: 1px solid #6A7275; border-radius: 2px; padding: 8px;
  }
  textarea { min-height: 68px; resize: vertical; }
  textarea:focus, input.ask:focus { outline: none; border-color: #B8BBBE; }
  .ask-row { display: flex; gap: 8px; margin-top: 14px; }
  .ask-row input { flex: 1; }
  .reply { margin-top: 12px; background: #303436; padding: 12px; font-size: 13px; color: #B8BBBE; }
  .reply p + p { margin-top: 8px; }
  .foot { margin-top: 14px; font-size: 11px; color: #818182; }
  hr.rule-line { height: 1px; background: #2F3234; margin: 16px 0; border: 0; }
  .hidden { display: none; }
`;

function mount() {
  if (PI.host) return;
  PI.host = document.createElement("div");
  PI.host.id = "platforming-index-card";
  PI.root = PI.host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(PI.host);
}

function unmount() {
  PI.host?.remove();
  PI.host = null;
  PI.root = null;
}

/** The 0.35 to 0.6 band: name the candidates, suggest nothing. */
function possibleHtml(result) {
  return `
    <style>${STYLE}</style>
    <div class="card" role="complementary" aria-label="Platforming Index possible match">
      <div class="head">
        <span class="brand"><b>Platforming</b> <span>Index</span></span>
        <button class="close" type="button" aria-label="Close">&#215;</button>
      </div>
      <div class="body">
        <p class="quiet">Possible match</p>
        <ul class="cands">
          ${result.candidates
            .map(
              (c) =>
                `<li>${esc(c.name)} <span class="meta">${c.partNumberCount} part numbers, best price ${px(c.minPrice)}</span></li>`
            )
            .join("")}
        </ul>
        <p class="foot">Keep typing to narrow it down.</p>
      </div>
    </div>
  `;
}

function cardHtml(result, form) {
  const match = result.match;
  const blocked = result.blockedBy && result.blockedBy[0];
  const n = match.partNumberCount;
  const row = match.bestRow;

  const compliant = result.complianceSource;

  const body = blocked
    ? `
        <span class="badge warn">Blocked by a rule for this product</span>
        <p class="name">${esc(match.name)}</p>
        <p class="rule">&ldquo;${esc(blocked.text)}&rdquo;
          <span class="meta">${esc(reasonLabel(blocked.kind))}, set ${esc(blocked.at.slice(0, 10))}</span>
        </p>
        ${
          compliant
            ? `<p class="read">Same part, ${esc(originAdjective(compliant.origin))}-origin source: ${esc(compliant.supplier)}, ${px(compliant.price)}
                 <span class="pn">${esc(compliant.partNumber)}</span>
                 <span class="meta">No new part number needed, only a different source.</span></p>`
            : ""
        }
        ${
          result.alternatives && result.alternatives.length
            ? `<p class="read">Parts that no rule blocks:</p>
               <ul class="alts">${result.alternatives
                 .map(
                   (a) =>
                     `<li>${esc(a.name)} <span class="pn">${esc(a.partNumber)}</span>
                        <span class="meta">at ${px(a.price)} from ${esc(a.supplier)} (${esc(a.origin)}), already in ${a.products} products</span></li>`
                 )
                 .join("")}</ul>`
            : `<p class="read">No approved alternative yet. Request a new part and note the rule.</p>`
        }
      `
    : `
        <span class="badge">Voltara already buys this part</span>
        <p class="name">${esc(match.name)}</p>

        <div class="tiles">
          <div class="tile">
            <span class="l">Existing part numbers</span>
            <span class="v">${n}</span>
            <span class="s">voltara_boms.csv</span>
          </div>
          <div class="tile">
            <span class="l">Best price paid</span>
            <span class="v">${px(match.minPrice)}</span>
            <span class="s">${esc(row.supplier)}, ${esc(row.origin)}</span>
          </div>
          <div class="tile wide">
            <span class="l">Yearly saving versus the highest price paid</span>
            <span class="v">${usd(match.yearlySavingVsHighest)}</span>
            <span class="s">${form.unitsPerYear.toLocaleString("en-US")} units a year at ${px(match.minPrice)} instead of ${px(match.maxPrice)}</span>
          </div>
        </div>

        <p class="read">Reuse <b>${esc(row.pn)}</b> from ${esc(row.products.join(", "))}. <span class="po">${esc(row.po)}</span></p>
        <p class="read">A new number makes ${n + 1} part numbers for one part and lowers the Complexity control score. Engineering confirms fit before any swap.</p>
      `;

  return `
    <style>${STYLE}</style>
    <div class="card" role="complementary" aria-label="Platforming Index part check">
      <div class="head">
        <span class="brand"><b>Platforming</b> <span>Index</span></span>
        <button class="close" type="button" aria-label="Close">&#215;</button>
      </div>
      <div class="body">
        ${body}

        <div class="actions">
          ${blocked ? "" : '<button class="primary" type="button" data-act="reuse">Reuse existing part</button>'}
          <button class="outline" type="button" data-act="exception">Request an exception</button>
        </div>
        <p class="done hidden" data-el="done"></p>

        <div class="exception hidden" data-el="exception">
          <label for="pi-kind">Reason</label>
          <select class="reason" id="pi-kind" data-el="kind">
            <option value="">Choose a reason</option>
            ${REASON_KINDS.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}
          </select>
          <label for="pi-reason">Why does this product need its own part?</label>
          <textarea id="pi-reason" data-el="reason" placeholder="The cabinet needs US-origin cooling parts for a federal contract."></textarea>
          <div class="actions">
            <button class="outline" type="button" data-act="send-exception">Send for approval</button>
          </div>
        </div>

        <hr class="rule-line" />
        <div class="ask-row">
          <input class="ask" type="text" data-el="ask" placeholder="Ask why" aria-label="Ask why" />
          <button class="outline" type="button" data-act="ask">Ask</button>
        </div>
        <div class="reply hidden" data-el="reply"></div>

        <p class="foot">Sample company and sample data. A match is a suggestion until engineering approves it.</p>
      </div>
    </div>
  `;
}

/** Assistant replies carry [POxxxxxx] and [survey] style tags. */
function formatReply(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        "<p>" +
        esc(line)
          .replace(/\[(PO\d{6})\]/g, '<span class="po">$1</span>')
          .replace(/\[product_master\]/g, '<span class="po">Product master</span>')
          .replace(/\[kearney_survey\]/g, '<span class="po">Kearney survey, 2026</span>')
          .replace(/\[survey\]/g, '<span class="po">Survey</span>') +
        "</p>"
    )
    .join("");
}

/** The signed-in profile, or an engineering default so the demo still works. */
function savedProfile() {
  try {
    const raw = localStorage.getItem("platforming_profile");
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.role) return p;
    }
  } catch {
    /* localStorage can be blocked; fall through to the default */
  }
  return {
    role: "Engineering / R&D",
    decisionLevel: "I decide",
    products: [],
    metrics: ["Cost"],
    customersNeedEveryVariant: 2,
    architectureOwner: "Nobody",
    measuredOnComplexity: "No",
    checksForExistingPart: 2,
    biggestBlocker: "Ownership",
    currentDecision: "",
  };
}

function renderPossible(result, form) {
  mount();
  PI.root.innerHTML = possibleHtml(result);
  PI.root.querySelector(".close").addEventListener("click", () => {
    PI.dismissed = form.description;
    unmount();
  });
}

function render(result, form) {
  const match = result.match;
  mount();
  PI.root.innerHTML = cardHtml(result, form);

  const el = (name) => PI.root.querySelector(`[data-el="${name}"]`);
  const act = (name) => PI.root.querySelector(`[data-act="${name}"]`);

  PI.root.querySelector(".close").addEventListener("click", () => {
    PI.dismissed = form.description;
    unmount();
  });

  act("reuse")?.addEventListener("click", async () => {
    const written = writePartNumber(match.bestRow.pn);
    await send("recordDecision", {
      description: form.description,
      product: form.product,
      decision: "reuse",
      matchedPart: match.name,
      suggestedPn: match.bestRow.pn,
      source: "extension",
    });
    const done = el("done");
    done.textContent = written
      ? `Reusing ${match.bestRow.pn}. Part number filled in and the decision recorded.`
      : `Decision recorded. Could not find the part number field on this page.`;
    done.classList.remove("hidden");
    el("exception").classList.add("hidden");
  });

  act("exception").addEventListener("click", () => {
    el("exception").classList.remove("hidden");
    el("reason").focus();
  });

  act("send-exception").addEventListener("click", async () => {
    const kind = el("kind").value;
    const done = el("done");
    if (!kind) {
      done.textContent = "Choose a reason first. It becomes the rule other engineers read.";
      done.classList.remove("hidden");
      return;
    }
    const res = await send("recordDecision", {
      description: form.description,
      product: form.product,
      decision: "exception",
      matchedPart: match.name,
      suggestedPn: match.bestRow.pn,
      reasonKind: kind,
      reasonText: el("reason").value.trim(),
      source: "extension",
    });
    el("exception").classList.add("hidden");
    done.textContent = res.ok && res.data.rule
      ? `Exception recorded. A rule now covers ${match.name} for ${form.product}. The index score does not drop.`
      : "Exception recorded.";
    done.classList.remove("hidden");
  });

  const ask = async () => {
    const input = el("ask");
    const question = input.value.trim();
    if (!question) return;
    const reply = el("reply");
    reply.classList.remove("hidden");
    reply.innerHTML = "<p>Thinking…</p>";
    input.value = "";
    const res = await send("ask", {
      profile: savedProfile(),
      messages: [
        {
          role: "user",
          content: `${question} (About ${match.name}, requested for ${form.product} at ${form.unitsPerYear} units a year.)`,
        },
      ],
    });
    reply.innerHTML = res.ok
      ? formatReply(res.data.text)
      : "<p>The assistant could not be reached.</p>";
  };
  act("ask").addEventListener("click", ask);
  el("ask").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ask();
    }
  });
}

/* ---------- the check ---------- */

async function check() {
  const form = readForm();
  const key = `${form.description}|${form.product}|${form.unitsPerYear}`;

  if (!form.description) {
    PI.lastQuery = key;
    unmount();
    return;
  }
  if (key === PI.lastQuery) return;
  PI.lastQuery = key;

  // A new description re-opens a card the user closed on the old one.
  if (form.description !== PI.dismissed) PI.dismissed = "";

  const res = await send("checkPart", form);
  if (!res.ok) return;

  const result = res.data;
  PI.match = result.match;

  if (form.description === PI.dismissed) {
    unmount();
    return;
  }
  if (result.level === "possible" && result.candidates && result.candidates.length) {
    renderPossible(result, form);
    return;
  }
  if (!result.match || result.match.confidence < MIN_CONFIDENCE) {
    unmount();
    return;
  }
  render(result, form);
}


/* ---------- reading the page for the side panel ---------- */

const PAGE_TEXT_CAP = 8000;
const CONTEXT_DEBOUNCE_MS = 400;

/** Containers whose text is navigation, not content. */
const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "SVG", "NAV", "HEADER", "FOOTER", "ASIDE",
  "BUTTON", "SELECT", "OPTION", "LABEL", "FORM", "INPUT", "TEXTAREA",
]);

function isHidden(el) {
  if (el.hidden || el.getAttribute("aria-hidden") === "true") return true;
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return true;
  const box = el.getBoundingClientRect();
  return box.width === 0 && box.height === 0;
}

/** Text a reader can see, with page chrome left out. */
function visibleText(root) {
  const out = [];
  const walk = (node) => {
    if (out.join("\n").length > PAGE_TEXT_CAP) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent.replace(/\s+/g, " ").trim();
      if (t.length > 1) out.push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node;
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.closest?.("[role=navigation],[role=toolbar],[role=banner]")) return;
    if (isHidden(el)) return;
    const block = /^(P|LI|DIV|SECTION|ARTICLE|TR|H1|H2|H3|H4|TD|PRE)$/.test(el.tagName);
    const before = out.length;
    for (const child of el.childNodes) walk(child);
    if (block && out.length > before) out.push("\n");
  };
  walk(root);
  return out
    .join(" ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, PAGE_TEXT_CAP);
}

/**
 * The main content, in order of preference: the selection, then the last
 * answer on a chat style research page, then the main region. Velocity AI
 * Studio is a chat, so the last answer is usually the whole question.
 */
function mainText() {
  const answers = document.querySelectorAll(
    '[data-message-author-role="assistant"], [data-role="assistant"], .assistant-message, [data-testid*="answer"], [data-testid*="response"], article'
  );
  if (answers.length) {
    const last = answers[answers.length - 1];
    const text = visibleText(last);
    if (text.length > 120) return text;
  }

  const main =
    document.querySelector("main") ||
    document.querySelector("[role=main]") ||
    document.body;
  return visibleText(main);
}

/* What the person wrote beats what the page answered. On a chat page the
   assistant's reply is long prose; the question is in the box they typed in.
   Remember the draft as it is typed and the last message they sent. */
let draftText = "";
let sentText = "";
try {
  sentText = sessionStorage.getItem("pi:lastPrompt") || "";
} catch (e) {}

function fieldText(el) {
  if (!el) return "";
  if (typeof el.value === "string") return el.value;
  if (el.isContentEditable) return el.innerText || "";
  return "";
}

function commitDraft() {
  const text = draftText.trim();
  if (text.length < 15) return;
  sentText = text;
  try {
    sessionStorage.setItem("pi:lastPrompt", text);
  } catch (e) {}
}

document.addEventListener(
  "input",
  (e) => {
    const el = e.target;
    if (el && el.type === "password") return;
    const value = fieldText(el);
    if (!value.trim() && draftText.trim().length >= 15) commitDraft();
    draftText = value;
    // The panel follows the draft as it is written.
    if (typeof sendContext === "function") sendContext(false);
  },
  true
);
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      draftText = fieldText(e.target) || draftText;
      commitDraft();
      draftText = "";
      setTimeout(() => sendContext(true), 400);
    }
  },
  true
);
document.addEventListener(
  "click",
  (e) => {
    if (e.target && e.target.closest && e.target.closest("button") && draftText.trim().length >= 15) {
      commitDraft();
      draftText = "";
      setTimeout(() => sendContext(true), 400);
    }
  },
  true
);

function writtenText() {
  if (draftText.trim().length >= 15) return draftText.trim();
  // Only trust the remembered message while it is still on this page.
  if (sentText && document.body && document.body.innerText.includes(sentText.slice(0, 40))) {
    return sentText;
  }
  return "";
}

function collectContext() {
  return {
    url: location.href,
    title: (document.querySelector("h1")?.textContent || document.title || "").trim(),
    text: (writtenText() || mainText()).slice(0, PAGE_TEXT_CAP),
    selection: String(window.getSelection?.() ?? "").trim().slice(0, PAGE_TEXT_CAP),
  };
}

let contextTimer = null;
let lastSent = "";

function sendContext(force) {
  clearTimeout(contextTimer);
  contextTimer = setTimeout(() => {
    const context = collectContext();
    const key = context.url + "::" + context.selection + "::" + context.text.length;
    if (!force && key === lastSent) return;
    lastSent = key;
    send("pageContext", context);
  }, CONTEXT_DEBOUNCE_MS);
}

function watchPage() {
  sendContext(true);

  // A new selection is a new question.
  document.addEventListener("selectionchange", () => sendContext(false));

  // These apps route without reloading, so watch the address itself.
  let href = location.href;
  const onNavigate = () => {
    if (location.href === href) return;
    href = location.href;
    lastSent = "";
    sendContext(true);
  };
  window.addEventListener("popstate", onNavigate);
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      setTimeout(onNavigate, 0);
      return result;
    };
  }
  // A chat answer arrives without a route change.
  new MutationObserver(() => sendContext(false)).observe(document.body, {
    childList: true,
    subtree: true,
  });

  chrome.runtime.onMessage?.addListener((message) => {
    if (message?.type === "sendContext") sendContext(true);
  });
}

function schedule() {
  clearTimeout(PI.timer);
  PI.timer = setTimeout(check, DEBOUNCE_MS);
}

function start() {
  // The panel wants this page whether or not it is a part request form.
  try {
    watchPage();
  } catch {
    /* a page we cannot read is not a reason to break the card */
  }

  PI.adapter = piFindAdapter(location.href);
  if (!PI.adapter) return;

  const description = field(PI.adapter.description);
  if (!description) return;

  description.addEventListener("input", schedule);
  // Product and units change the saving, so re-check without waiting.
  for (const sel of [PI.adapter.product, PI.adapter.unitsPerYear]) {
    field(sel)?.addEventListener("change", () => {
      PI.lastQuery = "";
      schedule();
    });
  }

  // The field may already hold a value on load.
  if (description.value.trim()) schedule();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
