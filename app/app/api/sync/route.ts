import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import { callerOf, syncSources } from "@/lib/sources.server";
import { logActivity } from "@/lib/rules.server";

export const runtime = "nodejs";

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

/**
 * Re-reads the CSVs under data/voltara and updates row counts and timestamps.
 * This reads files on this machine; it does not call a PLM or an ERP.
 */
export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  let ids: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.ids)) ids = body.ids as string[];
  } catch {
    /* sync everything connected */
  }

  const sources = syncSources(ids);
  const synced = sources.filter((s) => !ids || ids.includes(s.id));
  const caller = callerOf(req);

  logActivity({
    ...caller,
    tool: "sync",
    summary:
      synced.length === 1
        ? `Synced ${synced[0].name}, ${synced[0].rows} rows`
        : `Synced ${synced.filter((s) => s.status === "connected").length} sources`,
  });

  return NextResponse.json({ sources }, { headers });
}
