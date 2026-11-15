import type { ReactNode } from "react";

export type Step = {
  title: string;
  body: string;
  icon: ReactNode;
};

function Arrow() {
  return (
    <svg
      viewBox="0 0 64 16"
      className="hidden h-4 w-14 shrink-0 self-start text-text-2 md:block"
      style={{ marginTop: 20 }}
      aria-hidden="true"
    >
      <path
        d="M0 8h56M50 2l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function StepStrip({ steps, center = false }: { steps: Step[]; center?: boolean }) {
  return (
    <div className="flex flex-col gap-10 md:flex-row md:gap-4">
      {steps.map((s, i) => (
        <div key={s.title} className="flex flex-1 gap-4 md:contents">
          {i > 0 ? <Arrow /> : null}
          <div className={`flex-1 ${center ? "flex flex-col items-center text-center" : ""}`}>
            <div className="text-accent">{s.icon}</div>
            <h3 className="mt-8 text-[20px] font-extrabold leading-none text-text">
              {s.title}
            </h3>
            <p className="mt-6 max-w-[260px] text-[15px] leading-relaxed text-text-2">
              {s.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* Line icons, drawn in the PERLab stroke style: square caps, 2px strokes. */

const ico = {
  viewBox: "0 0 48 48",
  className: "h-14 w-14",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.6,
  "aria-hidden": true as const,
};

export function IconProfile() {
  return (
    <svg {...ico}>
      <rect x="3" y="8" width="42" height="32" />
      <circle cx="16" cy="21" r="5" />
      <path d="M7 35c0-5 4-8 9-8s9 3 9 8" />
      <path d="M30 19h11M30 26h11M30 33h7" />
    </svg>
  );
}

export function IconBeliefs() {
  return (
    <svg {...ico}>
      <path d="M4 7h32v22H17l-9 8v-8H4z" />
      <path d="M17 14c0-3 2.5-4.5 5-4.5S27 11 27 14c0 3-3 3.3-3 6" />
      <path d="M24 24v2" />
      <path d="M40 15h4v22h-5l-6 6v-6" />
    </svg>
  );
}

export function IconIndex() {
  return (
    <svg {...ico}>
      <path d="M4 34a20 20 0 0 1 40 0" />
      <path d="M4 34h8M36 34h8M24 14v5" />
      <path d="M24 34 34 22" />
      <circle cx="24" cy="34" r="3" />
    </svg>
  );
}

export function IconView() {
  return (
    <svg {...ico}>
      <rect x="3" y="7" width="42" height="34" />
      <path d="M27 7v34" />
      <path d="M8 31l5-7 5 4 4-9" />
      <path d="M32 15h8M32 22h8M32 29h5" />
    </svg>
  );
}

export function IconSystems() {
  return (
    <svg {...ico}>
      <rect x="3" y="7" width="18" height="14" />
      <rect x="27" y="7" width="18" height="14" />
      <rect x="15" y="29" width="18" height="14" />
      <path d="M12 21v4h24v-4M24 25v4" />
    </svg>
  );
}

export function IconEngine() {
  return (
    <svg {...ico}>
      <rect x="5" y="5" width="38" height="38" />
      <path d="M13 33l7-9 6 5 9-14" />
      <path d="M13 13h8" />
    </svg>
  );
}

export function IconAgent() {
  return (
    <svg {...ico}>
      <rect x="8" y="14" width="32" height="24" />
      <path d="M24 6v8M16 24h4M28 24h4" />
      <circle cx="24" cy="6" r="2.5" />
      <path d="M18 31h12" />
    </svg>
  );
}

export function IconLoop() {
  return (
    <svg {...ico}>
      <path d="M38 18a16 16 0 1 0 2 10" />
      <path d="M40 10v10h-10" />
      <path d="M18 24l5 5 9-11" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg {...ico}>
      <rect x="8" y="6" width="32" height="38" />
      <rect x="18" y="2" width="12" height="7" />
      <path d="M14 20h8M14 28h8M14 36h6" />
      <path d="M26 28l4 4 8-9" />
    </svg>
  );
}

export function IconConcept() {
  return (
    <svg {...ico}>
      <path d="M7 5h22l10 10v28H7z" />
      <path d="M29 5v10h10" />
      <path d="M23 24v11M17.5 29.5h11" />
    </svg>
  );
}

export function IconPanel() {
  return (
    <svg {...ico}>
      <rect x="3" y="8" width="42" height="32" />
      <path d="M31 8v32" />
      <path d="M8 17h17M8 24h17M8 31h11" />
      <path d="M35 16h6M35 23h6M35 30h4" />
    </svg>
  );
}
