"use client";

import { useState } from "react";
import { Part, px, usd } from "@/lib/voltaraData";

const W = 900;
const H = 300;
const PAD = { top: 14, right: 8, bottom: 66, left: 64 };

/**
 * Three short lines under each bar. Three rather than two so the trailing
 * rating survives: two parts here are both "Half Bridge IGBT Module" and only
 * the 600V / 1200V tail tells them apart.
 */
function shortLabel(name: string): string[] {
  const lines: string[] = [];
  let line = "";
  for (const w of name.split(" ")) {
    if ((line + " " + w).trim().length > 14 && line) {
      lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
    if (lines.length === 3) return lines;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function ticks(max: number): number[] {
  const step = Math.pow(10, Math.floor(Math.log10(max))) / 2;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + 1; v += top / 4) out.push(Math.round(v));
  return out;
}

export default function GapChart({
  parts,
  onAsk,
}: {
  parts: Part[];
  onAsk: (part: Part) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const axis = ticks(Math.max(...parts.map((p) => p.gap)));
  const top = axis[axis.length - 1];
  const band = plotW / parts.length;
  const barW = Math.min(34, band * 0.42);

  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Yearly price gap by part"
    >
      {/* Gridlines and value axis */}
      {axis.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            stroke="#2F3234"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 10}
            y={y(v) + 4}
            textAnchor="end"
            fill="#818182"
            fontSize={11}
          >
            {v === 0 ? "$0" : usd(v)}
          </text>
        </g>
      ))}

      {parts.map((p, i) => {
        const cx = PAD.left + band * i + band / 2;
        const top1 = y(p.gap);
        const isTop = i === 0;
        const label = shortLabel(p.name);
        return (
          <g key={p.id}>
            <rect
              x={cx - barW / 2}
              y={top1}
              width={barW}
              height={PAD.top + plotH - top1}
              fill={isTop ? "#EC5E31" : "#F5C042"}
              opacity={hover === null || hover === i ? 1 : 0.45}
            />
            {/* Full-height hit area so hover and click are easy to land */}
            <rect
              x={cx - band / 2}
              y={PAD.top}
              width={band}
              height={plotH}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onAsk(p)}
            >
              <title>{`${p.name}: ${px(p.min)} to ${px(p.max)}, gap ${usd(p.gap)}`}</title>
            </rect>
            {label.map((line, li) => (
              <text
                key={li}
                x={cx}
                y={H - PAD.bottom + 18 + li * 13}
                textAnchor="middle"
                fill={hover === i ? "#FFFFFF" : "#818182"}
                fontSize={11}
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* Hover readout, drawn in chart space so it scales with the SVG */}
      {hover !== null &&
        (() => {
          const p = parts[hover];
          const cx = PAD.left + band * hover + band / 2;
          const boxW = 212;
          const boxH = 58;
          const bx = Math.min(Math.max(cx - boxW / 2, PAD.left), W - PAD.right - boxW);
          const by = Math.max(y(p.gap) - boxH - 10, PAD.top);
          return (
            <g pointerEvents="none">
              <rect x={bx} y={by} width={boxW} height={boxH} fill="#303436" />
              <text x={bx + 12} y={by + 19} fill="#FFFFFF" fontSize={12}>
                {p.name.length > 30 ? p.name.slice(0, 29) + "…" : p.name}
              </text>
              <text x={bx + 12} y={by + 36} fill="#B8BBBE" fontSize={11}>
                {px(p.min)} to {px(p.max)} across {p.products} products
              </text>
              <text x={bx + 12} y={by + 51} fill="#B8BBBE" fontSize={11}>
                Yearly gap {usd(p.gap)}. Click to ask why.
              </text>
            </g>
          );
        })()}
    </svg>
  );
}
