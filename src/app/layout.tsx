import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "nosh.tv — preset-driven video generation",
  description: "Cinematic camera and VFX presets on open-weight video models.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
