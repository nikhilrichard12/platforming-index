import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./plm.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: "Partsmith PLM",
  description: "Product requirements",
};

/**
 * A third root layout, carrying none of the PlatInform chrome. The page
 * under it stands in for the PLM a manufacturer already runs, so the demo can
 * show the panel reading a page we do not own.
 */
export default function PlmLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={inter.className}>{children}</body>
    </html>
  );
}
