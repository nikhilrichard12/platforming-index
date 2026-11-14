import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./orderdesk.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "OrderDesk",
  description: "Requisitions and purchase orders",
};

/**
 * A separate root layout, with none of the Platforming Index chrome. The
 * pages under it stand in for software the manufacturer already runs, so the
 * demo can show our check arriving on a page we do not own.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
