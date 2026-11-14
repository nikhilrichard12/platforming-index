"use client";

export type Choice = { value: string; label: string };

/**
 * A row of selectable options. Selected options invert to a light fill so the
 * single orange action on the page stays the only accent.
 */
export default function ChoiceGroup({
  options,
  selected,
  onSelect,
  multi = false,
  size = "md",
}: {
  options: readonly Choice[];
  selected: string[];
  onSelect: (value: string) => void;
  multi?: boolean;
  size?: "md" | "sm";
}) {
  return (
    <div className="flex flex-wrap gap-2" role={multi ? "group" : "radiogroup"}>
      {options.map((o) => {
        const isOn = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={isOn}
            onClick={() => onSelect(o.value)}
            className={`rounded-field border text-left transition-colors ${
              size === "sm" ? "px-3 py-[7px] text-[13px]" : "px-4 py-2 text-[13px]"
            } ${
              isOn
                ? "border-text bg-transparent text-text"
                : "border-line bg-panel-2 text-text-2 hover:border-line-2 hover:text-text"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
