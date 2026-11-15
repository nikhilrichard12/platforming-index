import type { ReactNode } from "react";

export default function PageHeader({
  parent,
  section,
  title,
  titleIcon,
  actions,
}: {
  parent: string;
  section: string;
  title: string;
  /** A mark before the title, for a page written for one function. */
  titleIcon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="pt-7">
      <div className="flex items-center gap-3 text-[17px] font-light leading-none">
        <span className="text-text-3">{parent}</span>
        <span className="text-text-3">/</span>
        <span className="text-text">{section}</span>
      </div>
      <div className="mt-4 flex items-start justify-between gap-6">
        <h1 className="flex items-center gap-3 text-[32px] font-light leading-tight text-text">
          {titleIcon ? <span className="text-text-2">{titleIcon}</span> : null}
          {title}
        </h1>
        {actions ? <div className="flex items-center gap-3 pt-1">{actions}</div> : null}
      </div>
    </div>
  );
}
