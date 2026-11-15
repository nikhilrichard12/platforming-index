"use client";

import { CLIPS, PLUGIN, PLUGIN_SCENES } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import Clip from "../Clip";
import PluginSceneFrame from "../SceneFrame";
import { Frame, Reveal, Source } from "../parts";

/**
 * Screen 3. The product, where it actually runs.
 *
 *   1. The title, then the recorded plugin, full width.
 *   2. The same panel on three pages, one per function, drawn.
 *   3. One line about what it is doing.
 *
 * The clip is the real thing and the three frames are drawings; the screen
 * keeps them apart, and every frame carries the word "Illustration" under it.
 */
export default function ScreenPlugin({ bundle, step, active, printing }: ScreenProps) {
  const gallery = step >= 1;

  return (
    <Frame>
      <div className="flex h-full flex-col">
        <div className="relative min-h-0 flex-1">
          {/* Beat 1: the recording. */}
          <div
            className={`absolute inset-0 flex flex-col transition-opacity duration-500 ${
              gallery ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
            aria-hidden={gallery}
          >
            <h1 className="shrink-0 text-[42px] font-light leading-[1.12] text-text">
              {PLUGIN.title}
            </h1>
            <div className="mt-7 min-h-0 flex-1">
              <Clip
                src={CLIPS.plugin.src}
                label={CLIPS.plugin.label}
                play={active && !gallery && !printing}
              />
            </div>
          </div>

          {/* Beats 2 and 3: the same panel on three pages. */}
          <div
            className={`absolute inset-0 flex flex-col transition-opacity duration-500 ${
              gallery ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!gallery}
          >
            <h1 className="shrink-0 text-[34px] font-light leading-none text-text">
              {PLUGIN.gallery}
            </h1>

            <div className="mt-7 grid grid-cols-3 gap-6">
              {PLUGIN_SCENES.map((scene, i) => (
                <Reveal key={scene.who} show={gallery} delay={i * 260}>
                  <PluginSceneFrame
                    scene={scene}
                    interfaces={bundle.interfaces}
                    show={gallery}
                    delay={i * 260}
                  />
                </Reveal>
              ))}
            </div>

            <Reveal show={step >= 2} className="mt-auto">
              <p className="text-[30px] font-light leading-snug text-text">
                {PLUGIN.close}
              </p>
              <div className="mt-2">
                <Source>
                  Interfaces matched by lib/interfaces.ts against
                  data/derived/voltara_interfaces.json. Sample data.
                </Source>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </Frame>
  );
}
