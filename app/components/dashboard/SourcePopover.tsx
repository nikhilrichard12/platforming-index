"use client";

import { useState } from "react";

interface Props {
  label: string;
  source: string;
  assumption?: boolean;
}

export default function SourcePopover({ label, source, assumption }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={source}
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.05em",
          color: assumption ? "#d97706" : "#7823DC",
          border: `1px solid ${assumption ? "#d97706" : "#7823DC"}`,
          background: "transparent",
          padding: "2px 7px",
          cursor: "pointer",
          marginLeft: 6,
          verticalAlign: "middle",
          fontFamily: "inherit",
        }}
      >
        {label}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            background: "#1E1E1E",
            color: "#FFFFFF",
            padding: "10px 14px",
            fontSize: 11,
            lineHeight: 1.5,
            width: 260,
            border: "1px solid #CCCCCC",
            zIndex: 100,
            whiteSpace: "pre-wrap",
          }}
        >
          <span style={{ color: assumption ? "#fbbf24" : "#c084fc", fontWeight: 600 }}>
            {assumption ? "Assumption" : "Source"}
          </span>
          <br />
          {source}
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              position: "absolute",
              top: 6,
              right: 8,
              background: "none",
              border: "none",
              color: "#999",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </span>
  );
}
