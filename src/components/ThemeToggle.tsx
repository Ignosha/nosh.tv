"use client";

import { useEffect, useState } from "react";

// Noir is the house style; ivory is the daylight edition.
export function ThemeToggle() {
  const [theme, setTheme] = useState<"noir" | "ivory">("noir");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "ivory" : "noir");
  }, []);
  function flip() {
    const next = theme === "noir" ? "ivory" : "noir";
    setTheme(next);
    if (next === "ivory") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("ts-theme", next === "ivory" ? "light" : "dark");
    } catch {
      /* storage unavailable */
    }
  }
  return (
    <button type="button" className="theme-toggle" onClick={flip} aria-label={`Switch to ${theme === "noir" ? "ivory" : "noir"} edition`}>
      {theme === "noir" ? "Ivory" : "Noir"}
    </button>
  );
}
