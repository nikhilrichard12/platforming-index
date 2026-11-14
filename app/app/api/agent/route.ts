import { NextRequest, NextResponse } from "next/server";
import { UserProfile } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentRequest {
  messages: Message[];
  profile: UserProfile;
}

interface Citation {
  type: "row" | "assumption";
  ref: string;
}

interface AgentResponse {
  reply: string;
  citations: Citation[];
}

// Stub responses keyed by role emphasis keyword in the last user message.
function stubReply(profile: UserProfile, lastMessage: string): AgentResponse {
  const lower = lastMessage.toLowerCase();

  if (lower.includes("cost") || lower.includes("spend") || lower.includes("savings")) {
    return {
      reply:
        "Voltara's annual spend is ~$39.3M across 1,109 purchase orders (sample data). " +
        "Part-number proliferation means low-volume products pay up to 30% more for the same part. " +
        "Paying the lowest existing price on every shared part could save approximately $1.13M/year. " +
        "This estimate has not yet been validated by the engine — it is listed as Assumption A3.",
      citations: [
        { type: "row", ref: "voltara_spend_cube.csv · 1,109 rows" },
        { type: "assumption", ref: "A3: ~$1.13M savings estimate (pending engine)" },
      ],
    };
  }

  if (lower.includes("part") || lower.includes("bom") || lower.includes("complexity")) {
    return {
      reply:
        "Voltara's BOM contains 262 lines across 6 products, with 252 distinct part numbers (sample data). " +
        "CLAUDE.md states approximately 60 real parts after de-duplication, with 45 appearing in two or more products. " +
        "These counts are stated facts pending engine validation — see Assumption A4.",
      citations: [
        { type: "row", ref: "voltara_boms.csv · 262 rows" },
        { type: "assumption", ref: "A4: 60 real parts, 45 shared (pending engine)" },
      ],
    };
  }

  if (lower.includes("time") || lower.includes("lead") || lower.includes("launch")) {
    return {
      reply:
        "Lead times across Voltara's portfolio range from 3 weeks (Rack UPS, Solar Inverter) to 14 weeks (Battery Cabinet) based on voltara_product_master.csv. " +
        "No launch-to-ship data exists in the sample files, so a time-to-market figure cannot be stated precisely — see Assumption A2.",
      citations: [
        { type: "row", ref: "voltara_product_master.csv · lead_time_weeks column" },
        { type: "assumption", ref: "A2: No launch-to-ship data available" },
      ],
    };
  }

  const greeting = profile.role
    ? `As ${profile.role}, here's what I can tell you from Voltara's data (sample / fictional): `
    : "Here's what I can tell you from Voltara's data (sample / fictional): ";

  return {
    reply:
      greeting +
      "Voltara has 6 products, 262 BOM lines, 252 distinct part numbers, and $39.3M in annual spend across 1,109 purchase orders. " +
      "The engine has not yet run, so the platforming index score and real part counts are pending. " +
      "Ask me about cost, parts, lead times, or platforming blockers.",
    citations: [
      { type: "row", ref: "voltara_boms.csv · 262 rows" },
      { type: "row", ref: "voltara_spend_cube.csv · 1,109 rows" },
    ],
  };
}

export async function POST(req: NextRequest) {
  const body: AgentRequest = await req.json();
  const lastMsg = body.messages[body.messages.length - 1]?.content ?? "";
  const result = stubReply(body.profile, lastMsg);

  // Simulate a brief response delay so swap-in of real API feels natural
  await new Promise((r) => setTimeout(r, 600));

  return NextResponse.json(result satisfies AgentResponse);
}
