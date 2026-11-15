import fs from "fs";
import path from "path";
import { derivedDir, voltaraDir } from "./dataPaths";
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

const file = () => path.join(derivedDir(), "sources.json");

/**
 * The source list once the disk has refused a write, the same arrangement the
 * decisions store uses. A deployed build syncs in memory; a laptop writes the
 * file as before.
 */
let memory: SourcesFile | null = null;

export function loadSources(): SourcesFile {
  if (memory) return memory;
  return JSON.parse(fs.readFileSync(file(), "utf8")) as SourcesFile;
}

/** Data rows in a CSV, not counting the header. */
function countRows(name: string): number | null {
  try {
    const text = fs.readFileSync(path.join(voltaraDir(), name), "utf8");
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
  const current = loadSources();
  const at = new Date().toISOString();

  current.sources = current.sources.map((s) => {
    if (s.status !== "connected" || !s.feeds) return s;
    if (ids && !ids.includes(s.id)) return s;
    const rows = countRows(s.feeds);
    return { ...s, rows: rows ?? s.rows, lastSyncedAt: at };
  });

  if (memory) {
    memory = current;
  } else {
    try {
      fs.writeFileSync(file(), JSON.stringify(current, null, 2) + "\n", "utf8");
    } catch {
      // Read-only deploy: keep the synced list in this process.
      memory = current;
    }
  }
  return current.sources;
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
