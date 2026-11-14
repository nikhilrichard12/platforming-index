import fs from "fs";
import path from "path";
import { ActivitySource } from "./rules";

export interface DataSource {
  id: string;
  name: string;
  type: string;
  status: "connected" | "not_connected";
  feeds: string | null;
  rows: number | null;
  lastSyncedAt: string | null;
  wouldNeed?: string[];
  note?: string;
}

interface SourcesFile {
  note: string;
  sources: DataSource[];
}

const DERIVED = path.join(process.cwd(), "..", "data", "derived");
const VOLTARA = path.join(process.cwd(), "..", "data", "voltara");
const FILE = path.join(DERIVED, "sources.json");

export function loadSources(): SourcesFile {
  return JSON.parse(fs.readFileSync(FILE, "utf8")) as SourcesFile;
}

/** Data rows in a CSV, not counting the header. */
function countRows(file: string): number | null {
  try {
    const text = fs.readFileSync(path.join(VOLTARA, file), "utf8");
    return text.split("\n").filter((line) => line.trim().length > 0).length - 1;
  } catch {
    return null;
  }
}

/**
 * Re-reads the CSVs in data/voltara and updates row counts and timestamps.
 * There is no connector here and none is implied: a sync reads the files on
 * this machine. A source with no connector is left alone.
 */
export function syncSources(ids?: string[]): DataSource[] {
  const file = loadSources();
  const at = new Date().toISOString();

  file.sources = file.sources.map((s) => {
    if (s.status !== "connected" || !s.feeds) return s;
    if (ids && !ids.includes(s.id)) return s;
    const rows = countRows(s.feeds);
    return { ...s, rows: rows ?? s.rows, lastSyncedAt: at };
  });

  fs.writeFileSync(FILE, JSON.stringify(file, null, 2) + "\n", "utf8");
  return file.sources;
}

/** Which caller a request came from, for the activity log. */
export function callerOf(req: Request): { source: ActivitySource; agentName?: string } {
  const header = req.headers.get("x-pi-source");
  if (header === "agent") {
    return { source: "agent", agentName: req.headers.get("x-pi-agent") || "Agent" };
  }
  const origin = req.headers.get("origin") ?? "";
  if (origin.startsWith("chrome-extension://") || header === "extension") {
    return { source: "extension" };
  }
  return { source: "dashboard" };
}
