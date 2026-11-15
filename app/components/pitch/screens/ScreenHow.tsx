"use client";

import { scoreMethod } from "@/lib/index";
import { HONESTY } from "@/lib/pitch";
import { TOKEN } from "@/lib/anim";
import type { ScreenProps } from "../PitchDeck";
import { CountTo, DrawPath, Frame, Source } from "../parts";

const BOX_W = 404;
const BOX_H = 84;
const GAP = 52;

/** The four boxes, top to bottom. */
function flow(bundle: ScreenProps["bundle"]) {
  const s = bundle.data.summary;
  const lines = [
    bundle.bomLines ? `${bundle.bomLines} parts list lines` : null,
    bundle.purchaseOrders
      ? `${bundle.purchaseOrders.toLocaleString("en-US")} purchase orders`
      : null,
  ].filter(Boolean) as string[];

  return [
    { title: "Parts list and purchase history", sub: lines.join(", ") },
    {
      title: "Matcher",
      sub: `${s.partNumbers} part numbers group into ${s.realParts} real parts`,
    },
    { title: "Index", sub: "Four ratios of two numbers each, averaged" },
    {
      title: "Check at the point of choice",
      sub: "Concept, design, part release",
    },
  ];
}

/**
 * Screen 5. The flow on the left draws itself; the formulas on the right are
 * the ones lib/index.ts actually used, printed with this company's figures
 * already in them and counted up in the order they are averaged.
 *
 * The footer is the point of the screen as much as the formulas are: a judge
 * should be able to tell which half of this prototype would survive meeting
 * a real company.
 */
export default function ScreenHow({ bundle, step }: ScreenProps) {
  const boxes = flow(bundle);
  const method = scoreMethod(bundle.before);
  const dimensions = method.slice(0, 4);
  const total = method[4];

  const height = boxes.length * BOX_H + (boxes.length - 1) * GAP;

  return (
    <Frame
      kicker="How it works"
      title="Nobody sets the score. The data does."
      footer={
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 border-t border-line pt-5">
          {HONESTY.map((line) => (
            <Source key={line}>{line}</Source>
          ))}
        </div>
      }
    >
      <div className="flex h-full gap-14">
        {/* The flow */}
        <div className="w-[440px] shrink-0">
          {/* Fit to the height the frame leaves, not to the column width. */}
          <svg
            viewBox={`0 0 ${BOX_W + 4} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full"
            role="img"
            aria-label="Parts list and purchase history, matcher, index, check at the point of choice"
          >
            {boxes.map((b, i) => {
              const y = i * (BOX_H + GAP);
              // The flow draws itself the moment the screen arrives; the
              // advances on this screen belong to the formulas on the right.
              const show = true;
              return (
                <g key={b.title}>
                  <DrawPath
                    d={`M2 ${y} H${BOX_W + 2} V${y + BOX_H} H2 Z`}
                    play={show}
                    delay={i * 320}
                    duration={620}
                    stroke={TOKEN.line2}
                  />
                  {i < boxes.length - 1 && (
                    <DrawPath
                      d={`M${BOX_W / 2 + 2} ${y + BOX_H} v${GAP - 10} m-5 -6 l5 6 5 -6`}
                      play={show}
                      delay={i * 320 + 420}
                      duration={300}
                      stroke={TOKEN.text2}
                    />
                  )}
                  <text
                    x={22}
                    y={y + 36}
                    fontSize={17}
                    fill={TOKEN.text}
                    style={{
                      opacity: show ? 1 : 0,
                      transition: "opacity 400ms ease",
                      transitionDelay: `${i * 320 + 200}ms`,
                    }}
                  >
                    {b.title}
                  </text>
                  <text
                    x={22}
                    y={y + 60}
                    fontSize={13}
                    fill={TOKEN.text3}
                    style={{
                      opacity: show ? 1 : 0,
                      transition: "opacity 400ms ease",
                      transitionDelay: `${i * 320 + 320}ms`,
                    }}
                  >
                    {b.sub}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* The formulas lib/index.ts used */}
        <div className="min-w-0 flex-1">
          <ul>
            {dimensions.map((d) => (
              <li
                key={d.name}
                className="flex items-center gap-6 border-b border-line py-[14px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold leading-none text-text">
                    {d.name}
                  </p>
                  <p className="mt-2 font-mono text-[12.5px] leading-snug text-text-2">
                    {d.formula}
                  </p>
                </div>
                <CountTo
                  value={Number(d.result)}
                  show={step >= 1}
                  duration={900}
                  className="w-[72px] shrink-0 text-right text-[34px] font-light leading-none tabular-nums text-text"
                />
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-end gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-none text-text">
                {total.name}
              </p>
              <p className="mt-2 font-mono text-[12.5px] text-text-2">
                {total.formula}
              </p>
            </div>
            <p className="flex shrink-0 items-baseline gap-2">
              <CountTo
                value={Number(total.result)}
                show={step >= 2}
                duration={1100}
                className="text-[64px] font-light leading-none tabular-nums text-text"
              />
              <span className="text-[15px] text-text-3">of 100</span>
            </p>
          </div>
          <div className="mt-3">
            <Source>Parts list and survey, sample data</Source>
          </div>
        </div>
      </div>
    </Frame>
  );
}
