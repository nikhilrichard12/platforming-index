import type { Metadata } from "next";
import { Inter } from "@/lib/inter";
import "./orderdesk.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "OrderDesk",
  description: "Requisitions and purchase orders",
};

/**
 * A separate root layout, with none of the PlatInform chrome. The
 * pages under it stand in for software the manufacturer already runs, so the
 * demo can show our check arriving on a page we do not own.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={inter.className}>{children}</body>
    </html>
  );
}
