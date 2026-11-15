import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { UserProfile } from "@/lib/types";
import { buildSystemPrompt } from "@/lib/agent/buildSystemPrompt";
import { VoltaraData, usd } from "@/lib/voltaraData";
import { loadSurvey, loadVoltaraData } from "@/lib/voltaraData.server";
import { computeIndex } from "@/lib/index";
import { applyAlignment } from "@/lib/alignment";
import { listAlignment, listDecisions, listRules } from "@/lib/rules.server";
import { roleViewFor } from "@/lib/roleViews";

export const runtime = "nodejs";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentRequest {
  messages: Message[];
  profile: UserProfile;
  /** What the side panel is looking at, when the question comes from there. */
  context?: {
    url?: string;
    title?: string;
    product?: string;
    needs?: string[];
  };
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_TOKENS = 400;
const HISTORY = 8;

/**
 * The five sentence briefs the Alignment cards ask for, written from the same
 * figures the cards show. Offline, these are what the thread prints.
 */
function briefFor(t: string, data: VoltaraData): string | null {
  if (!/draft a five sentence brief/.test(t)) return null;
  const s = data.summary;
  const duplicates = s.partNumbers - s.realParts;

  if (/own/.test(t)) {
    return [
      `Voltara carries ${s.partNumbers} part numbers for ${s.realParts} real parts, and no function owns the decision that creates one.`,
      `The ${duplicates} duplicates were approved by nobody, because approving them was nobody's job.`,
      `Engineering writes the specification, Supply chain buys against it, and Sales promises the variant, so each function can point at another.`,
      `One owner for cross product part decisions costs nothing to appoint and changes who has to say no.`,
      `The index reads Decision ownership at ${data.index.dimensions[1].score} today, and that number is the share of leaders naming the same owner.`,
    ].join("\n\n");
  }

  if (/target/.test(t)) {
    return [
      `No function at Voltara carries a target on complexity, so every incentive points at launching the next product.`,
      `The price gap on shared parts is ${usd(s.yearlyPriceGapUsd)} a year, inside ${usd(s.yearlySpendUsd)} of parts spend.`,
      `A target does not need to be clever: no new part number without a reuse check is measurable from the parts list on day one.`,
      `Engineering should carry it, because Engineering creates part numbers, and Finance should report it beside cost.`,
      `The index reads Incentives at ${data.index.dimensions[2].score} today, which is the share of leaders whose targets reward reuse.`,
    ].join("\n\n");
  }

  return [
    `${s.uniqueParts} of ${s.realParts} parts at Voltara exist on one product only, and each one was somebody's answer to a customer.`,
    `Sales says customers need every variant, Engineering and Supply chain say they do not, and nobody has tested it.`,
    `The test is cheap: name the differences a customer specifies in writing, and treat the rest as ours to choose.`,
    `Every variant that fails that test is a part number, a supplier, a stock line and a lead time nobody is paid for.`,
    `Agreeing this does not remove a product. It removes the differences inside products that customers never asked to pay for.`,
  ].join("\n\n");
}

/**
 * Offline answers. Every figure comes from voltara_parts.json and carries the
 * same [POxxxxxx] tags the live assistant uses.
 */
function fallbackReply(
  profile: UserProfile,
  data: VoltaraData,
  lastMessage: string
): string {
  const t = lastMessage.toLowerCase();
  const view = roleViewFor(profile.role);
  const kpis = view.kpis(data);

  // A dashboard tile sends its own question; answer with that tile's answer.
  const exact = kpis.find((k) => k.question.toLowerCase() === t.trim());
  if (exact) return exact.answer(data);

  // The three briefs Alignment asks for, so the cards work with no key set.
  const brief = briefFor(t, data);
  if (brief) return brief;

  const cfo = roleViewFor("CFO / Finance").kpis(data);
  const eng = roleViewFor("Engineering / R&D").kpis(data);
  const supply = roleViewFor("Supply Chain / Procurement").kpis(data);
  const sales = roleViewFor("Sales / Commercial").kpis(data);

  const pick =
    /capacitor/.test(t) ? cfo[2]
    : /fan|premium|cabinet pay/.test(t) ? supply[1]
    : /price|gap|sav|cost|spend|money|pay|negotiat/.test(t) ? cfo[0]
    : /duplicate|part number|same part/.test(t) ? cfo[1]
    : /core|platform|module/.test(t) ? eng[2]
    : /lead|time|week/.test(t) ? sales[2]
    : /supplier|vendor/.test(t) ? supply[2]
    : /review|dwg|confiden/.test(t) ? eng[3]
    : /hour|sustain/.test(t) ? eng[0]
    : /variant|customer|option|remove|unique|go away/.test(t) ? sales[0]
    : /score|index|provisional/.test(t) ? null
    : null;

  if (pick) return pick.answer(data);

  if (/score|index|provisional/.test(t)) {
    const idx = data.index;
    return [
      `The Platforming Index is ${idx.score} of 100, computed from the parts list and the survey. Four dimensions, equal weights: ${idx.dimensions.map((d) => `${d.name} ${d.score}`).join(", ")}.`,
      `${idx.dimensions[0].basis}. ${idx.dimensions[3].name} is a midpoint because there is no data yet on new part numbers per year.`,
      `The score reads as sharing parts, not yet a platform. Voltara is on step ${idx.step} of three.`,
    ].join("\n\n");
  }

  const top = data.byGap[0];
  return [
    `Offline mode answers from a fixed set. Here is the headline for ${profile.role || "your role"}: ${data.summary.partNumbers} part numbers describe ${data.summary.realParts} real parts, and the yearly price gap on shared parts is ${usd(data.summary.yearlyPriceGapUsd)}.`,
    `The largest single gap is ${top.name} at ${usd(top.gap)}. ${`[${top.rows[0].po}]`}`,
    `Try a number on the dashboard, or ask about price gaps, duplicates, the common core, suppliers, or lead time.`,
  ].join("\n\n");
}

function offlineResponse(body: AgentRequest, data: VoltaraData, reason: string) {
  const last = body.messages[body.messages.length - 1]?.content ?? "";
  const text = fallbackReply(body.profile, data, last);
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Agent-Mode": "offline",
        "X-Agent-Reason": reason,
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const body: AgentRequest = await req.json();
  const file = loadVoltaraData();
  // The assistant quotes the same computed score the dashboard shows.
  const data = {
    ...file,
    index: computeIndex(
      file,
      applyAlignment(loadSurvey(), listAlignment()),
      listDecisions()
    ),
  };
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) return offlineResponse(body, data, "no_api_key");

  const client = new Anthropic({ apiKey });
  const system = buildSystemPrompt(
    body.profile,
    data,
    loadSurvey(),
    listRules(),
    body.context
  );
  const messages = body.messages.slice(-HISTORY).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Pull the first event before responding, so an auth or model error becomes
  // the offline path rather than a dead panel.
  const events = client.messages
    .stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      // The whole answer fits in 400 tokens; thinking would eat that budget.
      thinking: { type: "disabled" },
      output_config: { effort: "medium" },
      messages,
    })
    [Symbol.asyncIterator]();

  let first: IteratorResult<Anthropic.MessageStreamEvent>;
  try {
    first = await events.next();
  } catch {
    return offlineResponse(body, data, "api_error");
  }

  const encoder = new TextEncoder();
  const textOf = (event: Anthropic.MessageStreamEvent) =>
    event.type === "content_block_delta" && event.delta.type === "text_delta"
      ? event.delta.text
      : "";

  const out = new ReadableStream({
    async start(controller) {
      try {
        for (let step = first; !step.done; step = await events.next()) {
          const text = textOf(step.value);
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch {
        controller.enqueue(encoder.encode("\n\nThe answer was cut short. Try again."));
      }
      controller.close();
    },
  });

  return new Response(out, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Agent-Mode": "live",
      "X-Agent-Model": MODEL,
      "Cache-Control": "no-store",
    },
  });
}
