import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, DM_Mono } from "next/font/google";
import "./globals.css";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { aiEnabled } from "@/lib/ai";

const display = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], axes: ["SOFT", "WONK", "opsz"], variable: "--font-fraunces" });
const sans = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-hanken" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dmmono" });

export const metadata: Metadata = {
  title: "TraceSworn — Crypto asset discovery and sealed valuation",
  description:
    "TraceSworn finds crypto in estates, divorces and bankruptcies, values it on the date that matters, and seals every figure in a verifiable record. Fixed fees.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1ebdf" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1d19" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("kl-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`,
          }}
        />
      </head>
      <body>
        <a href="#main" className="sr-only">Skip to content</a>
        <Masthead />
        <main id="main">{children}</main>
        <Footer />
        {aiEnabled() ? <ChatWidget /> : null}
      </body>
    </html>
  );
}
