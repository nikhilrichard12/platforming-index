"use client";

import { ReactNode } from "react";
import { PlatformInterface, matchInterface } from "@/lib/interfaces";
import { PluginScene, PLUGIN } from "@/lib/pitch";

/**
 * The three pictures on screen 3, drawn rather than captured.
 *
 * A browser frame, a page inside it, and the panel down its right edge. The
 * page is deliberately a drawing: the words that matter (the product, the
 * needs) are real text, and the prose around them is grey bars, so nobody
 * mistakes the frame for a screenshot of something we have shipped. Each
 * frame says so under it in words as well.
 *
 * What the panel shows is not drawn. Every need line on the page is put
 * through lib/interfaces.ts against the interfaces the company actually has,
 * and the cards that light up are whatever that function returns.
 */

export function BrowserFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border border-line-2 bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-3 py-[7px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-[6px] w-[6px] rounded-full bg-line-2"
            aria-hidden
          />
        ))}
        <span className="ml-2 min-w-0 truncate text-[11px] leading-none text-text-3">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function PluginSceneFrame({
  scene,
  interfaces,
  show,
  delay = 0,
}: {
  scene: PluginScene;
  interfaces: PlatformInterface[];
  show: boolean;
  delay?: number;
}) {
  /** Each need, and the interface the real matcher puts it on. */
  const landings = scene.needs.map((need) => ({
    need,
    hit: matchInterface(need, interfaces),
  }));

  /** One card per interface, in the order the needs reached them. */
  const cards: PlatformInterface[] = [];
  for (const l of landings) {
    if (l.hit && !cards.some((c) => c.id === l.hit!.interface.id)) {
      cards.push(l.hit.interface);
    }
  }

  const litAt = `${delay + 600}ms`;

  return (
    <div>
      <BrowserFrame label={scene.tool}>
        <div className="flex h-[408px]">
          {/* The page the person is already on. */}
          <div className="min-w-0 flex-1 px-4 py-3">
            <p className="truncate text-[10px] leading-none text-text-3">
              {scene.crumb}
            </p>
            <p className="mt-2 text-[15px] leading-snug text-text">
              {scene.heading}
            </p>
            <p className="mt-1 text-[12px] leading-none text-text-3">
              {scene.product}
            </p>
            <div className="mt-3 space-y-[6px]" aria-hidden>
              <span className="block h-[5px] w-full bg-line" />
              <span className="block h-[5px] w-[82%] bg-line" />
              <span className="block h-[5px] w-[64%] bg-line" />
            </div>
            <ul className="mt-4 space-y-[7px]">
              {landings.map((l) => (
                <li
                  key={l.need}
                  className="border-l pl-2 text-[12px] leading-snug transition-colors duration-700"
                  style={{
                    borderColor: show && l.hit ? "#EC5E31" : "#2F3234",
                    transitionDelay: litAt,
                  }}
                >
                  <span className="text-text-2">{l.need}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The panel, down the right edge of the page. */}
          <div className="w-[168px] shrink-0 border-l border-line bg-surface px-3 py-3">
            <p className="text-[10px] uppercase leading-none tracking-wide text-text-3">
              Panel
            </p>
            <div className="mt-3 space-y-2">
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="border p-2 transition-colors duration-700"
                  style={{
                    borderColor: show ? "#EC5E31" : "#2F3234",
                    background: show ? "rgba(236,94,49,0.10)" : "transparent",
                    transitionDelay: litAt,
                  }}
                >
                  <p className="text-[10px] leading-none text-text-3">{c.id}</p>
                  <p className="mt-1 text-[12px] leading-snug text-text">
                    {c.name}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-text-3">
                    {c.spec}
                  </p>
                  <p className="mt-[6px] text-[11px] leading-snug text-text-2">
                    On {c.products.length} products since {c.since}
                  </p>
                </div>
              ))}
              {cards.length === 0 && (
                <p className="text-[10px] leading-snug text-text-3">
                  Nothing on this page lands on an interface Voltara already
                  has.
                </p>
              )}
            </div>
          </div>
        </div>
      </BrowserFrame>

      <p className="mt-2 text-[12px] leading-snug text-text-3">
        {scene.who} · {PLUGIN.tag}
      </p>
    </div>
  );
}
