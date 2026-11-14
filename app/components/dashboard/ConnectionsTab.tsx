"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import StepStrip, {
  IconAgent,
  IconCheck,
  IconConcept,
} from "@/components/ui/StepStrip";
import ActivityTable, { useActivity } from "./ActivityTable";
import LiveCheckStage from "./LiveCheckStage";

interface DataSource {
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

const STEPS = [
  {
    title: "Concept",
    body: "Someone describes a product. plan_product checks the whole concept against the parts that already exist.",
    icon: <IconConcept />,
  },
  {
    title: "Design",
    body: "The engineer picks a component. check_part runs inside the agent they already work in.",
    icon: <IconAgent />,
  },
  {
    title: "Part release",
    body: "A part number gets raised. The extension puts the same check on the part request form.",
    icon: <IconCheck />,
  },
];

const stamp = (iso: string | null) =>
  iso ? iso.slice(0, 10) + " " + iso.slice(11, 16) : "Never";

type ConfigId = "desktop" | "code" | "cursor";

export default function ConnectionsTab({ serverPath }: { serverPath: string }) {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [config, setConfig] = useState<ConfigId>("desktop");
  const [copied, setCopied] = useState(false);
  const [score, setScore] = useState<{ score: number; complexity: number } | null>(
    null
  );
  const [moved, setMoved] = useState<{
    from: { score: number; complexity: number };
    to: { score: number; complexity: number };
  } | null>(null);
  const { activity, fresh } = useActivity(20, true);

  /**
   * The live score, read back from the same endpoint an agent would call, so
   * the stage can say what a reuse just moved rather than assert it.
   */
  const loadIndex = useCallback(async () => {
    try {
      const res = await fetch("/api/index");
      const idx = (await res.json()).index as {
        score: number;
        dimensions: { name: string; score: number }[];
      };
      const complexity =
        idx.dimensions.find((d) => d.name === "Complexity control")?.score ?? 0;
      setScore((prev) => {
        if (prev && (prev.score !== idx.score || prev.complexity !== complexity)) {
          setMoved({ from: prev, to: { score: idx.score, complexity } });
        }
        return { score: idx.score, complexity };
      });
    } catch {
      /* the line keeps what it had */
    }
  }, []);

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  const scoreLine = moved
    ? `Complexity control ${moved.from.complexity} to ${moved.to.complexity}. Index ${moved.from.score} to ${moved.to.score}.`
    : score
    ? `Index ${score.score} of 100, Complexity control ${score.complexity}. Each recorded reuse adds 2.`
    : "";

  async function loadSources() {
    try {
      const res = await fetch("/api/sources");
      setSources((await res.json()).sources ?? []);
    } catch {
      /* the table stays as it was */
    }
  }

  useEffect(() => {
    loadSources();
  }, []);

  async function sync(id: string) {
    setSyncing(id);
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      await loadSources();
    } finally {
      setSyncing(null);
    }
  }

  const CONFIGS: Record<ConfigId, { label: string; body: string }> = useMemo(
    () => ({
      desktop: {
        label: "Claude Desktop",
        body: JSON.stringify(
          {
            mcpServers: {
              "platforming-index": {
                command: "node",
                args: [serverPath],
                env: { PLATFORMING_INDEX_URL: "http://localhost:3000" },
              },
            },
          },
          null,
          2
        ),
      },
      code: {
        label: "Claude Code",
        body: `claude mcp add platforming-index \\\n  --env PLATFORMING_INDEX_URL=http://localhost:3000 \\\n  -- node ${serverPath}`,
      },
      cursor: {
        label: "Cursor",
        body: JSON.stringify(
          {
            mcpServers: {
              "platforming-index": {
                command: "node",
                args: [serverPath],
                env: { PLATFORMING_INDEX_URL: "http://localhost:3000" },
              },
            },
          },
          null,
          2
        ),
      },
    }),
    [serverPath]
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(CONFIGS[config].body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked; the block is selectable either way */
    }
  }

