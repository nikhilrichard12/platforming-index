"use client";

import { useEffect, useState } from "react";
import { loadBallpark } from "@/lib/profile";
import { ballpark, isComplete } from "@/lib/ballpark";

/**
 * The two levels, side by side. If this reader guessed before they measured,
 * the measured score should sit next to what they guessed, so the gap between
 * eight answers and a parts list is visible rather than argued about.
 */
export default function BallparkNote() {
  const [range, setRange] = useState<string>("");

  useEffect(() => {
    const answers = loadBallpark();
    if (!isComplete(answers)) return;
    const b = ballpark(answers);
    setRange(`${b.scoreRange.low} to ${b.scoreRange.high}`);
  }, []);

  if (!range) return null;
  return <p className="text-[12px] text-text-3">Ballpark was {range}</p>;
}
