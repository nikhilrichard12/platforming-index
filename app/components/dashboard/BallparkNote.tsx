"use client";

import { useEffect, useState } from "react";
import { loadBallpark, loadProfile } from "@/lib/profile";
import { ballpark, isComplete } from "@/lib/ballpark";

/**
 * The two levels, side by side. If this reader guessed before they measured,
 * the measured score should sit next to what they guessed, so the gap between
 * eight answers and a parts list is visible rather than argued about.
 */
export default function BallparkNote() {
  const [said, setSaid] = useState<number | null>(null);

  useEffect(() => {
    const answers = loadBallpark();
    if (!isComplete(answers)) return;
    // The belief answers count here exactly as they count on the result
    // screen, so the two levels never quote different ballparks.
    setSaid(ballpark(answers, loadProfile()).score);
  }, []);

  if (said === null) return null;
  return <p className="text-[12px] text-text-3">Ballpark said {said}</p>;
}
