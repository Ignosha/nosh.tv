import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, DM_Mono } from "next/font/google";
import "./globals.css";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";

const display = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], axes: ["SOFT", "WONK", "opsz"], variable: "--font-fraunces" });
const sans = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-hanken" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dmmono" });

export const metadata: Metadata = {
  title: "Kinledger — Crypto estate recovery",
  description:
    "We find the crypto a loved one left behind, recover what can honestly be recovered, and document its value for the estate. No upfront fees. We never hold your funds.",
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
      </body>
    </html>
  );
}
