import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import "./pitch.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Platforming Index, the pitch",
  description: "Six minutes on why platforming stalls and what we built for it",
};

/**
 * A fourth root layout. The deck owns the whole window, so it carries no
 * TopBar and no page chrome: the only furniture is the deck's own progress
 * rule and clock, which live inside the page and hide when it prints.
 */
export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="overflow-hidden bg-surface text-text">{children}</body>
    </html>
  );
}
