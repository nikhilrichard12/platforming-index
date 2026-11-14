import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/ui/TopBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Platforming Index",
  description: "Diagnose product complexity and find platforming opportunities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-surface text-text">
        <TopBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
