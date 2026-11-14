"use client";

import { useEffect, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import { ACTIVITY_LABEL, Activity, actionLabel } from "@/lib/rules";

const POLL_MS = 2000;

const when = (iso: string) => iso.slice(11, 19);

/** Polls the activity log and marks rows that arrived since the last poll. */
export function useActivity(limit: number, enabled: boolean) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    let live = true;

    async function tick() {
      try {
        const res = await fetch("/api/activity");
        const rows: Activity[] = (await res.json()).activity ?? [];
        if (!live) return;

        const arrived = rows.filter((r) => !seen.current.has(r.id)).map((r) => r.id);
        rows.forEach((r) => seen.current.add(r.id));
        setActivity(rows.slice(0, limit));

        // Everything is new on the first poll; only mark later arrivals.
        if (!first.current && arrived.length) {
          setFresh(new Set(arrived));
          setTimeout(() => live && setFresh(new Set()), 1000);
        }
        first.current = false;
      } catch {
        /* the table keeps whatever it last had */
      }
    }

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [limit, enabled]);

  return { activity, fresh };
}

export default function ActivityTable({
  activity,
  fresh,
}: {
  activity: Activity[];
  fresh: Set<string>;
}) {
  return (
    <table className="w-full border-collapse whitespace-nowrap text-[13px]">
      <thead>
        <tr className="border-y border-line bg-panel-2 text-left text-text-2">
          <th className="py-2 pl-4 pr-2 font-normal">When</th>
          <th className="px-2 py-2 font-normal">Source</th>
          <th className="px-2 py-2 font-normal">Action</th>
          <th className="w-full max-w-0 px-2 py-2 font-normal">Summary</th>
          <th className="py-2 pl-2 pr-4 font-normal">Product</th>
        </tr>
      </thead>
      <tbody>
        {activity.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-4 text-text-3">
              Nothing yet. Checks from the panel, the extension, or this
              dashboard appear here as they happen.
            </td>
          </tr>
        ) : (
          activity.map((a) => (
            <tr
              key={a.id}
              className={`border-b border-line last:border-b-0 ${
                fresh.has(a.id) ? "border-l-2 border-l-accent" : "border-l-2 border-l-transparent"
              }`}
            >
              <td className="py-2 pl-4 pr-2 tabular-nums text-text-3">{when(a.at)}</td>
              <td className="px-2 py-2">
                <Badge tone={a.source === "extension" ? "positive" : "neutral"}>
                  {ACTIVITY_LABEL[a.source]}
                </Badge>
              </td>
              <td className="px-2 py-2 text-text-2">{actionLabel(a.tool)}</td>
              <td className="w-full max-w-0 truncate px-2 py-2 text-text" title={a.summary}>
                {a.summary}
              </td>
              <td className="py-2 pl-2 pr-4 text-text-2">{a.product ?? "—"}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
