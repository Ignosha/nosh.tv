import { THEME_BOOTSTRAP } from "@/lib/themeBootstrap";
import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./experience.css";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { aiEnabled } from "@/lib/ai";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});
const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title:
    process.env.ENTERPRISE_MODE === "1"
      ? "TraceSworn — Evidence operations for companies"
      : "TraceSworn — Crypto asset discovery and sealed valuation",
  description:
    process.env.ENTERPRISE_MODE === "1"
      ? "Repeatable evidence playbooks, accountable owners, independent review and portfolio management briefs for company teams."
      : "TraceSworn finds crypto in estates, divorces and bankruptcies, values it on the date that matters, and seals every figure in a verifiable record. Fixed fees.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b0a08" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0a08" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_BOOTSTRAP,
          }}
        />
      </head>
      <body
        className={
          process.env.ENTERPRISE_MODE === "1"
            ? "enterprise-experience"
            : undefined
        }
      >
        <a href="#main" className="sr-only">
          Skip to content
        </a>
        <Masthead />
        <main id="main">{children}</main>
        <Footer />
        {aiEnabled() ? <ChatWidget /> : null}
      </body>
    </html>
  );
}
