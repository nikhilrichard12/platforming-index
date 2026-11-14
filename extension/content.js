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

const usd = (n) =>
  n >= 1e6
    ? "$" + (n / 1e6).toFixed(2) + "M"
    : n >= 1e4
    ? "$" + Math.round(n / 1e3) + "K"
    : "$" + Math.round(n).toLocaleString("en-US");

const px = (n) => "$" + (n < 1 ? n.toFixed(3) : n.toFixed(2));

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
    -webkit-clip-path: polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%);
    clip-path: polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%);
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

function cardHtml(result, form) {
  const match = result.match;
  const blocked = result.blockedBy && result.blockedBy[0];
  const n = match.partNumberCount;
  const row = match.bestRow;

  const body = blocked
    ? `
        <span class="badge warn">Blocked by a rule for this product</span>
        <p class="name">${esc(match.name)}</p>
        <p class="rule">&ldquo;${esc(blocked.text)}&rdquo;
          <span class="meta">${esc(reasonLabel(blocked.kind))}, set ${esc(blocked.at.slice(0, 10))}</span>
        </p>
        ${
          result.alternatives && result.alternatives.length
            ? `<p class="read">Parts in the same category that no rule blocks:</p>
               <ul class="alts">${result.alternatives
                 .map(
                   (a) =>
                     `<li>${esc(a.name)} <span class="pn">${esc(a.partNumber)}</span>
                        <span class="meta">at ${px(a.price)} from ${esc(a.supplier)}, already in ${a.products} products</span></li>`
                 )
                 .join("")}</ul>`
            : `<p class="read">No unblocked alternative in the same category. A new part number is reasonable here.</p>`
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
            <span class="s">${esc(row.supplier)}</span>
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
  if (
    !result.match ||
    result.match.confidence < MIN_CONFIDENCE ||
    form.description === PI.dismissed
  ) {
    unmount();
    return;
  }
  render(result, form);
}

function schedule() {
  clearTimeout(PI.timer);
  PI.timer = setTimeout(check, DEBOUNCE_MS);
}

function start() {
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
