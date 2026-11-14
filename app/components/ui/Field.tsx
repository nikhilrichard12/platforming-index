import type { ReactNode } from "react";

/**
 * Fieldset-legend field: a 1px outline with the label sitting on the top
 * border, as on the PERLab filter row.
 */
export default function Field({
  label,
  hint,
  error,
  dense,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  /** Tight padding for a single-line control. */
  dense?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <fieldset
        className={`rounded-field border px-4 ${dense ? "pb-2" : "pb-4"} ${
          error ? "border-risk" : "border-line-2"
        }`}
      >
        <legend className="whitespace-nowrap px-2 text-[12px] font-normal text-text-2">{label}</legend>
        {hint ? <p className="mb-4 mt-1 text-[12px] text-text-3">{hint}</p> : null}
        <div className={hint ? "" : dense ? "" : "pt-2"}>{children}</div>
      </fieldset>
      {error ? <p className="mt-2 text-[12px] text-risk">{error}</p> : null}
    </div>
  );
}
