"use client";

import { useEffect, useState } from "react";
import { PLATFORMING } from "@/lib/pitch";
import { PRODUCT_MASTER } from "@/lib/voltaraData";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Reveal, Source, Typed } from "../parts";

/**
 * Screen 2. What the word means, in three beats.
 *
 *   1. The definition everybody hears, struck through where it stands.
 *   2. The definition the product is built on.
 *   3. The difference, drawn: six parts loose in one product on the left, the
 *      same six held together as one proved block on the right, with the
 *      five other products that already stack onto it.
 *
 * The block, its parts, its year and its products are all read from the two
 * power stage records in data/derived/voltara_interfaces.json. The screen
 * draws what is in the file; it does not describe it.
 */
export default function ScreenWhat({ bundle, step, printing }: ScreenProps) {
  /** The strike lands inside the first beat, a beat after the line types. */
  const [struck, setStruck] = useState(printing);
  useEffect(() => {
    if (printing) {
      setStruck(true);
      return;
    }
    const id = setTimeout(() => setStruck(true), 900);
    return () => clearTimeout(id);
  }, [printing]);

  const records = PLATFORMING.blockIds
    .map((id) => bundle.interfaces.find((i) => i.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const parts = records.flatMap((r) => r.partNames);
  const inherits = records.flatMap((r) => r.inherits);
  const years = records
    .map((r) => r.since)
    .filter((y): y is number => y !== null);
  const provedIn = years.length ? Math.min(...years) : null;

  const onBlock = new Set(records.flatMap((r) => r.products));
  const products = PRODUCT_MASTER.filter((p) => onBlock.has(p.id));
  const first = products[0];
  const rest = products.slice(1);

  const picture = step >= 2;

  return (
    <Frame dark>
      <div className="flex h-full flex-col">
        <p className="shrink-0 text-[30px] font-light leading-snug text-text-2">
          <span className="relative inline-block">
            <Typed text={PLATFORMING.heard} play={!printing} />
            <span
              aria-hidden
              className={`absolute left-0 top-1/2 h-[2px] w-full origin-left bg-accent transition-transform duration-500 ease-out ${
                struck ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </span>
        </p>

        <p className="mt-4 h-[42px] shrink-0 text-[30px] font-light leading-snug text-text">
          {step >= 1 ? (
            <Typed text={PLATFORMING.real} play={!printing} />
          ) : null}
        </p>

        {/* Beat 3: the same six parts, loose and then held together. */}
        <div className="mt-10 flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-start gap-8">
            {/* One product, carrying six parts of its own. */}
            <Reveal show={picture} className="w-[310px] shrink-0">
              <p className="text-[13px] leading-none text-text-3">
                {PLATFORMING.oneProduct}
                {first ? ` · ${first.id}` : ""}
              </p>
              <div className="mt-3 border border-line p-4">
                <ul className="space-y-[9px]">
                  {parts.map((name) => (
                    <li key={name} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-[5px] block h-[9px] w-[9px] shrink-0 border border-line-2"
                      />
                      <span className="text-[13px] leading-snug text-text-2">
                        {name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal show={picture} delay={120} className="shrink-0 pt-20">
              <svg width="56" height="16" viewBox="0 0 56 16" aria-hidden>
                <path
                  d="M0 8 L48 8 M41 2 L48 8 L41 14"
                  fill="none"
                  stroke="#6A7275"
                  strokeWidth="1.3"
                />
              </svg>
            </Reveal>

            {/* The same six, held together, and everything that comes with them. */}
            <div className="min-w-0 flex-1">
              {/* The other five products stack onto the block. */}
              <div className="flex items-end">
                {rest.map((p, i) => (
                  <Reveal key={p.id} show={picture} delay={360 + i * 110}>
                    <div
                      className="border border-line bg-panel px-3 py-2"
                      style={{ marginLeft: i === 0 ? 0 : -8 }}
                    >
                      <p className="text-[12px] leading-none text-text-2">
                        {p.id}
                      </p>
                    </div>
                  </Reveal>
                ))}
                <Reveal show={picture} delay={360 + rest.length * 110}>
                  <p className="ml-4 whitespace-nowrap text-[15px] leading-none text-text-3">
                    {rest.length} more products stack onto it
                  </p>
                </Reveal>
              </div>

              <Reveal show={picture} delay={240} className="mt-2">
                <div className="border border-accent bg-[rgba(236,94,49,0.08)] p-5">
                  <p className="text-[19px] font-light leading-none text-text">
                    {PLATFORMING.blockName}
                    {provedIn ? `, proven in ${provedIn}` : ""}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-[9px]">
                    {parts.map((name) => (
                      <p
                        key={name}
                        className="flex items-start gap-3 text-[13px] leading-snug text-text-2"
                      >
                        <span
                          aria-hidden
                          className="mt-[5px] block h-[9px] w-[9px] shrink-0 border border-accent bg-accent"
                        />
                        {name}
                      </p>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-[6px] border-t border-line pt-3">
                    {inherits.map((line) => (
                      <p
                        key={line}
                        className="text-[13px] leading-snug text-text-3"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          <Reveal show={picture} delay={840} className="mt-auto">
            <p className="text-[19px] font-light leading-snug text-text-2">
              {PLATFORMING.caption}
            </p>
            <div className="mt-2">
              <Source>{PLATFORMING.source}</Source>
            </div>
          </Reveal>
        </div>
      </div>
    </Frame>
  );
}
