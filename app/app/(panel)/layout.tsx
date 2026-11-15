import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PlatInform panel",
  description: "The check, beside the page you are reading",
};

/**
 * A root layout with no page chrome. The panel is 400px wide inside a browser
 * side panel, so it carries its own small header and nothing else.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body suppressHydrationWarning className="bg-surface text-text">{children}</body>
    </html>
  );
}