  /** Who has actually called, from the log. */
  const agents = useMemo(() => {
    const byName = new Map<string, { calls: number; last: string }>();
    for (const a of activity) {
      if (a.source !== "agent") continue;
      const name = a.agentName ?? "Agent";
      const seen = byName.get(name);
      byName.set(name, {
        calls: (seen?.calls ?? 0) + 1,
        last: seen && seen.last > a.at ? seen.last : a.at,
      });
    }
    return [...byName.entries()].sort((a, b) => b[1].last.localeCompare(a[1].last));
  }, [activity]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[15px] text-text-2">Connections</p>
        <p className="mt-1 text-[13px] text-text-3">
          Where the data comes from, which agents can reach it, and what they
          are doing right now.
        </p>
      </div>

      {/* 1. How it connects */}
      <div className="bg-panel p-5">
        <h2 className="text-[15px] font-semibold text-text">How it connects</h2>
        <div className="mt-5">
          <StepStrip steps={STEPS} />
        </div>
        <p className="mt-6 text-[12px] text-text-3">
          One check, wherever a part number gets born.
        </p>
      </div>

      {/* 2. The calls themselves, drawn as they land */}
      <LiveCheckStage
        activity={activity}
        scoreLine={scoreLine}
        onScoreMoved={loadIndex}
      />

      {/* 3. Sources and agents. One column: the sources table needs the width,
          and the config blocks read better wide than tall. */}
      <div className="space-y-5">
        <div className="bg-panel">
          <div className="flex items-baseline justify-between gap-4 px-4 pb-3 pt-4">
            <h2 className="text-[15px] font-semibold text-text">Data sources</h2>
            <span className="text-[12px] text-text-3">
              {sources.filter((s) => s.status === "connected").length} connected
            </span>
          </div>
          <table className="w-full border-collapse whitespace-nowrap text-[13px]">
            <thead>
              <tr className="border-y border-line bg-panel-2 text-left text-text-2">
                <th className="w-full max-w-0 truncate py-2 pl-4 pr-2 font-normal">
                  Source
                </th>
                <th className="px-2 py-2 font-normal">Status</th>
                <th className="px-2 py-2 text-right font-normal">Rows</th>
                <th className="px-2 py-2 font-normal">Last synced</th>
                <th className="py-2 pl-2 pr-4 font-normal" />
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-b-0">
                  <td className="w-full max-w-0 truncate py-2 pl-4 pr-2" title={s.name}>
                    <span className="text-text">{s.name}</span>{" "}
                    <span className="text-text-3">{s.type}</span>
                  </td>
                  <td className="px-2 py-2">
                    <Badge tone={s.status === "connected" ? "positive" : "neutral"}>
                      {s.status === "connected" ? "Connected" : "Not connected"}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-text-2">
                    {s.rows?.toLocaleString("en-US") ?? "—"}
                  </td>
                  <td className="px-2 py-2 tabular-nums text-text-3">
                    {stamp(s.lastSyncedAt)}
                  </td>
                  <td className="py-2 pl-2 pr-4 text-right">
                    {s.status === "connected" ? (
                      <button
                        type="button"
                        onClick={() => sync(s.id)}
                        disabled={syncing === s.id}
                        className="h-[26px] rounded-full border border-line-2 bg-panel-2 px-3 text-[12px] text-text transition-colors hover:border-text-2 disabled:opacity-50"
                      >
                        {syncing === s.id ? "Syncing" : "Sync now"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowMapping((v) => !v)}
                        className="h-[26px] rounded-full border border-line-2 bg-panel-2 px-3 text-[12px] text-text transition-colors hover:border-text-2"
                      >
                        Connect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {showMapping && (
            <div className="border-t border-line bg-surface p-4">
              <p className="text-[13px] text-text">
                Airtable parts base would need these columns mapped:
              </p>
              <ul className="mt-2 space-y-1">
                {(sources.find((s) => s.id === "airtable")?.wouldNeed ?? []).map((c) => (
                  <li key={c} className="text-[13px] text-text-2">
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-text-3">
                Demo build: connector not active.
              </p>
            </div>
          )}
        </div>

        <div className="bg-panel p-4">
          <h2 className="text-[15px] font-semibold text-text">Agents</h2>
          <p className="mt-1 text-[13px] text-text-2">
            Any agent that speaks MCP can connect.
          </p>

          <div className="mt-4 flex items-end justify-between gap-3 border-b border-line">
            <div className="flex items-end gap-5">
              {(Object.keys(CONFIGS) as ConfigId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setConfig(id)}
                  className={`-mb-px border-b pb-2 text-[13px] transition-colors ${
                    config === id
                      ? "border-text text-text"
                      : "border-transparent text-text-2 hover:text-text"
                  }`}
                >
                  {CONFIGS[id].label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={copy}
              className="mb-2 text-[12px] text-text-3 underline-offset-4 transition-colors hover:text-text hover:underline"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap break-all bg-surface p-3 font-mono text-[11px] leading-relaxed text-text-2">
            {CONFIGS[config].body}
          </pre>

          <h3 className="mt-5 text-[13px] font-semibold text-text">Connected agents</h3>
          {agents.length === 0 ? (
            <p className="mt-2 text-[13px] text-text-3">No agent has called yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {agents.map(([name, info]) => (
                <li key={name} className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-text">{name}</span>
                  <span className="text-[12px] tabular-nums text-text-3">
                    {info.calls} call{info.calls === 1 ? "" : "s"}, last{" "}
                    {info.last.slice(11, 16)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 4. Live activity */}
      <div className="bg-panel">
        <div className="flex items-baseline justify-between gap-4 px-4 pb-3 pt-4">
          <h2 className="text-[15px] font-semibold text-text">Live activity</h2>
          <span className="text-[12px] text-text-3">
            Newest 20, refreshed every 2 seconds
          </span>
        </div>
        <ActivityTable activity={activity} fresh={fresh} />
      </div>

      <p className="text-[12px] text-text-3">
        Sample company and sample data. Syncing re-reads the CSV files on this
        machine; no connector calls a real system in this build.
      </p>
    </div>
  );
}
