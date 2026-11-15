"use client";

import { PLATFORMING } from "@/lib/pitch";
import { PRODUCT_MASTER } from "@/lib/voltaraData";
import type { ScreenProps } from "../PitchDeck";
import { FanGlyph, Frame, Reveal, Source, Typed } from "../parts";

/**
 * Screen 2. What the word means, in four beats.
 *
 *   1. The word, and the definition everybody hears.
 *   2. A line through that definition.
 *   3. The definition the product is built on.
 *   4. The difference, drawn: one part on the left, and on the right the
 *      same part inside the boundary it belongs to, with the six products
 *      that are already on it.
 *
 * Everything in the picture is read from one record of
 * data/derived/voltara_interfaces.json. The roles, the spec, the inherited
 * work, the product list and the year are that record's own fields, so the
 * screen shows an interface rather than describing one.
 */
export default function ScreenWhat({ bundle, step, printing }: ScreenProps) {
  const struck = step >= 1;
  const real = step >= 2;
  const picture = step >= 3;

  const iface =
    bundle.interfaces.find((i) => i.id === PLATFORMING.interfaceId) ?? null;
  const carriers = iface
    ? PRODUCT_MASTER.filter((p) => iface.products.includes(p.id))
    : [];

  return (
    <Frame dark>
      <div className="flex h-full flex-col">
        <h1 className="shrink-0 text-[76px] font-light leading-none text-text">
          {PLATFORMING.word}
        </h1>

        <p className="mt-5 shrink-0 text-[30px] font-light leading-snug text-text-2">
          <span className="relative inline-block">
            <Typed text={PLATFORMING.heard} play={!printing} />
            <span
              aria-hidden
              className={`absolute left-0 top-1/2 h-[2px] w-full origin-left bg-accent transition-transform duration-700 ease-out ${
                struck ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </span>
        </p>

        <p className="mt-3 h-[42px] shrink-0 text-[30px] font-light leading-snug text-text">
          {real ? <Typed text={PLATFORMING.real} play={!printing} /> : null}
        </p>

        {/* Beat 4: a part, and the interface the same part sits in. */}
        <div className="mt-9 min-h-0 flex-1">
          <div className="flex h-full items-start gap-12">
            <Reveal show={picture} className="w-[200px] shrink-0">
              <svg width="200" height="150" viewBox="0 0 200 150" aria-hidden>
                <FanGlyph cx={100} cy={72} r={66} spin={picture && !printing} />
              </svg>
              <p className="mt-3 text-[19px] font-light leading-none text-text">
                {PLATFORMING.partLabel}
              </p>
              <p className="mt-2 text-[14px] leading-snug text-text-3">
                {PLATFORMING.partName}
              </p>
            </Reveal>

            <div className="min-w-0 flex-1">
              <Reveal show={picture} delay={220}>
                <div className="border border-line-2 p-7">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[19px] font-light leading-none text-text">
                      {PLATFORMING.interfaceLabel}
                    </p>
                    <p className="text-[12px] leading-none text-text-3">
                      {iface ? `${iface.id} · ${iface.name}` : "not in the file"}
                    </p>
                  </div>

                  {iface && (
                    <div className="mt-4 flex items-start gap-6">
                      <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden>
                        <FanGlyph
                          cx={52}
                          cy={52}
                          r={44}
                          rim={false}
                          spin={picture && !printing}
                        />
                      </svg>
                      <ul className="min-w-0 flex-1 space-y-[6px]">
                        {iface.roles.map((r) => (
                          <li key={r.role} className="flex gap-3 text-[14px] leading-snug">
                            <span className="w-[78px] shrink-0 text-text-3">
                              {r.role}
                            </span>
                            <span className="min-w-0 text-text-2">
                              {r.partNames.join(", ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <ul className="w-[290px] shrink-0 space-y-[6px]">
                        {iface.inherits.map((line) => (
                          <li key={line} className="text-[14px] leading-snug text-text-2">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {iface && (
                    <p className="mt-5 border-t border-line pt-4 text-[14px] leading-snug text-text-3">
                      {iface.spec}
                    </p>
                  )}
                </div>
              </Reveal>

              {/* The six products snap on, one by one. */}
              <div className="mt-5 flex items-start gap-4">
                {carriers.map((p, i) => (
                  <Reveal key={p.id} show={picture} delay={620 + i * 150}>
                    <svg width="70" height="12" viewBox="0 0 70 12" aria-hidden>
                      <path d="M35 0 L35 12" stroke="#2F3234" />
                    </svg>
                    <div className="border border-line px-3 py-3">
                      <p className="text-[13px] leading-none text-text-2">{p.id}</p>
                    </div>
                  </Reveal>
                ))}
                <Reveal
                  show={picture}
                  delay={620 + carriers.length * 150}
                  className="self-end pb-2 pl-2"
                >
                  <p className="whitespace-nowrap text-[19px] font-light leading-none text-text">
                    {iface
                      ? `On ${iface.products.length} products since ${iface.since}.`
                      : ""}
                  </p>
                </Reveal>
              </div>

              <Reveal show={picture} delay={620 + (carriers.length + 1) * 150}>
                <p className="mt-7 text-[19px] font-light leading-snug text-text-2">
                  {PLATFORMING.caption}
                </p>
                <div className="mt-2">
                  <Source>Sample data. {PLATFORMING.source}</Source>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}
