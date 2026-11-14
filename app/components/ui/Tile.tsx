import type { ReactNode } from "react";

/** Flat panel block: panel fill, no border, no shadow, square corners. */
export default function Tile({
  label,
  unit,
  value,
  children,
  className = "",
}: {
  label?: string;
  unit?: string;
  value?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  if (children) {
    return <div className={`bg-panel p-4 ${className}`}>{children}</div>;
  }
  return (
    <div className={`flex min-h-[140px] flex-col justify-between bg-panel p-4 ${className}`}>
      <p className="text-[14px] font-semibold text-text">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-[13px] text-text-3">{unit}</span>
        <span className="text-[30px] font-light leading-none text-text">{value}</span>
      </div>
    </div>
  );
}
