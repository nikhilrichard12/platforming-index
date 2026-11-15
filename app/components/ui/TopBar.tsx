"use client";

import { usePathname } from "next/navigation";
import Badge from "./Badge";

/**
 * The ballpark is about the reader's own company, and we do not know its name
 * yet. Only the measured screens, which run on the sample data, carry the
 * sample company's name.
 */
export default function TopBar() {
  const pathname = usePathname();
  const sample = pathname !== "/";

  return (
    <header className="sticky top-0 z-50 h-11 bg-chrome">
      <div className="flex h-full items-center justify-between px-12">
        <span className="text-[15px] leading-none tracking-tight text-text">
          <span className="font-bold">PlatInform</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[13px] leading-none text-text-2">
            {sample ? "Voltara Power Systems" : "Your company"}
          </span>
          {sample && <Badge>Sample data</Badge>}
        </div>
      </div>
    </header>
  );
}
