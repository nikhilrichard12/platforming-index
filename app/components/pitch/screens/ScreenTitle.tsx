"use client";

import { PRODUCT, TEAM, TITLE } from "@/lib/pitch";
import { Frame } from "../parts";

/** Screen 1. The name, who built it, and what it was built for. */
export default function ScreenTitle() {
  return (
    <Frame>
      <div className="flex h-full flex-col justify-center">
        <p className="text-[19px] font-light leading-none text-text-2">
          {TEAM.name}
        </p>
        <h1 className="mt-5 text-[112px] font-light leading-none text-text">
          {PRODUCT}
        </h1>
        <span aria-hidden className="mt-7 block h-[3px] w-[180px] bg-accent" />
        <p className="mt-7 text-[22px] font-light leading-none text-text-2">
          {TITLE.event}
        </p>
      </div>
    </Frame>
  );
}
