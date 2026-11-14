"use client";

import type { ReactNode } from "react";

type Common = {
  children?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
};

/** Outline pill: panel-2 fill, hairline border, white text. */
export function Button({
  children,
  onClick,
  type = "button",
  disabled,
  variant = "default",
  className = "",
}: Common & { variant?: "default" | "muted" }) {
  const tone =
    variant === "muted"
      ? "border-line bg-transparent text-text-3"
      : "border-line-2 bg-panel-2 text-text hover:border-text-2";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`h-[34px] rounded-full border px-5 text-[14px] font-normal transition-colors disabled:cursor-default ${tone} ${className}`}
    >
      {children}
    </button>
  );
}

/** Primary action: chamfered accent block with dark text. One per screen. */
export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  className = "",
}: Common) {
  return (
    <span className={`clip-chamfer inline-block bg-line-2 p-px ${className}`}>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className="clip-chamfer block h-8 bg-accent px-7 text-[14px] font-normal text-[#1E1E1E] transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {children}
      </button>
    </span>
  );
}

/** Outlined circle for a single glyph. */
export function IconButton({
  children,
  onClick,
  label,
  className = "",
}: Common & { label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line-2 bg-panel-2 text-text transition-colors hover:border-text-2 ${className}`}
    >
      {children}
    </button>
  );
}
