"use client";

import Badge from "@/components/ui/Badge";
import { PITCH_ASSUMPTIONS, funnelMath, funnelStages } from "@/lib/pitch";
import { TOKEN } from "@/lib/anim";
import { usd } from "@/lib/voltaraData";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Reveal, Source } from "../parts";

/* The funnel, three bands narrowing downward, drawn to match the rows beside it. */
const BAND_H = 84;
const BAND_GAP = 6;
const FUNNEL_W = 360;
const WIDTHS = [344, 236, 146, 76];

function band(i: number) {
  const y = i * (BAND_H + BAND_GAP);
  const cx = FUNNEL_W / 2;
  const top = WIDTHS[i] / 2;
  const bot = WIDTHS[i + 1] / 2;
  return `M${cx - top} ${y} L${cx + top} ${y} L${cx + bot} ${y + BAND_H} L${
    cx - bot
  } ${y + BAND_H} Z`;
}

const pct = (n: number) => `${Math.round(n * 100)} percent`;

/**
 * Screen 7. The three stages fill in order, then the client's side arrives.
 *
 * Everything above the rule is a number we chose and the screen says so on
 * every row it applies to. Everything below the rule is read from the
 * purchase history. Keeping the two apart on one screen is the point: the
 * revenue is a plan, the saving is a measurement.
 */
export default function ScreenModel({ bundle, step }: ScreenProps) {
  const stages = funnelStages(usd);
  const math = funnelMath();
  const a = PITCH_ASSUMPTIONS;
  const market = a.qualifyingManufacturers.value;
  const s = bundle.data.summary;
  const products = bundle.products ?? 6;

  return (
    <Frame
      kicker="The business"
      title="It opens the door, then it sizes the work."
    >
      <div className="flex gap-10">
        <svg
          viewBox={`0 0 ${FUNNEL_W} ${3 * BAND_H + 2 * BAND_GAP}`}
          className="h-auto w-[300px] shrink-0"
          role="img"
          aria-label="Ballpark, measured, sustained"
        >
          {stages.map((stage, i) => (
            <path
              key={stage.name}
              d={band(i)}
              fill={step >= i ? TOKEN.panel : "none"}
              stroke={step >= i ? TOKEN.line2 : TOKEN.line}
              strokeWidth={1.2}
              style={{ transition: "fill 400ms ease, stroke 400ms ease" }}
            />
          ))}
        </svg>

        <div className="min-w-0 flex-1">
          {stages.map((stage, i) => (
            <div
              key={stage.name}
              className="flex items-center"
              style={{ height: BAND_H, marginBottom: BAND_GAP }}
            >
              <Reveal show={step >= i} className="w-full">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-[22px] font-light leading-none text-text">
                    {stage.name}
                  </h2>
                  <span className="text-[17px] leading-none text-text-2">
                    {stage.price}
                  </span>
                  {stage.assumed ? <Badge tone="warn">Our assumption</Badge> : null}
                </div>
                <p className="mt-2 text-[15px] leading-snug text-text-2">
                  {stage.what}
                </p>
                <div className="mt-1">
                  <Source>{stage.who}</Source>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>

      <Reveal show={step >= 2} className="mt-2">
        <p className="font-mono text-[13px] leading-relaxed text-text-2">
          {market.low} to {market.high} qualifying manufacturers x{" "}
          {pct(a.measuredTakeRate.value)} ={" "}
          {math.diagnostics.low} to {math.diagnostics.high} diagnostics at{" "}
          {usd(a.measuredDiagnosticPriceUsd.value)} ={" "}
          {usd(math.diagnosticRevenue.low)} to {usd(math.diagnosticRevenue.high)}.{" "}
          {pct(a.sustainedRenewalRate.value)} go on to a licence at{" "}
          {usd(a.sustainedLicensePriceUsd.value)} a year ={" "}
          {usd(math.licenceRevenue.low)} to {usd(math.licenceRevenue.high)} recurring.
        </p>
        <div className="mt-2">
          <Source>
            Market range: {a.qualifyingManufacturers.source}. The two prices and
            both rates are our assumptions, not findings.
          </Source>
        </div>
      </Reveal>

      <Reveal show={step >= 3} className="mt-5 border-t border-line pt-5">
        <div className="flex items-end gap-10">
          <p className="max-w-[760px] text-[23px] font-light leading-snug text-text">
            The client&rsquo;s side is not an assumption. A company with{" "}
            {products} products, spending {usd(s.yearlySpendUsd)} a year, pays{" "}
            {usd(s.yearlyPriceGapUsd)} of it in price gaps on parts it already
            shares.
          </p>
          <div className="shrink-0 text-right">
            <p className="text-[48px] font-light leading-none tabular-nums text-text">
              {usd(s.yearlyPriceGapUsd)}
            </p>
            <div className="mt-2">
              <Source>Purchase history, sample data</Source>
            </div>
          </div>
        </div>
      </Reveal>
    </Frame>
  );
}
