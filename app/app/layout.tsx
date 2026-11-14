import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "600"],
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
      <body>
        <header
          style={{
            background: "#000A14",
            borderBottom: "1px solid #CCCCCC",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div
            style={{
              maxWidth: 1440,
              margin: "0 auto",
              padding: "0 48px",
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Platforming Index
            </span>
            <span
              style={{
                background: "rgba(120,35,220,0.15)",
                border: "1px solid #7823DC",
                color: "#c084fc",
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 10px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Sample data: Voltara (fictional)
            </span>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
