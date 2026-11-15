"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import { VELOCITY, VelocityColumn } from "@/lib/pitch";
import type { ScreenProps } from "../PitchDeck";
import { Frame, Reveal } from "../parts";

/**
 * Screen 7. What the research tool changed, in three columns.
 *
 *   1. The library, and what it confirmed.
 *   2. The claim it took away from us, struck through where it stands.
 *   3. Where it ended up inside the product.
 *
 * Each column carries the screenshot the claim can be checked against,
 * cropped out of docs/velocity/screens into public/pitch/velocity. Clicking
 * one opens it at full size, which is the only click on this deck that does
 * not advance it.
 */
export default function ScreenVelocity({ step, printing }: ScreenProps) {
  const [zoom, setZoom] = useState<VelocityColumn["image"] | null>(null);

  return (
    <Frame title={VELOCITY.title}>
      <div className="relative flex h-full flex-col">
        <p className="shrink-0 text-[19px] font-light leading-snug text-text-2">
          {VELOCITY.header}
        </p>

        <div className="mt-7 grid min-h-0 flex-1 grid-cols-3 gap-8">
          {VELOCITY.columns.map((c, i) => (
            <Reveal key={c.title} show={step >= i} className="min-h-0">
              <Column
                column={c}
                /* The strike lands a beat after the column arrives. */
                arrived={step >= i}
                printing={printing}
                onZoom={() => setZoom(c.image ?? null)}
              />
            </Reveal>
          ))}
        </div>

        <Reveal show={step >= 3} className="mt-6 shrink-0">
          <p className="text-[19px] font-light leading-snug text-text">
            {VELOCITY.close}
          </p>
        </Reveal>

        {zoom && (
          <button
            type="button"
            onClick={() => setZoom(null)}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-chrome/95 p-8"
            aria-label="Close"
          >
            <Image
              src={zoom.src}
              alt={zoom.alt}
              width={1200}
              height={900}
              className="max-h-[520px] w-auto border border-line-2 object-contain"
            />
            <span className="text-[13px] text-text-3">
              {zoom.from} · click to close
            </span>
          </button>
        )}
      </div>
    </Frame>
  );
}

function Column({
  column,
  arrived,
  printing,
  onZoom,
}: {
  column: VelocityColumn;
  arrived: boolean;
  printing: boolean;
  onZoom: () => void;
}) {
  /** The same strike as screen 2, on the claim we gave up. */
  const [struck, setStruck] = useState(printing);
  useEffect(() => {
    if (printing || !arrived) {
      setStruck(printing);
      return;
    }
    const id = setTimeout(() => setStruck(true), 500);
    return () => clearTimeout(id);
  }, [arrived, printing]);

  return (
    <div
      className={`flex h-full flex-col border-t pt-4 ${
        column.accent ? "border-accent" : "border-line-2"
      }`}
    >
      <p className="text-[22px] font-light leading-none text-text">
        {column.title}
      </p>

      {column.struck && (
        <div className="mt-4 flex items-start gap-3">
          {/*
            The rule is painted as a background rather than an absolute bar,
            because this claim runs onto a second line and an absolute bar
            would only strike the first one. Cloning the decoration gives
            every line of the wrap its own rule, and the width is what the
            transition animates.
          */}
          <p className="min-w-0 text-[15px] leading-snug text-text-2">
            <span
              className="transition-[background-size] duration-500 ease-out"
              style={{
                backgroundImage: "linear-gradient(#EC5E31, #EC5E31)",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "0 56%",
                backgroundSize: struck ? "100% 1.5px" : "0% 1.5px",
                WebkitBoxDecorationBreak: "clone",
                boxDecorationBreak: "clone",
              }}
            >
              {column.struck}
            </span>
          </p>
          {column.badge && (
            <span className="shrink-0">
              <Badge tone="warn">{column.badge}</Badge>
            </span>
          )}
        </div>
      )}

      {column.lines.map((line) => (
        <p key={line} className="mt-4 text-[15px] leading-snug text-text">
          {line}
        </p>
      ))}

      {column.small && (
        <p className="mt-4 text-[13px] leading-snug text-text-3">
          {column.small}
        </p>
      )}

      {column.image && (
        <button
          type="button"
          onClick={onZoom}
          className="mt-auto block w-full border border-line-2 bg-panel p-1 text-left hover:border-text-3"
        >
          <Image
            src={column.image.src}
            alt={column.image.alt}
            width={1200}
            height={900}
            className="h-[118px] w-full object-contain"
          />
        </button>
      )}
    </div>
  );
}
