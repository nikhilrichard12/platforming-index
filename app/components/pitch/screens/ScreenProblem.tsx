"use client";

import { useEffect, useState } from "react";
import { FAN_EXAMPLE, RESEARCH_CITATION, RESEARCH_FIGURES } from "@/lib/pitch";
import { Part, PRODUCT_MASTER } from "@/lib/voltaraData";
import type { ScreenProps } from "../PitchDeck";
import { CountTo, FanGlyph, Frame, Reveal, Source, Typed } from "../parts";

/**
 * Screen 1. Four beats on black.
 *
 *   1. The citation types itself in, publication first, sample second.
 *   2. The two survey figures count up under it.
 *   3. The figures fold into one line and the headline takes the stage.
 *   4. One row of the parts list, drawn: the same fan in six products under
 *      six part numbers.
 *
 * Both figures and every word beside them are copied from docs/CONTEXT.md
 * through lib/pitch.ts, and the six part numbers are read from the parts file
 * the rest of the app reads, so nothing on this screen is typed in here.
 */
export default function ScreenProblem({ bundle, step, printing }: ScreenProps) {
  /* The second citation line waits for the first one to finish typing. */
  const [sample, setSample] = useState(printing);
  useEffect(() => {
    if (printing) {
      setSample(true);
      return;
    }
    const id = setTimeout(() => setSample(true), 1900);
    return () => clearTimeout(id);
  }, [printing]);

  const counted = step >= 1;
  const headline = step >= 2;
  const picture = step >= 3;

  const fan = findFan(bundle.data.parts);
  const carriers = fan
    ? PRODUCT_MASTER.map((product) => ({
        product,
        row: fan.rows.find((r) => r.products.includes(product.id)),
      })).filter((c) => c.row)
    : [];

  return (
    <Frame dark>
      <div className="flex h-full flex-col">
        {/* The citation stays up for all four beats; it is the source. */}
        <div className="shrink-0">
          <p className="max-w-[980px] text-[17px] font-light leading-snug text-text-2">
            <Typed text={RESEARCH_CITATION.publication} play={!printing} />
          </p>
          <p
            className={`mt-2 max-w-[980px] text-[15px] font-light leading-snug text-text-3 transition-opacity duration-300 ${
              sample ? "opacity-100" : "opacity-0"
            }`}
          >
            <Typed text={RESEARCH_CITATION.sample} play={sample && !printing} />
          </p>
        </div>

        <div className="relative mt-8 min-h-0 flex-1">
          {/* Beat 2: the two figures, large. */}
          <div
            className={`absolute inset-0 flex items-start transition-opacity duration-500 ${
              headline ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
            aria-hidden={headline}
          >
            <div className="grid w-full grid-cols-2 gap-14">
              {RESEARCH_FIGURES.map((f, i) => (
                <Reveal key={f.value} show={counted} delay={i * 180}>
                  <p className="flex items-baseline gap-2 font-light tabular-nums text-text">
                    <CountTo
                      value={f.value}
                      show={counted}
                      className="text-[118px] leading-none"
                    />
                    <span className="text-[34px] leading-none text-text-2">
                      percent
                    </span>
                  </p>
                  <p className="mt-6 max-w-[460px] text-[21px] font-light leading-snug text-text-2">
                    {f.read}
                  </p>
                  <div className="mt-5">
                    <Source>{f.source}</Source>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Beats 3 and 4: the figures folded into one line, then the picture. */}
          <div
            className={`absolute inset-0 flex flex-col transition-opacity duration-500 ${
              headline ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!headline}
          >
            <p className="shrink-0 text-[14px] font-light leading-snug text-text-3">
              {RESEARCH_FIGURES.map((f, i) => (
                <span key={f.value}>
                  {i > 0 ? <span className="px-3">·</span> : null}
                  <span className="tabular-nums text-text-2">
                    {f.value} percent
                  </span>{" "}
                  {f.read}
                </span>
              ))}
            </p>

            <h1 className="mt-7 max-w-[1000px] shrink-0 text-[56px] font-light leading-[1.12] text-text">
              Everyone agrees platforming pays. Nobody can see where.
            </h1>

            {/* Beat 4: one row of the parts list, drawn. */}
            <div className="mt-14">
              <div className="flex items-end gap-5">
                {carriers.map(({ product, row }, i) => (
                  <Reveal key={product.id} show={picture} delay={i * 130}>
                    <ProductIcon spin={picture && !printing} />
                    <p className="mt-3 text-[11px] uppercase tracking-wide text-text-3">
                      {product.id}
                    </p>
                    <p className="mt-1 text-[15px] tabular-nums text-text">
                      {row!.pn}
                    </p>
                  </Reveal>
                ))}
              </div>

              <Reveal show={picture} delay={carriers.length * 130 + 120}>
                <p className="mt-6 text-[17px] font-light leading-snug text-text-3">
                  {FAN_EXAMPLE.caption}
                </p>
                <div className="mt-2">
                  <Source>
                    Sample data. {fan ? `${fan.name}. ` : ""}
                    {FAN_EXAMPLE.source}
                  </Source>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/**
 * The fan group, found by words rather than by id, the way every other
 * surface finds a part. Returns null rather than throwing: a screen that
 * cannot find its example should lose its picture, not the deck.
 */
function findFan(parts: Part[]): Part | null {
  const words = FAN_EXAMPLE.fragment.toLowerCase().split(/\s+/);
  return (
    parts.find((p) => {
      const name = p.name.toLowerCase();
      return words.every((w) => name.includes(w));
    }) ?? null
  );
}

/**
 * One product, carrying one fan. The chassis is drawn in the line colour and
 * the fan in the accent, so what the six icons have in common is the one
 * thing that is the same colour in all six.
 */
function ProductIcon({ spin }: { spin: boolean }) {
  return (
    <svg width="150" height="92" viewBox="0 0 150 92" aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="149"
        height="91"
        fill="none"
        stroke="#2F3234"
      />
      {[26, 46, 66].map((y) => (
        <line key={y} x1="16" y1={y} x2="66" y2={y} stroke="#2F3234" />
      ))}
      <FanGlyph cx={108} cy={46} r={23} spin={spin} />
    </svg>
  );
}
