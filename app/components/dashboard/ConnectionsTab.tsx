"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import StepStrip, {
  IconCheck,
  IconConcept,
  IconPanel,
} from "@/components/ui/StepStrip";
import ActivityTable, { useActivity } from "./ActivityTable";

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
    body: "Someone writes down what a product needs. The panel reads that page and says how much of it already exists.",
    icon: <IconConcept />,
  },
  {
    title: "Design",
    body: "The engineer picks a component. The panel sits beside the page they are working on and checks it there.",
    icon: <IconPanel />,
  },
  {
    title: "Part release",
    body: "A part number gets raised. The same check appears on the part request form itself.",
    icon: <IconCheck />,
  },
];

/** Host permissions in extension/manifest.json, named for a reader. */
const ALLOWED_SITES = [
  { host: "kearney-perlab.growthsignals.com", what: "Velocity AI Studio" },
  { host: "*.atlassian.net", what: "Jira and Confluence" },
  { host: "airtable.com", what: "Airtable bases" },
  { host: "localhost:3000", what: "this demo, including the sample PLM page" },
];

const stamp = (iso: string | null) =>
  iso ? iso.slice(0, 10) + " " + iso.slice(11, 16) : "Never";

export default function ConnectionsTab() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const { activity, fresh } = useActivity(20, true);

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources");
      setSources((await res.json()).sources ?? []);
    } catch {
      /* the table stays as it was */
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

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

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[15px] text-text-2">Connections</p>
        <p className="mt-1 text-[13px] text-text-3">
          Where the data comes from, where the check appears, and what is
          happening right now.
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

      {/* 2. Data sources */}
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

        {/* Where the panel is allowed to read */}
        <div className="bg-panel p-4">
          <h2 className="text-[15px] font-semibold text-text">Where the panel runs</h2>
          <p className="mt-1 text-[13px] text-text-2">
            The browser extension reads these pages and no others.
          </p>
          <ul className="mt-3 space-y-1">
            {ALLOWED_SITES.map((site) => (
              <li key={site.host} className="text-[13px] text-text">
                <span className="font-mono text-[12px] text-text-2">{site.host}</span>{" "}
                <span className="text-text-3">{site.what}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-text-3">
            Page text goes to the Platforming Index and nowhere else.
          </p>
        </div>
      </div>

      {/* 3. Live activity */}
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
