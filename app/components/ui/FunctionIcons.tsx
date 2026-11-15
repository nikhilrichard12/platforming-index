import type { ReactNode } from "react";
import { FunctionName } from "@/lib/survey";

/**
 * One mark per function, in the same line art family as the step icons:
 * square ends, no fills, drawn on a 24 grid. Each one says how that function
 * counts complexity, so the same symbol can sit on the orbit, beside a page
 * title and on a tile.
 */

function Frame({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

/** CEO: the whole portfolio, and whether it lands. */
export function IconTarget({ size }: { size?: number }) {
  return (
    <Frame size={size}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
    </Frame>
  );
}

/** CFO: what it costs. */
export function IconDollar({ size }: { size?: number }) {
  return (
    <Frame size={size}>
      <path d="M16 7.5c-1-1.6-2.6-2.2-4.3-2.2-2 0-3.6 1-3.6 2.8 0 4 8 2.2 8 6.3 0 2-1.8 3.3-4.1 3.3-2 0-3.7-.7-4.7-2.3" />
      <path d="M12 3v18" />
    </Frame>
  );
}

/** Engineering: the hours that go back into parts already solved. */
export function IconGear({ size }: { size?: number }) {
  return (
    <Frame size={size}>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19" />
    </Frame>
  );
}

/** Supply chain: the suppliers and numbers a part spreads into. */
export function IconNodes({ size }: { size?: number }) {
  return (
    <Frame size={size}>
      <circle cx="5" cy="6" r="2.4" />
      <circle cx="19" cy="6" r="2.4" />
      <circle cx="12" cy="18.5" r="2.4" />
      <path d="M7.1 7.3l3.3 9M16.9 7.3l-3.3 9M7.4 6h9.2" />
    </Frame>
  );
}

/** Sales: the weeks a customer waits. */
export function IconClock({ size }: { size?: number }) {
  return (
    <Frame size={size}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 6.5V12l4 2.4" />
    </Frame>
  );
}

export const FUNCTION_ICON: Record<
  FunctionName,
  (props: { size?: number }) => React.JSX.Element
> = {
  CEO: IconTarget,
  CFO: IconDollar,
  Engineering: IconGear,
  "Supply chain": IconNodes,
  Sales: IconClock,
};

/** The same marks as plain SVG children, for drawing inside another svg. */
export const FUNCTION_PATHS: Record<FunctionName, ReactNode> = {
  CEO: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
    </>
  ),
  CFO: (
    <>
      <path d="M16 7.5c-1-1.6-2.6-2.2-4.3-2.2-2 0-3.6 1-3.6 2.8 0 4 8 2.2 8 6.3 0 2-1.8 3.3-4.1 3.3-2 0-3.7-.7-4.7-2.3" />
      <path d="M12 3v18" />
    </>
  ),
  Engineering: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19" />
    </>
  ),
  "Supply chain": (
    <>
      <circle cx="5" cy="6" r="2.4" />
      <circle cx="19" cy="6" r="2.4" />
      <circle cx="12" cy="18.5" r="2.4" />
      <path d="M7.1 7.3l3.3 9M16.9 7.3l-3.3 9M7.4 6h9.2" />
    </>
  ),
  Sales: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 6.5V12l4 2.4" />
    </>
  ),
};
