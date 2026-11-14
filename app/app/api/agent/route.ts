import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { UserProfile } from "@/lib/types";
import { buildSystemPrompt } from "@/lib/agent/buildSystemPrompt";
import { VoltaraData, usd } from "@/lib/voltaraData";
import { loadSurvey, loadVoltaraData } from "@/lib/voltaraData.server";
import { roleViewFor } from "@/lib/roleViews";

export const runtime = "nodejs";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentRequest {
  messages: Message[];
  profile: UserProfile;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_TOKENS = 400;
const HISTORY = 8;

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
      `The Platforming Index is ${idx.score} of 100 and provisional. Four dimensions, equal weights: ${idx.dimensions.map((d) => `${d.name} ${d.score}`).join(", ")}.`,
      `${idx.dimensions[0].basis}. ${idx.dimensions[3].name} is a midpoint because there is no data yet on new part numbers per year.`,
      `The score reads as sharing parts, not yet a platform. Voltara is on step ${idx.step} of three.`,
    ].join("\n\n");
  }

  const top = data.byGap[0];
  return [
    `Offline mode answers from a fixed set. Here is the headline for ${view.name}: ${data.summary.partNumbers} part numbers describe ${data.summary.realParts} real parts, and the yearly price gap on shared parts is ${usd(data.summary.yearlyPriceGapUsd)}.`,
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
  const data = loadVoltaraData();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) return offlineResponse(body, data, "no_api_key");

  const client = new Anthropic({ apiKey });
  const system = buildSystemPrompt(body.profile, data, loadSurvey());
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
